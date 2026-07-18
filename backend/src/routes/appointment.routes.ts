import { Router } from 'express';
import { authenticate, requireDoctor, requirePatient } from '../middleware/auth.middleware';
import { scheduleAppointment, listAppointments, updateAppointmentStatus, requestReschedule, respondToReschedule } from '../controllers/appointment.controller';

const router = Router();
router.use(authenticate);

router.post('/', requireDoctor, scheduleAppointment);
router.get('/', listAppointments);
router.patch('/:apptId/status', updateAppointmentStatus);
router.post('/:apptId/reschedule', requirePatient, requestReschedule);
router.patch('/reschedule/:requestId', requireDoctor, respondToReschedule);

export default router;
