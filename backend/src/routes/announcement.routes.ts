import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import { listAnnouncements, listAllAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcement.controller';

const router = Router();
router.use(authenticate);

router.get('/', listAnnouncements);
router.get('/all', requireAdmin, listAllAnnouncements);
router.post('/', requireAdmin, createAnnouncement);
router.patch('/:id', requireAdmin, updateAnnouncement);
router.delete('/:id', requireAdmin, deleteAnnouncement);

export default router;
