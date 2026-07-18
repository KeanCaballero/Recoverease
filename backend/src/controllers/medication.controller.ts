import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';
import { writeAuditLog } from '../utils/audit';

// ─── Create Prescription + Schedule ──────────────────────────────────────────
export async function createPrescription(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const { patId, issuedDate, notes, medications } = req.body as {
      patId: number;
      issuedDate?: string;
      notes?: string;
      medications: Array<{
        name: string; dosage: string; frequency: number;
        times: string[]; startDate: string; endDate?: string;
      }>;
    };

    if (!patId || !medications?.length) {
      badRequest(res, 'patId and at least one medication required');
      return;
    }

    const patient = await prisma.patient.findFirst({ where: { patId, docId } });
    if (!patient) { notFound(res, 'Patient not found'); return; }

    const prescription = await prisma.prescription.create({
      data: {
        patId,
        docId,
        prescriptionIssuedDate: issuedDate ? new Date(issuedDate) : new Date(),
        prescriptionNotes: notes,
        medicationSchedules: {
          create: medications.map(m => ({
            medicationScheduleName: m.name,
            medicationScheduleDosage: m.dosage,
            medicationScheduleFrequency: m.frequency,
            medicationScheduleTimes: m.times.join(','),
            medicationScheduleStartDate: new Date(m.startDate),
            medicationScheduleEndDate: m.endDate ? new Date(m.endDate) : undefined,
          })),
        },
      },
      include: { medicationSchedules: true },
    });

    // Pre-generate today's medication logs
    await generateTodayLogs(prescription.prescriptionId);

    await writeAuditLog(req.user!.userId, 'CREATE', 'prescription', prescription.prescriptionId);
    created(res, prescription, 'Prescription created');
  } catch (err) {
    console.error('[medication/createPrescription]', err);
    serverError(res);
  }
}

async function generateTodayLogs(prescriptionId: number): Promise<void> {
  const today = new Date();
  const schedules = await prisma.medicationSchedule.findMany({ where: { prescriptionId } });

  for (const schedule of schedules) {
    const times = schedule.medicationScheduleTimes.split(',');
    for (const time of times) {
      const [hours, minutes] = time.trim().split(':').map(Number);
      const scheduledAt = new Date(today);
      scheduledAt.setHours(hours, minutes, 0, 0);

      // Check if a log already exists for this schedule+time today to avoid duplicates
      const existing = await prisma.medicationLog.findFirst({
        where: {
          medicationScheduleId: schedule.medicationScheduleId,
          medicationLogScheduledAt: scheduledAt,
        },
      });

      if (!existing) {
        await prisma.medicationLog.create({
          data: {
            medicationScheduleId: schedule.medicationScheduleId,
            medicationLogScheduledAt: scheduledAt,
            medicationLogStatus: 'pending',
          },
        }).catch(() => { /* ignore rare race conditions */ });
      }
    }
  }
}

// ─── List Prescriptions ───────────────────────────────────────────────────────
export async function listPrescriptions(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user!.role;
    const profileId = req.user!.profileId;
    const patId = role === 'patient' ? profileId : parseInt(req.params.patId ?? '0');

    if (role === 'doctor') {
      const patient = await prisma.patient.findFirst({ where: { patId, docId: profileId } });
      if (!patient) { notFound(res, 'Patient not found'); return; }
    }

    const prescriptions = await prisma.prescription.findMany({
      where: { patId },
      include: {
        medicationSchedules: {
          include: {
            medicationLogs: {
              where: {
                medicationLogScheduledAt: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  lt: new Date(new Date().setHours(23, 59, 59, 999)),
                },
              },
              orderBy: { medicationLogScheduledAt: 'asc' },
            },
          },
        },
        doctor: { select: { docFirstName: true, docLastName: true } },
      },
      orderBy: { prescriptionCreatedAt: 'desc' },
    });

    ok(res, prescriptions);
  } catch (err) {
    console.error('[medication/list]', err);
    serverError(res);
  }
}

// ─── Mark as Taken ────────────────────────────────────────────────────────────
export async function markMedicationTaken(req: Request, res: Response): Promise<void> {
  try {
    const patId = req.user!.profileId;
    const logId = parseInt(req.params.logId);

    const log = await prisma.medicationLog.findUnique({
      where: { medicationLogId: logId },
      include: { medicationSchedule: { include: { prescription: true } } },
    });

    if (!log || log.medicationSchedule.prescription.patId !== patId) {
      notFound(res, 'Medication log not found');
      return;
    }

    const updated = await prisma.medicationLog.update({
      where: { medicationLogId: logId },
      data: { medicationLogStatus: 'taken', medicationLogTakenAt: new Date() },
    });

    ok(res, updated, 'Medication marked as taken');
  } catch (err) {
    console.error('[medication/markTaken]', err);
    serverError(res);
  }
}

// ─── Weekly Adherence ─────────────────────────────────────────────────────────
export async function getWeeklyAdherence(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user!.role;
    const patId = role === 'patient' ? req.user!.profileId : parseInt(req.params.patId ?? '0');

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const logs = await prisma.medicationLog.findMany({
      where: {
        medicationSchedule: { prescription: { patId } },
        medicationLogScheduledAt: { gte: weekAgo },
      },
      select: {
        medicationLogScheduledAt: true,
        medicationLogStatus: true,
        medicationSchedule: { select: { medicationScheduleName: true } },
      },
    });

    const total = logs.length;
    const taken = logs.filter(l => l.medicationLogStatus === 'taken').length;
    const missed = logs.filter(l => l.medicationLogStatus === 'missed').length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    // Group by day
    const byDay: Record<string, { taken: number; total: number }> = {};
    for (const log of logs) {
      const day = log.medicationLogScheduledAt.toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { taken: 0, total: 0 };
      byDay[day].total++;
      if (log.medicationLogStatus === 'taken') byDay[day].taken++;
    }

    ok(res, { total, taken, missed, adherenceRate, byDay, logs });
  } catch (err) {
    console.error('[medication/adherence]', err);
    serverError(res);
  }
}

// ─── Today's Schedule ─────────────────────────────────────────────────────────
export async function getTodaySchedule(req: Request, res: Response): Promise<void> {
  try {
    const patId = req.user!.profileId;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await prisma.medicationLog.findMany({
      where: {
        medicationSchedule: { prescription: { patId } },
        medicationLogScheduledAt: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        medicationSchedule: {
          select: {
            medicationScheduleName: true,
            medicationScheduleDosage: true,
          },
        },
      },
      orderBy: { medicationLogScheduledAt: 'asc' },
    });

    ok(res, logs);
  } catch (err) {
    console.error('[medication/today]', err);
    serverError(res);
  }
}
