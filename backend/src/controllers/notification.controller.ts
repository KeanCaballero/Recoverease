import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';

export async function listNotifications(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { unread } = req.query as { unread?: string };

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unread === 'true' ? { notificationIsRead: false } : {}),
      },
      orderBy: { notificationCreatedAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({ where: { userId, notificationIsRead: false } });
    ok(res, { notifications, unreadCount });
  } catch (err) {
    console.error('[notification/list]', err);
    serverError(res);
  }
}

export async function markRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const notifId = parseInt(req.params.notifId);

    const notif = await prisma.notification.findFirst({ where: { notificationId: notifId, userId } });
    if (!notif) { notFound(res, 'Notification not found'); return; }

    await prisma.notification.update({
      where: { notificationId: notifId },
      data: { notificationIsRead: true },
    });
    ok(res, {}, 'Marked as read');
  } catch (err) {
    console.error('[notification/markRead]', err);
    serverError(res);
  }
}

export async function markAllRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    await prisma.notification.updateMany({ where: { userId, notificationIsRead: false }, data: { notificationIsRead: true } });
    ok(res, {}, 'All notifications marked as read');
  } catch (err) {
    console.error('[notification/markAllRead]', err);
    serverError(res);
  }
}

export async function sendNotification(req: Request, res: Response): Promise<void> {
  try {
    const { patientId, message, type = 'system' } = req.body as { patientId: number; message: string; type?: string };
    if (!patientId || !message) { badRequest(res, 'patientId and message required'); return; }

    const patient = await prisma.patient.findUnique({ where: { patId: patientId } });
    if (!patient) { notFound(res, 'Patient not found'); return; }

    const notif = await prisma.notification.create({
      data: { userId: patient.userId, notificationType: type, notificationMessage: message },
    });
    created(res, notif, 'Notification sent');
  } catch (err) {
    console.error('[notification/send]', err);
    serverError(res);
  }
}
