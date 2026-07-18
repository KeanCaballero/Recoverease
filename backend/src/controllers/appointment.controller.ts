import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';
import { writeAuditLog } from '../utils/audit';

// ─── Schedule Appointment ─────────────────────────────────────────────────────
export async function scheduleAppointment(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const { patId, date } = req.body as { patId: number; date: string };

    if (!patId || !date) { badRequest(res, 'patId and date are required'); return; }

    const patient = await prisma.patient.findFirst({ where: { patId, docId } });
    if (!patient) { notFound(res, 'Patient not found'); return; }

    const appt = await prisma.appointment.create({
      data: { patId, docId, appointmentDate: new Date(date) },
      include: { patient: { select: { patFirstName: true, patLastName: true } } },
    });

    // Notify patient
    await prisma.notification.create({
      data: {
        userId: patient.userId,
        notificationType: 'appointment',
        notificationMessage: `New appointment scheduled for ${new Date(date).toLocaleString()}`,
      },
    });

    await writeAuditLog(req.user!.userId, 'CREATE', 'appointment', appt.appointmentId);
    created(res, appt, 'Appointment scheduled');
  } catch (err) {
    console.error('[appointment/schedule]', err);
    serverError(res);
  }
}

// ─── List Appointments ────────────────────────────────────────────────────────
export async function listAppointments(req: Request, res: Response): Promise<void> {
  try {
    const role = req.user!.role;
    const profileId = req.user!.profileId;
    const { status, upcoming } = req.query as { status?: string; upcoming?: string };

    const where: Record<string, unknown> = {
      ...(role === 'doctor' ? { docId: profileId } : { patId: profileId }),
      ...(status ? { appointmentStatus: status } : {}),
      ...(upcoming === 'true' ? { appointmentDate: { gte: new Date() } } : {}),
    };

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { patFirstName: true, patLastName: true } },
        doctor: { select: { docFirstName: true, docLastName: true, docSpecialization: true } },
        rescheduleRequests: { where: { rescheduleRequestStatus: 'pending' }, take: 1 },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    ok(res, appointments);
  } catch (err) {
    console.error('[appointment/list]', err);
    serverError(res);
  }
}

// ─── Update Status ────────────────────────────────────────────────────────────
export async function updateAppointmentStatus(req: Request, res: Response): Promise<void> {
  try {
    const apptId = parseInt(req.params.apptId);
    const { status } = req.body as { status: string };
    const role = req.user!.role;
    const profileId = req.user!.profileId;

    const appt = await prisma.appointment.findUnique({ where: { appointmentId: apptId } });
    if (!appt) { notFound(res, 'Appointment not found'); return; }

    if (role === 'doctor' && appt.docId !== profileId) { notFound(res, 'Not found'); return; }
    if (role === 'patient' && appt.patId !== profileId) { notFound(res, 'Not found'); return; }

    const updated = await prisma.appointment.update({
      where: { appointmentId: apptId },
      data: { appointmentStatus: status as 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled' },
    });

    await writeAuditLog(req.user!.userId, 'UPDATE', 'appointment', apptId, `Status → ${status}`);
    ok(res, updated, 'Appointment updated');
  } catch (err) {
    console.error('[appointment/updateStatus]', err);
    serverError(res);
  }
}

// ─── Request Reschedule ───────────────────────────────────────────────────────
export async function requestReschedule(req: Request, res: Response): Promise<void> {
  try {
    const patId = req.user!.profileId;
    const userId = req.user!.userId;
    const apptId = parseInt(req.params.apptId);
    const { proposedDate, reason } = req.body as { proposedDate: string; reason?: string };

    if (!proposedDate) { badRequest(res, 'Proposed date is required'); return; }

    const appt = await prisma.appointment.findFirst({ where: { appointmentId: apptId, patId } });
    if (!appt) { notFound(res, 'Appointment not found'); return; }

    const request = await prisma.rescheduleRequest.create({
      data: {
        appointmentId: apptId,
        userId,
        rescheduleRequestDate: new Date(proposedDate),
        rescheduleRequestReason: reason,
      },
    });

    // Notify doctor
    const doctor = await prisma.doctor.findUnique({ where: { docId: appt.docId }, include: { user: true } });
    if (doctor) {
      await prisma.notification.create({
        data: {
          userId: doctor.userId,
          notificationType: 'reschedule',
          notificationMessage: `Patient requested to reschedule appointment to ${new Date(proposedDate).toLocaleString()}`,
        },
      });
    }

    created(res, request, 'Reschedule request submitted');
  } catch (err) {
    console.error('[appointment/reschedule]', err);
    serverError(res);
  }
}

// ─── Respond to Reschedule ────────────────────────────────────────────────────
export async function respondToReschedule(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const requestId = parseInt(req.params.requestId);
    const { decision } = req.body as { decision: 'approved' | 'declined' };

    const rescheduleReq = await prisma.rescheduleRequest.findUnique({
      where: { rescheduleRequestId: requestId },
      include: { appointment: true },
    });

    if (!rescheduleReq || rescheduleReq.appointment.docId !== docId) {
      notFound(res, 'Request not found');
      return;
    }

    const updated = await prisma.rescheduleRequest.update({
      where: { rescheduleRequestId: requestId },
      data: { rescheduleRequestStatus: decision, rescheduleRequestRespondedAt: new Date() },
    });

    if (decision === 'approved') {
      await prisma.appointment.update({
        where: { appointmentId: rescheduleReq.appointmentId },
        data: { appointmentDate: rescheduleReq.rescheduleRequestDate, appointmentStatus: 'rescheduled' },
      });
    }

    // Notify patient
    const patient = await prisma.patient.findUnique({ where: { patId: rescheduleReq.appointment.patId } });
    if (patient) {
      await prisma.notification.create({
        data: {
          userId: patient.userId,
          notificationType: 'reschedule',
          notificationMessage: `Your reschedule request has been ${decision}`,
        },
      });
    }

    ok(res, updated, `Reschedule request ${decision}`);
  } catch (err) {
    console.error('[appointment/respond]', err);
    serverError(res);
  }
}
