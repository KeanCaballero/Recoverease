import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';
import { writeAuditLog } from '../utils/audit';

// ─── Dashboard Overview ───────────────────────────────────────────────────────
export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const [doctorCount, patientCount, activePatients, chatSessions, criticalAlerts, recentAudit] = await Promise.all([
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.patient.count({ where: { patStatus: 'active' } }),
      prisma.chatSession.count(),
      prisma.chatSession.count({ where: { chatSessionHasCriticalFlag: true } }),
      prisma.auditLog.findMany({
        include: { user: { select: { userEmail: true, userRole: true } } },
        orderBy: { auditLogTimestamp: 'desc' },
        take: 10,
      }),
    ]);

    ok(res, { doctorCount, patientCount, activePatients, chatSessions, criticalAlerts, recentAudit });
  } catch (err) {
    console.error('[admin/dashboard]', err);
    serverError(res);
  }
}

// ─── Register Doctor ──────────────────────────────────────────────────────────
export async function registerDoctor(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.profileId;
    const { email, password, firstName, lastName, specialization, licenseNo, contactNo } = req.body as {
      email: string; password: string; firstName: string; lastName: string;
      specialization?: string; licenseNo: string; contactNo?: string;
    };

    if (!email || !password || !firstName || !lastName || !licenseNo) {
      badRequest(res, 'Missing required fields');
      return;
    }

    const existing = await prisma.userAccount.findUnique({ where: { userEmail: email.toLowerCase().trim() } });
    if (existing) {
      badRequest(res, 'Email already registered');
      return;
    }

    const hash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.userAccount.create({
        data: { userEmail: email.toLowerCase().trim(), userPasswordHash: hash, userRole: 'doctor' },
      });
      const doctor = await tx.doctor.create({
        data: {
          userId: user.userId,
          docFirstName: firstName,
          docLastName: lastName,
          docSpecialization: specialization,
          docLicenseNo: licenseNo,
          docContactNo: contactNo,
        },
      });
      return { user, doctor };
    });

    await writeAuditLog(req.user!.userId, 'CREATE', 'doctor', result.doctor.docId, `Registered Dr. ${firstName} ${lastName}`);
    created(res, { doctorId: result.doctor.docId, email }, 'Doctor registered');
  } catch (err) {
    console.error('[admin/registerDoctor]', err);
    serverError(res);
  }
}

// ─── List Doctors ─────────────────────────────────────────────────────────────
export async function listDoctors(req: Request, res: Response): Promise<void> {
  try {
    const { search, isActive } = req.query as { search?: string; isActive?: string };
    const doctors = await prisma.doctor.findMany({
      where: {
        ...(isActive !== undefined ? { docIsActive: isActive === 'true' } : {}),
        ...(search ? {
          OR: [
            { docFirstName: { contains: search, mode: 'insensitive' } },
            { docLastName: { contains: search, mode: 'insensitive' } },
            { user: { userEmail: { contains: search, mode: 'insensitive' } } },
          ],
        } : {}),
      },
      include: {
        user: { select: { userEmail: true, userCreatedAt: true } },
        _count: { select: { patients: true } },
      },
      orderBy: { docCreatedAt: 'desc' },
    });
    ok(res, doctors);
  } catch (err) {
    console.error('[admin/listDoctors]', err);
    serverError(res);
  }
}

// ─── Update Doctor Account ────────────────────────────────────────────────────
export async function updateDoctor(req: Request, res: Response): Promise<void> {
  try {
    const docId = parseInt(req.params.docId);
    const { firstName, lastName, specialization, contactNo, licenseNo } = req.body;

    const doctor = await prisma.doctor.findUnique({ where: { docId } });
    if (!doctor) { notFound(res, 'Doctor not found'); return; }

    const updated = await prisma.doctor.update({
      where: { docId },
      data: {
        ...(firstName && { docFirstName: firstName }),
        ...(lastName && { docLastName: lastName }),
        ...(specialization !== undefined && { docSpecialization: specialization }),
        ...(contactNo !== undefined && { docContactNo: contactNo }),
        ...(licenseNo && { docLicenseNo: licenseNo }),
      },
    });

    await writeAuditLog(req.user!.userId, 'UPDATE', 'doctor', docId);
    ok(res, updated, 'Doctor updated');
  } catch (err) {
    console.error('[admin/updateDoctor]', err);
    serverError(res);
  }
}

