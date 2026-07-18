import { Router } from 'express';
import { authenticate, requirePatient } from '../middleware/auth.middleware';
import { getPatientRecoveryDashboard } from '../controllers/recovery.controller';

const router = Router();
router.use(authenticate, requirePatient);

router.get('/dashboard', getPatientRecoveryDashboard);

export default router;
