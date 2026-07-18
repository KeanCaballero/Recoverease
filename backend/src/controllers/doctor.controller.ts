import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';
import { writeAuditLog } from '../utils/audit';

// ─── Register Patient ─────────────────────────────────────────────────────────
export async function registerPatient(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const {
      email, password, firstName, lastName, birthDate,
      gender, contactNo, address,
    } = req.body as {
      email: string; password: string; firstName: string; lastName: string;
      birthDate: string; gender?: string; contactNo?: string; address?: string;
    };

    if (!email || !password || !firstName || !lastName || !birthDate) {
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
        data: { userEmail: email.toLowerCase().trim(), userPasswordHash: hash, userRole: 'patient' },
      });
      const patient = await tx.patient.create({
        data: {
          userId: user.userId,
          docId,
          patFirstName: firstName,
          patLastName: lastName,
          patBirthDate: new Date(birthDate),
          patGender: (gender as 'male' | 'female' | 'other') ?? undefined,
          patContactNo: contactNo,
          patAddress: address,
        },
      });
      return { user, patient };
    });

    await writeAuditLog(req.user!.userId, 'CREATE', 'patient', result.patient.patId, `Registered patient: ${firstName} ${lastName}`);

    created(res, {
      patientId: result.patient.patId,
      userId: result.user.userId,
      name: `${firstName} ${lastName}`,
      email,
    }, 'Patient registered successfully');
  } catch (err) {
    console.error('[doctor/registerPatient]', err);
    serverError(res);
  }
}

// ─── List My Patients ─────────────────────────────────────────────────────────
export async function listPatients(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const { search, status } = req.query as { search?: string; status?: string };

    const patients = await prisma.patient.findMany({
      where: {
        docId,
        ...(status ? { patStatus: status as 'active' | 'inactive' | 'discharged' } : {}),
        ...(search ? {
          OR: [
            { patFirstName: { contains: search, mode: 'insensitive' } },
            { patLastName: { contains: search, mode: 'insensitive' } },
            { user: { userEmail: { contains: search, mode: 'insensitive' } } },
          ],
        } : {}),
      },
      include: {
        user: { select: { userEmail: true } },
        treatmentPlans: { where: { treatmentPlanStatus: 'active' }, select: { treatmentPlanId: true, treatmentPlanTitle: true } },
        appointments: {
          where: { appointmentStatus: { in: ['scheduled', 'confirmed'] } },
          orderBy: { appointmentDate: 'asc' },
          take: 1,
          select: { appointmentDate: true },
        },
      },
      orderBy: { patCreatedAt: 'desc' },
    });

    ok(res, patients);
  } catch (err) {
    console.error('[doctor/listPatients]', err);
    serverError(res);
  }
}

// ─── Get Patient Profile ──────────────────────────────────────────────────────
export async function getPatient(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const patId = parseInt(req.params.patId);

    const patient = await prisma.patient.findFirst({
      where: { patId, docId },
      include: {
        user: { select: { userEmail: true, userCreatedAt: true } },
        treatmentPlans: {
          include: { treatmentGoals: true },
          orderBy: { treatmentPlanCreatedAt: 'desc' },
        },
        appointments: {
          orderBy: { appointmentDate: 'desc' },
          take: 5,
        },
        doctorNotes: {
          orderBy: { doctorNoteCreatedAt: 'desc' },
          take: 10,
        },
        recoveryLogs: {
          orderBy: { recoveryLogDate: 'desc' },
          take: 30,
        },
      },
    });

    if (!patient) {
      notFound(res, 'Patient not found');
      return;
    }

    ok(res, patient);
  } catch (err) {
    console.error('[doctor/getPatient]', err);
    serverError(res);
  }
}

