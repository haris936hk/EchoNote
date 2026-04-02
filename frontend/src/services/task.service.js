import { tasksAPI } from './api';

/**
 * Fetch all tasks (action items) for current user
 */
export const getTasks = async () => {
  try {
    const result = await tasksAPI.getTasks();

    if (result.success) {
      return {
        success: true,
        data: result.data.data || [],
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to fetch tasks',
    };
  } catch (error) {
    console.error('Get tasks error:', error);
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
};

/**
 * Update task status
 */
export const updateTaskStatus = async (id, status) => {
  try {
    if (!id || !status) {
      return {
        success: false,
        error: 'Task ID and status are required',
      };
    }

    const result = await tasksAPI.updateTaskStatus(id, status);

    if (result.success) {
      return {
        success: true,
        data: result.data.data,
      };
    }

    return {
      success: false,
      error: result.error || 'Failed to update task',
    };
  } catch (error) {
    console.error('Update task error:', error);
    return {
      success: false,
      error: 'Failed to update task status',
    };
  }
};

export const taskService = {
  getTasks,
  updateTaskStatus,
};

export default taskService;
