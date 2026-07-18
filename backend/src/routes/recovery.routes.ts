import { Router } from 'express';
import { authenticate, requirePatient, requireRole } from '../middleware/auth.middleware';
import { logRecovery, getRecoveryHistory, getPatientRecoveryDashboard } from '../controllers/recovery.controller';

const router = Router();
router.use(authenticate);

router.post('/log', requirePatient, logRecovery);
router.get('/history', requirePatient, getRecoveryHistory);
router.get('/history/patient/:patId', requireRole('doctor'), getRecoveryHistory);

export default router;
