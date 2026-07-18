import { Router } from 'express';
import { authenticate, requireDoctor, requireAdmin } from '../middleware/auth.middleware';
import { ok } from '../utils/response';
import prisma from '../lib/prisma';

const router = Router();
router.use(authenticate);

// Simplified report generation — returns JSON data
router.get('/recovery/:patId', requireDoctor, async (req, res) => {
  try {
    const patId = parseInt(req.params.patId);
    const docId = req.user!.profileId;
    const patient = await prisma.patient.findFirst({
      where: { patId, docId },
      include: {
        treatmentPlans: { include: { treatmentGoals: true } },
        prescriptions: { include: { medicationSchedules: { include: { medicationLogs: { orderBy: { medicationLogScheduledAt: 'desc' }, take: 30 } } } } },
        recoveryLogs: { orderBy: { recoveryLogDate: 'desc' }, take: 30 },
        appointments: { orderBy: { appointmentDate: 'desc' }, take: 10 },
        doctorNotes: { orderBy: { doctorNoteCreatedAt: 'desc' }, take: 10 },
      },
    });
    if (!patient) { res.status(404).json({ success: false, message: 'Patient not found' }); return; }
    ok(res, { patient, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[report/recovery]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/system', requireAdmin, async (_req, res) => {
  try {
    const [doctors, patients, chatSessions, appointments] = await Promise.all([
      prisma.doctor.count(),
      prisma.patient.count(),
      prisma.chatSession.count(),
      prisma.appointment.count(),
    ]);
    ok(res, { doctors, patients, chatSessions, appointments, generatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[report/system]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
