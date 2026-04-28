const { Liveblocks } = require('@liveblocks/node');
const { prisma } = require('../config/database');
const logger = require('../utils/logger');

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY,
});


const auth = async (req, res) => {
  try {
    const { room } = req.body;
    const userId = req.userId;

    if (!room) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    
    const parts = room.split(':');
    if (parts.length !== 2) {
      return res.status(400).json({ error: 'Invalid room format' });
    }

    const [prefix, id] = parts;
    let userInfo = {};
    let canEdit = false;

    if (prefix === 'personal') {
      const meetingId = id;
      const meeting = await prisma.meeting.findUnique({
        where: { id: meetingId },
        include: { user: true }
      });

      if (!meeting || meeting.userId !== userId) {
        return res.status(403).json({ error: 'Access denied: You do not own this meeting' });
      }

      userInfo = {
        name: meeting.user.name,
        avatar: meeting.user.picture,
        color: getUserColor(userId),
      };
      canEdit = true;
    } else {
      // Workspace room logic
      const workspaceId = prefix;
      const meetingId = id;

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

      const workspaceMeeting = await prisma.workspaceMeeting.findUnique({
        where: { meetingId },
      });

      if (!workspaceMeeting || workspaceMeeting.workspaceId !== workspaceId) {
        return res.status(404).json({ error: 'Meeting not found in this workspace' });
      }

      userInfo = {
        name: membership.user.name,
        avatar: membership.user.picture,
        color: getUserColor(userId),
      };
      canEdit = membership.role === 'OWNER' || membership.role === 'EDITOR';
    }

    const session = liveblocks.prepareSession(userId, { userInfo });

    if (canEdit) {
      session.allow(room, session.FULL_ACCESS);
    } else {
      session.allow(room, session.READ_ONLY);
    }

    
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
