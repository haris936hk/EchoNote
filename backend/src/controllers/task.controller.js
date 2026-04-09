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

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, task, assignee, deadline, priority } = req.body;

    const dataToUpdate = {};
    if (status) {
      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
      }
      dataToUpdate.status = status;
    }
    
    if (task !== undefined) dataToUpdate.task = task;
    if (assignee !== undefined) dataToUpdate.assignee = assignee;
    if (deadline !== undefined) dataToUpdate.deadline = deadline;
    if (priority !== undefined) dataToUpdate.priority = priority;

    const updatedTask = await prisma.actionItem.update({
      where: { id, userId: req.userId }, // Enforces ownership
      data: dataToUpdate,
    });

    // Sync back to meeting JSON
    if (updatedTask.meetingId) {
      const allActionItems = await prisma.actionItem.findMany({
        where: { meetingId: updatedTask.meetingId },
        orderBy: { createdAt: 'asc' }
      });
      
      // Filter out fields we don't necessarily want in the JSON array, or just keep them
      const summaryActionItems = allActionItems.map(item => ({
        id: item.id,
        task: item.task,
        assignee: item.assignee,
        deadline: item.deadline,
        priority: item.priority,
        confidence: item.confidence,
        status: item.status
      }));

      await prisma.meeting.update({
        where: { id: updatedTask.meetingId },
        data: { summaryActionItems }
      });
    }

    return res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Update task error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update task' });
  }
};

module.exports = { getTasks, updateTask };
