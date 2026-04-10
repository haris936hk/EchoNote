const { Liveblocks } = require('@liveblocks/node');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
});

/**
 * Liveblocks Auth Endpoint
 * POST /api/liveblocks/auth
 */
const auth = async (req, res) => {
  try {
    const { room } = req.body;
    const userId = req.userId;

    if (!room) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Room ID format: workspace_id:meeting_id
    const parts = room.split(':');
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'Invalid room format' });
    }

    const [workspaceId, meetingId] = parts;

    // Verify requesting user is a member of the workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
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
    });

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify the meeting belongs to this workspace
    const workspaceMeeting = await prisma.workspaceMeeting.findUnique({
      where: { meetingId },
    });

    if (!workspaceMeeting || workspaceMeeting.workspaceId !== workspaceId) {
      return res.status(404).json({ error: 'Meeting not found in this workspace' });
    }

    // Start an auth session
    const session = liveblocks.prepareSession(userId, {
      userInfo: {
        name: membership.user.name,
        avatar: membership.user.picture,
        color: getUserColor(userId),
      },
    });

    // Grant access to the room
    if (membership.role === 'OWNER' || membership.role === 'EDITOR') {
      session.allow(room, session.FULL_ACCESS);
    } else {
      session.allow(room, session.READ_ONLY);
    }

    // Authorize the user and return the result
    const { status, body } = await session.authorize();
    return res.status(status).send(body);
  } catch (error) {
    logger.error('Liveblocks auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

const getUserColor = (id) => {
  const colors = [
    '#818CF8', // Indigo
    '#A78BFA', // Violet
    '#F472B6', // Pink
    '#FB923C', // Orange
    '#34D399', // Emerald
    '#60A5FA', // Blue
  ];
  const index = Math.abs(id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  return colors[index];
};

module.exports = {
  auth,
};