// ─── Toggle Doctor Status ─────────────────────────────────────────────────────
export async function toggleDoctorStatus(req: Request, res: Response): Promise<void> {
  try {
    const docId = parseInt(req.params.docId);
    const doctor = await prisma.doctor.findUnique({ where: { docId } });
    if (!doctor) { notFound(res, 'Doctor not found'); return; }

    const updated = await prisma.doctor.update({
      where: { docId },
      data: { docIsActive: !doctor.docIsActive },
    });

    const action = updated.docIsActive ? 'REACTIVATE' : 'DEACTIVATE';
    await writeAuditLog(req.user!.userId, action, 'doctor', docId);
    ok(res, updated, `Doctor ${updated.docIsActive ? 'reactivated' : 'deactivated'}`);
  } catch (err) {
    console.error('[admin/toggleDoctor]', err);
    serverError(res);
  }
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export async function getAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', limit = '50', action, entity, userId: filterUserId, from, to } = req.query as {
      page?: string; limit?: string; action?: string; entity?: string; userId?: string; from?: string; to?: string;
    };
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(action ? { auditLogAction: { contains: action, mode: 'insensitive' as const } } : {}),
      ...(entity ? { auditLogEntity: { contains: entity, mode: 'insensitive' as const } } : {}),
      ...(filterUserId ? { userId: parseInt(filterUserId) } : {}),
      ...(from || to ? {
        auditLogTimestamp: {
          ...(from ? { gte: new Date(from) } : {}),
          ...(to ? { lte: new Date(to) } : {}),
        },
      } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: { select: { userEmail: true, userRole: true } } },
        orderBy: { auditLogTimestamp: 'desc' },
        skip,
        take: parseInt(limit),
      }),
      prisma.auditLog.count({ where }),
    ]);

    ok(res, { logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('[admin/auditLogs]', err);
    serverError(res);
  }
}

// ─── System Settings ──────────────────────────────────────────────────────────
export async function getSettings(req: Request, res: Response): Promise<void> {
  try {
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach(s => { map[s.systemSettingKey] = s.systemSettingValue; });
    ok(res, map);
  } catch (err) {
    console.error('[admin/getSettings]', err);
    serverError(res);
  }
}

export async function upsertSetting(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.profileId;
    const { key, value } = req.body as { key: string; value: string };

    if (!key) { badRequest(res, 'Key is required'); return; }

    const setting = await prisma.systemSetting.upsert({
      where: { systemSettingKey: key },
      update: { systemSettingValue: value, adminId },
      create: { systemSettingKey: key, systemSettingValue: value, adminId },
    });

    await writeAuditLog(req.user!.userId, 'UPDATE', 'system_setting', setting.systemSettingId, `${key} = ${value}`);
    ok(res, setting, 'Setting saved');
  } catch (err) {
    console.error('[admin/upsertSetting]', err);
    serverError(res);
  }
}

// ─── Admin Profile ────────────────────────────────────────────────────────────
export async function getAdminProfile(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.profileId;
    const admin = await prisma.admin.findUnique({
      where: { adminId },
      include: { user: { select: { userEmail: true } } },
    });
    if (!admin) { notFound(res, 'Admin profile not found'); return; }
    ok(res, admin);
  } catch (err) {
    console.error('[admin/profile]', err);
    serverError(res);
  }
}

export async function updateAdminProfile(req: Request, res: Response): Promise<void> {
  try {
    const adminId = req.user!.profileId;
    const { firstName, lastName } = req.body;
    const updated = await prisma.admin.update({
      where: { adminId },
      data: {
        ...(firstName && { adminFirstName: firstName }),
        ...(lastName && { adminLastName: lastName }),
      },
    });
    ok(res, updated, 'Profile updated');
  } catch (err) {
    console.error('[admin/updateProfile]', err);
    serverError(res);
  }
}
