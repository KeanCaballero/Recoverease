import { Router } from 'express';
import { login, refresh, acceptConsent, changePassword, forgotPassword, getMe } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/login', login);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);

// Protected
router.get('/me', authenticate, getMe);
router.post('/consent', authenticate, acceptConsent);
router.patch('/password', authenticate, changePassword);

export default router;
