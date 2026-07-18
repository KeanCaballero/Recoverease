import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { getSettings, upsertSetting } from '../controllers/admin.controller';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/', getSettings);
router.post('/', upsertSetting);

export default router;
