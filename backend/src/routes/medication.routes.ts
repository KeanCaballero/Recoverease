import { Router } from 'express';
import { authenticate, requireDoctor, requirePatient, requireRole } from '../middleware/auth.middleware';
import { createPrescription, listPrescriptions, markMedicationTaken, getWeeklyAdherence, getTodaySchedule } from '../controllers/medication.controller';

const router = Router();
router.use(authenticate);

router.post('/prescriptions', requireDoctor, createPrescription);
router.get('/prescriptions', requirePatient, listPrescriptions);
router.get('/prescriptions/patient/:patId', requireDoctor, listPrescriptions);
router.patch('/logs/:logId/taken', requirePatient, markMedicationTaken);
router.get('/adherence', requireRole('patient','doctor'), getWeeklyAdherence);
router.get('/adherence/patient/:patId', requireDoctor, getWeeklyAdherence);
router.get('/today', requirePatient, getTodaySchedule);

export default router;
