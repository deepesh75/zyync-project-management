import { Workflow, WorkflowTrigger, WorkflowAction } from '../hooks/useWorkflows';

export interface TaskChangeContext {
  taskId: string;
  projectId: string;
  oldStatus?: string;
  newStatus?: string;
  oldPriority?: string;
  newPriority?: string;
  oldAssigneeId?: string | null;
  newAssigneeId?: string | null;
  oldDueDate?: string | null;
  newDueDate?: string | null;
  labelsAdded?: string[];
  labelsRemoved?: string[];
  [key: string]: any;
}

export interface ExecutionResult {
  workflowId: string;
  workflowName: string;
  triggered: boolean;
  actionsExecuted: Array<{
    action: WorkflowAction;
    success: boolean;
    error?: string;
  }>;
}

export interface WorkflowNotification {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

/**
 * Check if a workflow trigger matches the given context
 */
export function checkTriggerMatch(trigger: WorkflowTrigger, context: TaskChangeContext): boolean {
  switch (trigger.type) {
    case 'status_changed':
      return context.newStatus !== undefined && context.newStatus === trigger.value;

    case 'priority_changed':
      return context.newPriority !== undefined && context.newPriority === trigger.value;

    case 'assigned':
      return context.newAssigneeId === trigger.value;

    case 'due_date_set':
      return context.newDueDate !== undefined && context.newDueDate !== null;

    case 'labeled':
      return context.labelsAdded !== undefined && context.labelsAdded.includes(trigger.value || '');

    default:
      return false;
  }
}

/**
 * Execute a workflow action and return the result
 */
export async function executeAction(
  action: WorkflowAction,
  context: TaskChangeContext,
  taskData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (action.type) {
      case 'notify': {
        // Create a notification
        const notification: WorkflowNotification = {
          type: 'info',
          title: 'Workflow Notification',
          message: `Workflow triggered for task: ${taskData.title}`,
          timestamp: Date.now(),
        };
        console.log('Notification created:', notification);
        return { success: true };
      }

      case 'assign': {
        // Assign task to user
        if (!action.value) {
          return { success: false, error: 'No user specified for assignment' };
        }
        
        const response = await fetch(`/api/tasks/${context.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assigneeId: action.value }),
        });

        if (!response.ok) {
          return { success: false, error: `Failed to assign task: ${response.statusText}` };
        }

        console.log(`Task assigned to user: ${action.value}`);
        return { success: true };
      }

      case 'change_status': {
        // Change task status
        if (!action.value) {
          return { success: false, error: 'No status specified' };
        }

        const response = await fetch(`/api/tasks/${context.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: action.value }),
        });

        if (!response.ok) {
          return { success: false, error: `Failed to change status: ${response.statusText}` };
        }

        console.log(`Task status changed to: ${action.value}`);
        return { success: true };
      }

      case 'add_label': {
        // Add label to task
        if (!action.value) {
          return { success: false, error: 'No label specified' };
        }

        const currentLabels = taskData.labels || [];
        if (currentLabels.some((l: any) => l.id === action.value)) {
          return { success: true }; // Label already exists
        }

        const newLabels = [...currentLabels, { id: action.value }];

        const response = await fetch(`/api/tasks/${context.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labelIds: newLabels.map((l: any) => l.id) }),
        });

        if (!response.ok) {
          return { success: false, error: `Failed to add label: ${response.statusText}` };
        }

        console.log(`Label added to task: ${action.value}`);
        return { success: true };
      }

      case 'remove_label': {
        // Remove label from task
        if (!action.value) {
          return { success: false, error: 'No label specified' };
        }

        const currentLabels = taskData.labels || [];
        const newLabels = currentLabels.filter((l: any) => l.id !== action.value);

        const response = await fetch(`/api/tasks/${context.taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ labelIds: newLabels.map((l: any) => l.id) }),
        });

        if (!response.ok) {
          return { success: false, error: `Failed to remove label: ${response.statusText}` };
        }

        console.log(`Label removed from task: ${action.value}`);
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action type: ${action.type}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Execute all workflows for a given context
 */
export async function executeWorkflows(
  workflows: Workflow[],
  context: TaskChangeContext,
  taskData: any
): Promise<ExecutionResult[]> {
  const results: ExecutionResult[] = [];

  for (const workflow of workflows) {
    if (!workflow.enabled) {
      continue;
    }

    // Check if trigger matches
    if (!checkTriggerMatch(workflow.trigger, context)) {
      continue;
    }

    // Execute all actions
    const actionsExecuted = [];
    for (const action of workflow.actions) {
      const result = await executeAction(action, context, taskData);
      actionsExecuted.push({
        action,
        success: result.success,
        error: result.error,
      });
    }

    results.push({
      workflowId: workflow.id,
      workflowName: workflow.name,
      triggered: true,
      actionsExecuted,
    });
  }

  return results;
}

/**
 * Log workflow execution for debugging
 */
export function logWorkflowExecution(results: ExecutionResult[], context: TaskChangeContext): void {
  if (results.length === 0) {
    console.log(`[Workflows] No workflows triggered for task ${context.taskId}`);
    return;
  }

  console.log(`[Workflows] Executed ${results.length} workflow(s) for task ${context.taskId}:`);
  results.forEach((result) => {
    console.log(`  - ${result.workflowName}:`);
    result.actionsExecuted.forEach((actionResult) => {
      const status = actionResult.success ? '✓' : '✗';
      const message = actionResult.error ? ` (${actionResult.error})` : '';
      console.log(`    ${status} ${actionResult.action.type}${message}`);
    });
  });
}
