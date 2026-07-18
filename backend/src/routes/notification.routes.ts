import { Router } from 'express';
import { authenticate, requireDoctor } from '../middleware/auth.middleware';
import { listNotifications, markRead, markAllRead, sendNotification } from '../controllers/notification.controller';

const router = Router();
router.use(authenticate);

router.get('/', listNotifications);
router.patch('/:notifId/read', markRead);
router.patch('/read-all', markAllRead);
router.post('/send', requireDoctor, sendNotification);

export default router;
