import { Router } from 'express';
import { authenticate, requirePatient, requireRole, requireAdmin } from '../middleware/auth.middleware';
import { sendMessage, getChatHistory, getChatSession, getChatUsageLogs } from '../controllers/chat.controller';

const router = Router();
router.use(authenticate);

router.post('/message', requirePatient, sendMessage);
router.get('/history', requirePatient, getChatHistory);
router.get('/history/patient/:patId', requireRole('doctor'), getChatHistory);
router.get('/sessions/:sessionId', getChatSession);
router.get('/admin/logs', requireAdmin, getChatUsageLogs);

export default router;
