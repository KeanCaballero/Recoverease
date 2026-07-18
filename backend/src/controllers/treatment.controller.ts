import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { ok, created, badRequest, notFound, serverError } from '../utils/response';
import { writeAuditLog } from '../utils/audit';

// ─── Create Treatment Plan ────────────────────────────────────────────────────
export async function createTreatmentPlan(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const { patId, title, description, startDate, endDate, goals } = req.body as {
      patId: number; title: string; description?: string;
      startDate: string; endDate?: string;
      goals?: Array<{ description: string; targetDate?: string }>;
    };

    if (!patId || !title || !startDate) {
      badRequest(res, 'patId, title, and startDate are required');
      return;
    }

    const patient = await prisma.patient.findFirst({ where: { patId, docId } });
    if (!patient) {
      notFound(res, 'Patient not found or not assigned to you');
      return;
    }

    const plan = await prisma.treatmentPlan.create({
      data: {
        patId,
        docId,
        treatmentPlanTitle: title,
        treatmentPlanDescription: description,
        treatmentPlanStartDate: new Date(startDate),
        treatmentPlanEndDate: endDate ? new Date(endDate) : undefined,
        treatmentGoals: goals?.length
          ? { create: goals.map(g => ({ treatmentGoalDescription: g.description, treatmentGoalTargetDate: g.targetDate ? new Date(g.targetDate) : undefined })) }
          : undefined,
      },
      include: { treatmentGoals: true },
    });

    await writeAuditLog(req.user!.userId, 'CREATE', 'treatment_plan', plan.treatmentPlanId);
    created(res, plan, 'Treatment plan created');
  } catch (err) {
    console.error('[treatment/create]', err);
    serverError(res);
  }
}

// ─── Update Treatment Plan ────────────────────────────────────────────────────
export async function updateTreatmentPlan(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const planId = parseInt(req.params.planId);
    const { title, description, startDate, endDate, status } = req.body;

    const existing = await prisma.treatmentPlan.findFirst({ where: { treatmentPlanId: planId, docId } });
    if (!existing) {
      notFound(res, 'Treatment plan not found');
      return;
    }

    const updated = await prisma.treatmentPlan.update({
      where: { treatmentPlanId: planId },
      data: {
        ...(title && { treatmentPlanTitle: title }),
        ...(description !== undefined && { treatmentPlanDescription: description }),
        ...(startDate && { treatmentPlanStartDate: new Date(startDate) }),
        ...(endDate !== undefined && { treatmentPlanEndDate: endDate ? new Date(endDate) : null }),
        ...(status && { treatmentPlanStatus: status }),
      },
      include: { treatmentGoals: true },
    });

    await writeAuditLog(req.user!.userId, 'UPDATE', 'treatment_plan', planId);
    ok(res, updated, 'Treatment plan updated');
  } catch (err) {
    console.error('[treatment/update]', err);
    serverError(res);
  }
}

// ─── Get Treatment Plans for Patient ─────────────────────────────────────────
export async function getPatientPlans(req: Request, res: Response): Promise<void> {
  try {
    const patId = parseInt(req.params.patId);
    const role = req.user!.role;
    const profileId = req.user!.profileId;

    // Verify access
    if (role === 'patient' && profileId !== patId) {
      notFound(res, 'Treatment plans not found');
      return;
    }
    if (role === 'doctor') {
      const patient = await prisma.patient.findFirst({ where: { patId, docId: profileId } });
      if (!patient) { notFound(res, 'Patient not found'); return; }
    }

    const plans = await prisma.treatmentPlan.findMany({
      where: { patId },
      include: { treatmentGoals: true, doctor: { select: { docFirstName: true, docLastName: true, docSpecialization: true } } },
      orderBy: { treatmentPlanCreatedAt: 'desc' },
    });

    ok(res, plans);
  } catch (err) {
    console.error('[treatment/getPatientPlans]', err);
    serverError(res);
  }
}

// ─── Get Single Plan ──────────────────────────────────────────────────────────
export async function getTreatmentPlan(req: Request, res: Response): Promise<void> {
  try {
    const planId = parseInt(req.params.planId);

    const plan = await prisma.treatmentPlan.findUnique({
      where: { treatmentPlanId: planId },
      include: {
        treatmentGoals: true,
        patient: { select: { patFirstName: true, patLastName: true, patBirthDate: true } },
        doctor: { select: { docFirstName: true, docLastName: true, docSpecialization: true, docLicenseNo: true } },
      },
    });

    if (!plan) { notFound(res, 'Treatment plan not found'); return; }

    // Check access
    const role = req.user!.role;
    const profileId = req.user!.profileId;
    if (role === 'patient' && plan.patId !== profileId) { notFound(res, 'Not found'); return; }
    if (role === 'doctor' && plan.docId !== profileId) { notFound(res, 'Not found'); return; }

    ok(res, plan);
  } catch (err) {
    console.error('[treatment/get]', err);
    serverError(res);
  }
}

// ─── Upsert Goal ──────────────────────────────────────────────────────────────
export async function upsertGoal(req: Request, res: Response): Promise<void> {
  try {
    const docId = req.user!.profileId;
    const planId = parseInt(req.params.planId);
    const { description, targetDate, status, goalId } = req.body as {
      description: string; targetDate?: string; status?: string; goalId?: number;
    };

    const plan = await prisma.treatmentPlan.findFirst({ where: { treatmentPlanId: planId, docId } });
    if (!plan) { notFound(res, 'Treatment plan not found'); return; }

    if (goalId) {
      const updated = await prisma.treatmentGoal.update({
        where: { treatmentGoalId: goalId },
        data: {
          ...(description && { treatmentGoalDescription: description }),
          ...(targetDate !== undefined && { treatmentGoalTargetDate: targetDate ? new Date(targetDate) : null }),
          ...(status && { treatmentGoalStatus: status as 'pending' | 'achieved' | 'missed' }),
        },
      });
      ok(res, updated, 'Goal updated');
    } else {
      if (!description) { badRequest(res, 'Goal description is required'); return; }
      const goal = await prisma.treatmentGoal.create({
        data: {
          treatmentPlanId: planId,
          treatmentGoalDescription: description,
          treatmentGoalTargetDate: targetDate ? new Date(targetDate) : undefined,
        },
      });
      created(res, goal, 'Goal added');
    }
  } catch (err) {
    console.error('[treatment/upsertGoal]', err);
    serverError(res);
  }
}
