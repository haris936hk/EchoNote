const { prisma } = require('../config/database');
const emailService = require('../services/email.service');
const meetingService = require('../services/meeting.service');
const logger = require('../utils/logger');

const createWorkspace = async (req, res) => {
  try {
    const { name, description } = req.body;
    const userId = req.userId;

    if (!name) {
      return res.status(400).json({ success: false, error: 'Workspace name is required' });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        description,
        members: {
          create: {
            userId,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: true,
      },
    });

    logger.info(`Workspace created: ${workspace.id} by user ${userId}`);

    return res.status(201).json({ success: true, data: workspace });
  } catch (error) {
    logger.error('Error creating workspace:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getMyWorkspaces = async (req, res) => {
  try {
    const userId = req.userId;

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: {
              select: {
                members: true,
                meetings: true,
              },
            },
          },
        },
      },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      myRole: m.role,
    }));

    return res.status(200).json({ success: true, data: workspaces });
  } catch (error) {
    logger.error('Error fetching user workspaces:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getWorkspaceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                picture: true,
              },
            },
          },
        },
        _count: {
          select: {
            meetings: true,
          },
        },
      },
    });

    return res.status(200).json({ success: true, data: workspace });
  } catch (error) {
    logger.error('Error fetching workspace:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const deleteWorkspace = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ success: false, error: 'Only owners can delete workspaces' });
    }

    await prisma.workspace.delete({ where: { id } });

    logger.info(`Workspace deleted: ${id} by owner ${userId}`);

    return res.status(200).json({ success: true, message: 'Workspace deleted successfully' });
  } catch (error) {
    logger.error('Error deleting workspace:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const inviteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role = 'VIEWER' } = req.body;
    const userId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId,
        },
      },
      include: {
        user: { select: { name: true } },
        workspace: { select: { name: true } },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ success: false, error: 'Only owners can invite members' });
    }

    const invitedUser = await prisma.user.findUnique({ where: { email } });
    if (!invitedUser) {
      return res.status(404).json({ success: false, error: 'No EchoNote account found with that email' });
    }

    try {
      const newMember = await prisma.workspaceMember.create({
        data: {
          workspaceId: id,
          userId: invitedUser.id,
          role,
        },
      });

      emailService.sendWorkspaceInvitationEmail({
        to: email,
        inviterName: membership.user.name || 'A teammate',
        workspaceName: membership.workspace.name,
        role,
      }).catch(err => logger.error(`Failed to send workspace invite email to ${email}:`, err));

      logger.info(`User ${invitedUser.id} invited to workspace ${id} by ${userId}`);

      return res.status(201).json({ success: true, data: newMember });
    } catch (e) {
      if (e.code === 'P2002') {
        return res.status(400).json({ success: false, error: 'User is already a member of this workspace' });
      }
      throw e;
    }
  } catch (error) {
    logger.error('Error inviting member:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const removeMember = async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const currentUserId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId: currentUserId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ success: false, error: 'Only owners can remove members' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, error: 'Owner cannot remove themselves' });
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId: targetUserId,
        },
      },
    });

    logger.info(`Member ${targetUserId} removed from workspace ${id} by ${currentUserId}`);

    return res.status(200).json({ success: true, message: 'Member removed successfully' });
  } catch (error) {
    logger.error('Error removing member:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const updateMemberRole = async (req, res) => {
  try {
    const { id, userId: targetUserId } = req.params;
    const { role } = req.body;
    const currentUserId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId: currentUserId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ success: false, error: 'Only owners can update member roles' });
    }

    if (targetUserId === currentUserId) {
      return res.status(400).json({ success: false, error: 'Owner cannot change their own role' });
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: id,
          userId: targetUserId,
        },
      },
      data: { role },
    });

    logger.info(`Member ${targetUserId} role updated to ${role} in workspace ${id} by ${currentUserId}`);

    return res.status(200).json({ success: true, data: updatedMember });
  } catch (error) {
    logger.error('Error updating member role:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const addMeeting = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const { meetingId } = req.body;
    const userId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ success: false, error: 'Only owners can add meetings to workspaces' });
    }

    const meeting = await prisma.meeting.findUnique({
      where: { id: meetingId },
      include: { workspaceMeeting: true },
    });

    if (!meeting) {
      return res.status(404).json({ success: false, error: 'Meeting not found' });
    }

    if (meeting.userId !== userId) {
      return res.status(403).json({ success: false, error: 'You can only add your own meetings to a workspace' });
    }

    if (meeting.status !== 'COMPLETED') {
      return res.status(400).json({ success: false, error: 'Only completed meetings can be added to a workspace' });
    }

    if (meeting.workspaceMeeting) {
      return res.status(400).json({ success: false, error: 'This meeting already belongs to another workspace' });
    }

    const workspaceMeeting = await prisma.workspaceMeeting.create({
      data: {
        workspaceId,
        meetingId,
      },
    });

    logger.info(`Meeting ${meetingId} added to workspace ${workspaceId} by owner ${userId}`);

    return res.status(201).json({ success: true, data: workspaceMeeting });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, error: 'This meeting already belongs to another workspace' });
    }
    logger.error('Error adding meeting to workspace:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const removeMeeting = async (req, res) => {
  try {
    const { id: workspaceId, meetingId } = req.params;
    const userId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      return res.status(403).json({ success: false, error: 'Only owners can remove meetings from workspaces' });
    }

    await prisma.workspaceMeeting.delete({
      where: {
        meetingId,
      },
    });

    logger.info(`Meeting ${meetingId} removed from workspace ${workspaceId} by owner ${userId}`);

    return res.status(200).json({ success: true, message: 'Meeting removed from workspace' });
  } catch (error) {
    logger.error('Error removing meeting from workspace:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getWorkspaceMeetings = async (req, res) => {
  try {
    const { id: workspaceId } = req.params;
    const userId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const workspaceMeetings = await prisma.workspaceMeeting.findMany({
      where: { workspaceId },
      include: {
        meeting: {
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            createdAt: true,
            audioDuration: true,
            status: true,
          },
        },
      },
    });

    const meetings = workspaceMeetings.map((wm) => ({
      ...wm.meeting,
      addedAt: wm.addedAt,
    }));

    return res.status(200).json({ success: true, data: meetings });
  } catch (error) {
    logger.error('Error fetching workspace meetings:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

const getWorkspaceMeeting = async (req, res) => {
  try {
    const { id: workspaceId, meetingId } = req.params;
    const userId = req.userId;

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const wmLink = await prisma.workspaceMeeting.findUnique({
      where: { meetingId },
      include: {
        meeting: {
          include: {
            actionItems: {
              orderBy: { createdAt: 'asc' }
            }
          }
        },
      },
    });

    if (!wmLink || wmLink.workspaceId !== workspaceId) {
      return res.status(404).json({ success: false, error: 'Meeting not found in this workspace' });
    }

    const transformedMeeting = meetingService.transformMeetingForFrontend(wmLink.meeting);

    const data = {
      ...transformedMeeting,
      addedAt: wmLink.addedAt,
    };

    return res.status(200).json({ success: true, data });
  } catch (error) {
    logger.error('Error fetching workspace meeting detail:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

module.exports = {
  createWorkspace,
  getMyWorkspaces,
  getWorkspaceById,
  deleteWorkspace,
  inviteMember,
  removeMember,
  updateMemberRole,
  addMeeting,
  removeMeeting,
  getWorkspaceMeetings,
  getWorkspaceMeeting,
};
