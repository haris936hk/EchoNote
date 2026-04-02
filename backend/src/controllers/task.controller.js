const { prisma } = require('../config/database');

const getTasks = async (req, res) => {
  try {
    const tasks = await prisma.actionItem.findMany({
      where: { userId: req.userId },
      include: { meeting: { select: { title: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    console.error('Fetch tasks error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch tasks' });
  }
};

const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const task = await prisma.actionItem.update({
      where: { id, userId: req.userId }, // Enforces ownership
      data: { status },
    });

    return res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error('Update task error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update task' });
  }
};

module.exports = { getTasks, updateTaskStatus };
