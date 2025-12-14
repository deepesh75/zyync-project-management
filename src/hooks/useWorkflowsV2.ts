import { useState, useCallback, useEffect } from 'react';

export interface WorkflowCondition {
  type: 'status_changed' | 'priority_changed' | 'assigned' | 'due_date_set' | 'labeled' | 'comment_added' | 'member_added' | 'custom_field_changed';
  field?: string; // for custom_field_changed
  operator?: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'; // condition operator
  value?: string | string[]; // the specific value to match
}

export interface WorkflowTrigger {
  conditions: WorkflowCondition[];
  logic?: 'AND' | 'OR'; // If multiple conditions, how to combine them
}

export interface WorkflowAction {
  type: 'notify' | 'notify_email' | 'assign' | 'change_status' | 'add_label' | 'remove_label' | 'set_priority' | 'set_due_date' | 'add_member' | 'create_task' | 'send_webhook';
  value?: string; // user_id for assign, status for change_status, etc.
  delay?: number; // Delay in seconds before executing this action
  metadata?: Record<string, any>; // Additional configuration (for webhooks, emails, etc.)
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  delaySeconds?: number;
  createdAt: number;
}

export interface WorkflowLog {
  id: string;
  workflowId: string;
  taskId?: string;
  action: 'triggered' | 'executed' | 'failed' | 'skipped' | 'delayed';
  actionType?: string;
  message: string;
  resultJson?: any;
  errorMessage?: string;
  createdAt: Date;
}

export const useWorkflows = (projectId: string) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [logs, setLogs] = useState<WorkflowLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load workflows from API
  const loadWorkflows = useCallback(async () => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/projects/${projectId}/workflows`);
      if (response.ok) {
        const data = await response.json();
        setWorkflows(data);
      } else {
        console.error('Failed to load workflows:', response.statusText);
        setWorkflows([]);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
      setWorkflows([]);
    }
    setIsLoading(false);
  }, [projectId]);

  // Load workflow logs
  const loadLogs = useCallback(async () => {
    if (!projectId) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/workflows/logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to load workflow logs:', error);
    }
  }, [projectId]);

  // Load workflows when projectId changes
  useEffect(() => {
    loadWorkflows();
    loadLogs();
  }, [loadWorkflows, loadLogs]);

  // Save workflow (create)
  const saveWorkflow = useCallback(
    async (workflow: Workflow) => {
      if (!projectId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/workflows`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflow)
        });

        if (response.ok) {
          const newWorkflow = await response.json();
          setWorkflows([...workflows, newWorkflow]);
          return newWorkflow;
        } else {
          const error = await response.json();
          console.error('Failed to save workflow:', error);
        }
      } catch (error) {
        console.error('Failed to save workflow:', error);
      }
    },
    [projectId, workflows]
  );

  // Update workflow
  const updateWorkflow = useCallback(
    async (workflow: Workflow) => {
      if (!projectId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/workflows/${workflow.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflow)
        });

        if (response.ok) {
          const updatedWorkflow = await response.json();
          setWorkflows(workflows.map(w => (w.id === workflow.id ? updatedWorkflow : w)));
          return updatedWorkflow;
        } else {
          const error = await response.json();
          console.error('Failed to update workflow:', error);
        }
      } catch (error) {
        console.error('Failed to update workflow:', error);
      }
    },
    [projectId, workflows]
  );

  // Delete workflow
  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      if (!projectId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/workflows/${workflowId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          setWorkflows(workflows.filter(w => w.id !== workflowId));
        } else {
          const error = await response.json();
          console.error('Failed to delete workflow:', error);
        }
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    },
    [projectId, workflows]
  );

  // Execute workflow manually (new feature)
  const executeWorkflowManually = useCallback(
    async (workflowId: string, taskId: string) => {
      if (!projectId) return;

      try {
        const response = await fetch(`/api/projects/${projectId}/workflows/${workflowId}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId })
        });

        if (response.ok) {
          const result = await response.json();
          // Reload logs after manual execution
          loadLogs();
          return result;
        } else {
          const error = await response.json();
          console.error('Failed to execute workflow:', error);
          return null;
        }
      } catch (error) {
        console.error('Failed to execute workflow:', error);
        return null;
      }
    },
    [projectId, loadLogs]
  );

  // Check if trigger matches context
  const checkTriggerMatch = (trigger: WorkflowTrigger, context: any) => {
    if (!trigger.conditions || trigger.conditions.length === 0) return false;

    const results = trigger.conditions.map(condition => {
      switch (condition.type) {
        case 'status_changed':
          return condition.operator === 'not_equals' 
            ? context.status !== condition.value 
            : context.status === condition.value;
        case 'priority_changed':
          return condition.operator === 'not_equals' 
            ? context.priority !== condition.value 
            : context.priority === condition.value;
        case 'assigned':
          return context.assigneeId === condition.value;
        case 'due_date_set':
          return !!context.dueDate;
        case 'labeled':
          return context.labelIds?.includes(condition.value);
        case 'comment_added':
          return context.commentAdded === true;
        case 'member_added':
          return context.memberAdded === true;
        case 'custom_field_changed':
          return condition.field && context[condition.field] === condition.value;
        default:
          return false;
      }
    });

    // Combine results based on logic
    if (trigger.logic === 'OR') {
      return results.some(r => r);
    }
    // Default to AND
    return results.every(r => r);
  };

  // Execute workflow actions
  const executeWorkflow = useCallback(
    (workflow: Workflow, context: any) => {
      if (!workflow.enabled) return;

      // Check if trigger matches
      if (!checkTriggerMatch(workflow.trigger, context)) return;

      // Execute actions
      workflow.actions.forEach((action) => {
        switch (action.type) {
          case 'notify':
            console.log('Notification triggered:', workflow.name);
            break;
          case 'notify_email':
            console.log('Email notification triggered:', action.metadata?.to);
            break;
          case 'assign':
            console.log('Assign action:', action.value);
            break;
          case 'change_status':
            console.log('Status change:', action.value);
            break;
          case 'add_label':
            console.log('Add label:', action.value);
            break;
          case 'remove_label':
            console.log('Remove label:', action.value);
            break;
          case 'set_priority':
            console.log('Set priority:', action.value);
            break;
          case 'set_due_date':
            console.log('Set due date:', action.metadata?.dueDate);
            break;
          case 'add_member':
            console.log('Add member:', action.value);
            break;
          case 'create_task':
            console.log('Create task:', action.metadata?.taskName);
            break;
          case 'send_webhook':
            console.log('Send webhook:', action.metadata?.url);
            break;
        }
      });
    },
    []
  );

  return {
    workflows,
    logs,
    isLoading,
    loadWorkflows,
    loadLogs,
    saveWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
    executeWorkflowManually,
    checkTriggerMatch,
  };
};
