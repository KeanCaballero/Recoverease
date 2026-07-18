import { Router } from 'express';
import { authenticate, requireDoctor } from '../middleware/auth.middleware';
import {
  registerPatient, listPatients, getPatient, updatePatient,
  getDoctorProfile, updateDoctorProfile, getDoctorDashboard, addDoctorNote,
} from '../controllers/doctor.controller';

const router = Router();
router.use(authenticate, requireDoctor);

router.get('/dashboard', getDoctorDashboard);
router.get('/profile', getDoctorProfile);
router.patch('/profile', updateDoctorProfile);
router.post('/patients', registerPatient);
router.get('/patients', listPatients);
router.get('/patients/:patId', getPatient);
router.patch('/patients/:patId', updatePatient);
router.post('/patients/:patId/notes', addDoctorNote);

export default router;
