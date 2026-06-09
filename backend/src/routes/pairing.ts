import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { getStatus, sendInvite, acceptInvite, rejectInvite, cancelInvite, breakLink } from '../controllers/pairingController';

const router = Router();

router.get('/status', requireAuth, getStatus);
router.post('/invite', requireAuth, sendInvite);
router.post('/invite/accept', requireAuth, acceptInvite);
router.delete('/invite/reject', requireAuth, rejectInvite);
router.delete('/invite', requireAuth, cancelInvite);
router.delete('/link', requireAuth, breakLink);

export default router;
