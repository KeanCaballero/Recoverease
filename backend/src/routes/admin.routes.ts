import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { getDashboard, registerDoctor, listDoctors, updateDoctor, toggleDoctorStatus, getAdminProfile, updateAdminProfile } from '../controllers/admin.controller';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/dashboard', getDashboard);
router.get('/profile', getAdminProfile);
router.patch('/profile', updateAdminProfile);
router.post('/doctors', registerDoctor);
router.get('/doctors', listDoctors);
router.patch('/doctors/:docId', updateDoctor);
router.patch('/doctors/:docId/toggle', toggleDoctorStatus);

export default router;
