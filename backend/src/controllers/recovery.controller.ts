import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';

// ─── Log Today's Progress ──────────────────────────────────────────────────────
export async function logRecovery(req: Request, res: Response): Promise<void> {
  try {
    const patId = req.user!.profileId;
    const { notes, moodRating, date } = req.body as { notes?: string; moodRating?: number; date?: string };
    const logDate = date ? new Date(date) : new Date();
    logDate.setHours(0, 0, 0, 0);

    if (moodRating !== undefined && (moodRating < 1 || moodRating > 10)) {
      badRequest(res, 'Mood rating must be between 1 and 10');
      return;
    }

    const log = await prisma.recoveryLog.upsert({
      where: { patId_recoveryLogDate: { patId, recoveryLogDate: logDate } },
      update: {
        ...(notes !== undefined && { recoveryLogNotes: notes }),
        ...(moodRating !== undefined && { recoveryLogMoodRating: moodRating }),
      },
      create: {
        patId,
        recoveryLogDate: logDate,
        recoveryLogNotes: notes,
        recoveryLogMoodRating: moodRating,
      },
    });

    created(res, log, 'Recovery log saved');
  } catch (err) {
    console.error('[recovery/log]', err);
    serverError(res);
  }
}

// ─── Get Recovery History ─────────────────────────────────────────────────────
export async function getRecoveryHistory(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user!.role;
    const patId = role === 'patient' ? req.user!.profileId : parseInt(req.params.patId ?? '0');

    if (role === 'doctor') {
      const patient = await prisma.patient.findFirst({ where: { patId, docId: req.user!.profileId } });
      if (!patient) { notFound(res, 'Patient not found'); return; }
    }

    const { days = '30' } = req.query as { days?: string };
    const daysBack = parseInt(days);
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const logs = await prisma.recoveryLog.findMany({
      where: { patId, recoveryLogDate: { gte: since } },
      orderBy: { recoveryLogDate: 'desc' },
    });

    // Calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const logDates = new Set(logs.map(l => l.recoveryLogDate.toISOString().split('T')[0]));
    let checkDate = new Date(today);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (!logDates.has(dateStr)) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    ok(res, { logs, streak, totalEntries: logs.length });
  } catch (err) {
    console.error('[recovery/history]', err);
    serverError(res);
  }
}

// ─── Patient Recovery Dashboard ───────────────────────────────────────────────
export async function getPatientRecoveryDashboard(req: Request, res: Response): Promise<void> {
  try {
    const patId = req.user!.profileId;

    const [patient, activePlan, recentLogs, adherenceData, nextAppointment, todayLogs] = await Promise.all([
      prisma.patient.findUnique({
        where: { patId },
        include: { doctor: { select: { docFirstName: true, docLastName: true, docSpecialization: true } } },
      }),
      prisma.treatmentPlan.findFirst({
        where: { patId, treatmentPlanStatus: 'active' },
        include: { treatmentGoals: true },
        orderBy: { treatmentPlanCreatedAt: 'desc' },
      }),
      prisma.recoveryLog.findMany({
        where: { patId },
        orderBy: { recoveryLogDate: 'desc' },
        take: 7,
      }),
      (async () => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const logs = await prisma.medicationLog.findMany({
          where: { medicationSchedule: { prescription: { patId } }, medicationLogScheduledAt: { gte: weekAgo } },
        });
        const total = logs.length;
        const taken = logs.filter(l => l.medicationLogStatus === 'taken').length;
        return { total, taken, rate: total > 0 ? Math.round((taken / total) * 100) : 0 };
      })(),
      prisma.appointment.findFirst({
        where: { patId, appointmentStatus: { in: ['scheduled', 'confirmed'] }, appointmentDate: { gte: new Date() } },
        orderBy: { appointmentDate: 'asc' },
        include: { doctor: { select: { docFirstName: true, docLastName: true } } },
      }),
      prisma.medicationLog.findMany({
        where: {
          medicationSchedule: { prescription: { patId } },
          medicationLogScheduledAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        include: { medicationSchedule: { select: { medicationScheduleName: true, medicationScheduleDosage: true } } },
        orderBy: { medicationLogScheduledAt: 'asc' },
      }),
    ]);

    // Compute streak
    const logDates = new Set(recentLogs.map(l => l.recoveryLogDate.toISOString().split('T')[0]));
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);
    while (logDates.has(checkDate.toISOString().split('T')[0])) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    ok(res, { patient, activePlan, recentLogs, adherenceData, nextAppointment, todayLogs, streak });
  } catch (err) {
    console.error('[recovery/dashboard]', err);
    serverError(res);
  }
}
