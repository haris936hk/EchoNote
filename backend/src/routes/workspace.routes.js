const express = require('express');
const router = express.Router();
const workspaceController = require('../controllers/workspace.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All routes are private
router.use(authenticate);

router.post('/', workspaceController.createWorkspace);
router.get('/me', workspaceController.getMyWorkspaces);
router.get('/:id', workspaceController.getWorkspaceById);
router.delete('/:id', workspaceController.deleteWorkspace);

router.post('/:id/members', workspaceController.inviteMember);
router.delete('/:id/members/:userId', workspaceController.removeMember);
router.patch('/:id/members/:userId/role', workspaceController.updateMemberRole);

router.post('/:id/meetings', workspaceController.addMeeting);
router.delete('/:id/meetings/:meetingId', workspaceController.removeMeeting);
router.get('/:id/meetings', workspaceController.getWorkspaceMeetings);
router.get('/:id/meetings/:meetingId', workspaceController.getWorkspaceMeeting);

module.exports = router;
