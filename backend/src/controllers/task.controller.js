const { prisma } = require('../config/database');

const findItemWithAccess = async (id, userId) => {
  const item = await prisma.actionItem.findUnique({
    where: { id },
    include: {
      meeting: {
        include: {
          workspaceMeeting: {
            include: {
              workspace: {
                include: {
                  members: { where: { userId } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!item) return null;

  if (item.userId === userId) return item;

  const membership = item.meeting?.workspaceMeeting?.workspace?.members?.[0];
  if (membership && ['OWNER', 'EDITOR'].includes(membership.role)) return item;

  return null;
};

const createTask = async (req, res) => {
  try {
    const { meetingId, task, assignee, deadline, priority } = req.body;
    const userId = req.userId;

    if (!meetingId || !task) {
      return res.status(400).json({ success: false, error: 'meetingId and task are required' });
    }

    const newItem = await prisma.actionItem.create({
      data: {
        task,
        assignee: assignee || null,
        deadline: deadline || null,
        priority: priority || 'medium',
        status: 'TODO',
        meetingId,
        userId,
      },
    });

    const allActionItems = await prisma.actionItem.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'asc' },
    });

    const summaryActionItems = allActionItems.map((item) => ({
      id: item.id,
      task: item.task,
      assignee: item.assignee,
      deadline: item.deadline,
      priority: item.priority,
      confidence: item.confidence,
      status: item.status,
    }));

    await prisma.meeting.update({
      where: { id: meetingId },
      data: { summaryActionItems },
    });

    return res.status(201).json({ success: true, data: newItem });
  } catch (error) {
    console.error('Create task error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to create task' });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await findItemWithAccess(id, req.userId);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    await prisma.actionItem.delete({ where: { id } });

    if (item.meetingId) {
      const allActionItems = await prisma.actionItem.findMany({
        where: { meetingId: item.meetingId },
        orderBy: { createdAt: 'asc' },
      });

      const summaryActionItems = allActionItems.map((ai) => ({
        id: ai.id,
        task: ai.task,
        assignee: ai.assignee,
        deadline: ai.deadline,
        priority: ai.priority,
        confidence: ai.confidence,
        status: ai.status,
      }));

      await prisma.meeting.update({
        where: { id: item.meetingId },
        data: { summaryActionItems },
      });
    }

    return res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    console.error('Delete task error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to delete task' });
  }
};

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

    const existing = await findItemWithAccess(id, req.userId);

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

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
      where: { id },
      data: dataToUpdate,
    });

    if (updatedTask.meetingId) {
      const allActionItems = await prisma.actionItem.findMany({
        where: { meetingId: updatedTask.meetingId },
        orderBy: { createdAt: 'asc' },
      });

      const summaryActionItems = allActionItems.map((item) => ({
        id: item.id,
        task: item.task,
        assignee: item.assignee,
        deadline: item.deadline,
        priority: item.priority,
        confidence: item.confidence,
        status: item.status,
      }));

      await prisma.meeting.update({
        where: { id: updatedTask.meetingId },
        data: { summaryActionItems },
      });
    }

    return res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    console.error('Update task error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update task' });
  }
};

module.exports = { getTasks, createTask, updateTask, deleteTask };
