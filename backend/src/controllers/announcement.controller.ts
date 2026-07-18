import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';
import { writeAuditLog } from '../utils/audit';

export async function listAnnouncements(req: Request, res: Response): Promise<void> {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { announcementPublishedAt: { not: null, lte: new Date() } },
      include: { admin: { select: { adminFirstName: true, adminLastName: true } } },
      orderBy: { announcementPublishedAt: 'desc' },
      take: 20,
    });
    ok(res, announcements);
  } catch (err) {
    console.error('[announcement/list]', err);
    serverError(res);
  }
}

export async function listAllAnnouncements(req: Request, res: Response): Promise<void> {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { admin: { select: { adminFirstName: true, adminLastName: true } } },
      orderBy: { announcementCreatedAt: 'desc' },
    });
    ok(res, announcements);
  } catch (err) {
    console.error('[announcement/listAll]', err);
    serverError(res);
  }
}

export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.profileId;
    const { title, content, publishNow = true } = req.body as { title: string; content: string; publishNow?: boolean };
    if (!title || !content) { badRequest(res, 'Title and content required'); return; }

    const announcement = await prisma.announcement.create({
      data: {
        adminId,
        announcementTitle: title,
        announcementContent: content,
        announcementPublishedAt: publishNow ? new Date() : undefined,
      },
    });

    await writeAuditLog(req.user!.userId, 'CREATE', 'announcement', announcement.announcementId);
    created(res, announcement, 'Announcement created');
  } catch (err) {
    console.error('[announcement/create]', err);
    serverError(res);
  }
}

export async function updateAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    const { title, content } = req.body;

    const announcement = await prisma.announcement.findUnique({ where: { announcementId: id } });
    if (!announcement) { notFound(res, 'Announcement not found'); return; }

    const updated = await prisma.announcement.update({
      where: { announcementId: id },
      data: {
        ...(title && { announcementTitle: title }),
        ...(content && { announcementContent: content }),
      },
    });

    await writeAuditLog(req.user!.userId, 'UPDATE', 'announcement', id);
    ok(res, updated, 'Updated');
  } catch (err) {
    console.error('[announcement/update]', err);
    serverError(res);
  }
}

export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id);
    const announcement = await prisma.announcement.findUnique({ where: { announcementId: id } });
    if (!announcement) { notFound(res, 'Announcement not found'); return; }

    await prisma.announcement.delete({ where: { announcementId: id } });
    await writeAuditLog(req.user!.userId, 'DELETE', 'announcement', id);
    ok(res, {}, 'Deleted');
  } catch (err) {
    console.error('[announcement/delete]', err);
    serverError(res);
  }
}
