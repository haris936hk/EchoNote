import { tasksAPI } from './api';


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
  } catch {
    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
};


export const updateTask = async (id, updates) => {
  try {
    if (!id || !updates) {
      return {
        success: false,
        error: 'Task ID and updates are required',
      };
    }

    const result = await tasksAPI.updateTask(id, updates);

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
  } catch {
    return {
      success: false,
      error: 'Failed to update task',
    };
  }
};

export const taskService = {
  getTasks,
  updateTask,
};

export default taskService;
