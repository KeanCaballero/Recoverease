import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ok, created, badRequest, unauthorized, serverError } from '../utils/response';
import { writeAuditLog } from '../utils/audit';

// ─── Login ────────────────────────────────────────────────────────────────────
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      badRequest(res, 'Email and password are required');
      return;
    }

    const user = await prisma.userAccount.findUnique({
      where: { userEmail: email.toLowerCase().trim() },
      include: {
        doctor: { select: { docId: true, docIsActive: true, docFirstName: true, docLastName: true } },
        patient: { select: { patId: true, patStatus: true, patFirstName: true, patLastName: true, patConsentAt: true } },
        admin: { select: { adminId: true, adminFirstName: true, adminLastName: true } },
      },
    });

    if (!user) {
      unauthorized(res, 'Invalid email or password');
      return;
    }

    // Check if deactivated
    if (user.userRole === 'doctor' && !user.doctor?.docIsActive) {
      unauthorized(res, 'Your account has been deactivated. Contact the administrator.');
      return;
    }
    if (user.userRole === 'patient' && user.patient?.patStatus === 'inactive') {
      unauthorized(res, 'Your account is inactive. Contact your healthcare provider.');
      return;
    }

    const valid = await bcrypt.compare(password, user.userPasswordHash);
    if (!valid) {
      unauthorized(res, 'Invalid email or password');
      return;
    }

    // Resolve profileId
    let profileId = 0;
    let profileName = '';
    if (user.userRole === 'doctor' && user.doctor) {
      profileId = user.doctor.docId;
      profileName = `${user.doctor.docFirstName} ${user.doctor.docLastName}`;
    } else if (user.userRole === 'patient' && user.patient) {
      profileId = user.patient.patId;
      profileName = `${user.patient.patFirstName} ${user.patient.patLastName}`;
    } else if (user.userRole === 'admin' && user.admin) {
      profileId = user.admin.adminId;
      profileName = `${user.admin.adminFirstName} ${user.admin.adminLastName}`;
    }

    const tokenPayload = { userId: user.userId, role: user.userRole, profileId };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    await writeAuditLog(user.userId, 'LOGIN', 'user_account', user.userId);

    ok(res, {
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        role: user.userRole,
        profileId,
        name: profileName,
        email: user.userEmail,
        needsConsent: user.userRole === 'patient' && !user.patient?.patConsentAt,
      },
    }, 'Login successful');
  } catch (err) {
    console.error('[auth/login]', err);
    serverError(res);
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) {
      badRequest(res, 'Refresh token required');
      return;
    }

    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.userAccount.findUnique({ where: { userId: payload.userId } });
    if (!user) {
      unauthorized(res, 'User not found');
      return;
    }

    const tokenPayload = { userId: payload.userId, role: payload.role, profileId: payload.profileId };
    const accessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    ok(res, { accessToken, refreshToken: newRefreshToken });
  } catch {
    unauthorized(res, 'Invalid or expired refresh token');
  }
}

// ─── Accept Consent ───────────────────────────────────────────────────────────
export async function acceptConsent(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const patient = await prisma.patient.findUnique({ where: { userId } });
    if (!patient) {
      badRequest(res, 'Patient profile not found');
      return;
    }

    await prisma.patient.update({
      where: { userId },
      data: { patConsentAt: new Date() },
    });

    await writeAuditLog(userId, 'CONSENT_ACCEPTED', 'patient', patient.patId);
    ok(res, {}, 'Consent accepted');
  } catch (err) {
    console.error('[auth/consent]', err);
    serverError(res);
  }
}

// ─── Change Password ──────────────────────────────────────────────────────────
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      badRequest(res, 'Current and new passwords are required');
      return;
    }
    if (newPassword.length < 8) {
      badRequest(res, 'Password must be at least 8 characters');
      return;
    }

    const user = await prisma.userAccount.findUnique({ where: { userId } });
    if (!user) {
      unauthorized(res);
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.userPasswordHash);
    if (!valid) {
      badRequest(res, 'Current password is incorrect');
      return;
    }

    const hash = await bcrypt.hash(newPassword, 12);
    await prisma.userAccount.update({ where: { userId }, data: { userPasswordHash: hash } });
    await writeAuditLog(userId, 'PASSWORD_CHANGE', 'user_account', userId);
    ok(res, {}, 'Password changed successfully');
  } catch (err) {
    console.error('[auth/changePassword]', err);
    serverError(res);
  }
}

// ─── Forgot Password (stub — sends token in response for dev) ─────────────────
export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    if (!email) {
      badRequest(res, 'Email is required');
      return;
    }

    const user = await prisma.userAccount.findUnique({ where: { userEmail: email.toLowerCase().trim() } });
    // Always return 200 to avoid user enumeration
    if (!user) {
      ok(res, {}, 'If that email exists, a reset link has been sent');
      return;
    }

    const token = uuidv4();
    // In production: store token with expiry + send email
    // For now: return in response for development
    await writeAuditLog(user.userId, 'PASSWORD_RESET_REQUEST', 'user_account', user.userId);
    ok(res, process.env.NODE_ENV === 'development' ? { resetToken: token } : {}, 'If that email exists, a reset link has been sent');
  } catch (err) {
    console.error('[auth/forgotPassword]', err);
    serverError(res);
  }
}

// ─── Get Me ───────────────────────────────────────────────────────────────────
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const user = await prisma.userAccount.findUnique({
      where: { userId },
      include: {
        doctor: { select: { docId: true, docFirstName: true, docLastName: true, docSpecialization: true, docLicenseNo: true, docContactNo: true } },
        patient: { select: { patId: true, patFirstName: true, patLastName: true, patBirthDate: true, patGender: true, patContactNo: true, patAddress: true, patStatus: true, patConsentAt: true } },
        admin: { select: { adminId: true, adminFirstName: true, adminLastName: true } },
      },
    });

    if (!user) {
      unauthorized(res);
      return;
    }

    ok(res, {
      userId: user.userId,
      email: user.userEmail,
      role: user.userRole,
      profile: user.doctor ?? user.patient ?? user.admin,
    });
  } catch (err) {
    console.error('[auth/me]', err);
    serverError(res);
  }
}
