import { Router } from 'express';
import { authenticate, requireDoctor, requireRole } from '../middleware/auth.middleware';
import { createTreatmentPlan, updateTreatmentPlan, getPatientPlans, getTreatmentPlan, upsertGoal } from '../controllers/treatment.controller';

const router = Router();
router.use(authenticate);

router.post('/', requireDoctor, createTreatmentPlan);
router.get('/patient/:patId', requireRole('doctor', 'patient'), getPatientPlans);
router.get('/:planId', getTreatmentPlan);
router.patch('/:planId', requireDoctor, updateTreatmentPlan);
router.post('/:planId/goals', requireDoctor, upsertGoal);

export default router;