// ─── Update Patient Info ──────────────────────────────────────────────────────
export async function updatePatient(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const patId = parseInt(req.params.patId);

    const patient = await prisma.patient.findFirst({ where: { patId, docId } });
    if (!patient) {
      notFound(res, 'Patient not found');
      return;
    }

    const { firstName, lastName, birthDate, gender, contactNo, address, status } = req.body;

    const updated = await prisma.patient.update({
      where: { patId },
      data: {
        ...(firstName && { patFirstName: firstName }),
        ...(lastName && { patLastName: lastName }),
        ...(birthDate && { patBirthDate: new Date(birthDate) }),
        ...(gender && { patGender: gender }),
        ...(contactNo !== undefined && { patContactNo: contactNo }),
        ...(address !== undefined && { patAddress: address }),
        ...(status && { patStatus: status }),
      },
    });

    await writeAuditLog(req.user!.userId, 'UPDATE', 'patient', patId);
    ok(res, updated, 'Patient updated');
  } catch (err) {
    console.error('[doctor/updatePatient]', err);
    serverError(res);
  }
}

// ─── Get Doctor Profile ───────────────────────────────────────────────────────
export async function getDoctorProfile(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const doctor = await prisma.doctor.findUnique({
      where: { docId },
      include: { user: { select: { userEmail: true } } },
    });
    if (!doctor) {
      notFound(res, 'Doctor profile not found');
      return;
    }
    ok(res, doctor);
  } catch (err) {
    console.error('[doctor/getProfile]', err);
    serverError(res);
  }
}

// ─── Update Doctor Profile ────────────────────────────────────────────────────
export async function updateDoctorProfile(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const { firstName, lastName, specialization, contactNo } = req.body;

    const updated = await prisma.doctor.update({
      where: { docId },
      data: {
        ...(firstName && { docFirstName: firstName }),
        ...(lastName && { docLastName: lastName }),
        ...(specialization !== undefined && { docSpecialization: specialization }),
        ...(contactNo !== undefined && { docContactNo: contactNo }),
      },
    });

    await writeAuditLog(req.user!.userId, 'UPDATE', 'doctor', docId);
    ok(res, updated, 'Profile updated');
  } catch (err) {
    console.error('[doctor/updateProfile]', err);
    serverError(res);
  }
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────
export async function getDoctorDashboard(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;

    const [totalPatients, activePatients, upcomingAppointments, recentNotes, criticalAlerts] = await Promise.all([
      prisma.patient.count({ where: { docId } }),
      prisma.patient.count({ where: { docId, patStatus: 'active' } }),
      prisma.appointment.findMany({
        where: { docId, appointmentStatus: { in: ['scheduled', 'confirmed'] }, appointmentDate: { gte: new Date() } },
        include: { patient: { select: { patFirstName: true, patLastName: true } } },
        orderBy: { appointmentDate: 'asc' },
        take: 5,
      }),
      prisma.doctorNote.findMany({
        where: { docId },
        include: { patient: { select: { patFirstName: true, patLastName: true } } },
        orderBy: { doctorNoteCreatedAt: 'desc' },
        take: 5,
      }),
      prisma.chatSession.count({ where: { patient: { docId }, chatSessionHasCriticalFlag: true } }),
    ]);

    ok(res, { totalPatients, activePatients, upcomingAppointments, recentNotes, criticalAlerts });
  } catch (err) {
    console.error('[doctor/dashboard]', err);
    serverError(res);
  }
}

// ─── Add Doctor Note ──────────────────────────────────────────────────────────
export async function addDoctorNote(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const patId = parseInt(req.params.patId);
    const { text } = req.body as { text: string };

    if (!text?.trim()) {
      badRequest(res, 'Note text is required');
      return;
    }

    const patient = await prisma.patient.findFirst({ where: { patId, docId } });
    if (!patient) {
      notFound(res, 'Patient not found');
      return;
    }

    const note = await prisma.doctorNote.create({
      data: { patId, docId, doctorNoteText: text.trim() },
    });

    await writeAuditLog(req.user!.userId, 'CREATE', 'doctor_note', note.doctorNoteId);
    created(res, note, 'Note added');
  } catch (err) {
    console.error('[doctor/addNote]', err);
    serverError(res);
  }
}
