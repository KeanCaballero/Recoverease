import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { getAuditLogs } from '../controllers/admin.controller';

const router = Router();
router.use(authenticate, requireAdmin);
router.get('/', getAuditLogs);

export default router;
