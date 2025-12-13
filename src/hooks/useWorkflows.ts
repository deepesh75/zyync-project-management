import { useState, useCallback, useEffect } from 'react';

export interface WorkflowTrigger {
  type: 'status_changed' | 'priority_changed' | 'assigned' | 'due_date_set' | 'labeled';
  value?: string;
}

export interface WorkflowAction {
  type: 'notify' | 'assign' | 'change_status' | 'add_label' | 'remove_label';
  value?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  createdAt: number;
}

export const useWorkflows = (projectId: string) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
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

  // Load workflows when projectId changes
  useEffect(() => {
    loadWorkflows();
  }, [projectId, loadWorkflows]);

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
          const savedWorkflow = await response.json();
          setWorkflows([...workflows, savedWorkflow]);
        } else {
          console.error('Failed to save workflow:', response.statusText);
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
          setWorkflows(
            workflows.map((w) => (w.id === workflow.id ? updatedWorkflow : w))
          );
        } else {
          console.error('Failed to update workflow:', response.statusText);
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
          setWorkflows(workflows.filter((w) => w.id !== workflowId));
        } else {
          console.error('Failed to delete workflow:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    },
    [projectId, workflows]
  );

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
        }
      });
    },
    []
  );

  return {
    workflows,
    isLoading,
    loadWorkflows,
    saveWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
  };
};

// Helper function to check if trigger matches context
function checkTriggerMatch(trigger: WorkflowTrigger, context: any): boolean {
  switch (trigger.type) {
    case 'status_changed':
      return context.statusChanged && context.newStatus === trigger.value;
    case 'priority_changed':
      return context.priorityChanged && context.newPriority === trigger.value;
    case 'assigned':
      return context.assignedTo === trigger.value;
    case 'due_date_set':
      return context.dueDateSet;
    case 'labeled':
      return context.labelAdded === trigger.value;
    default:
      return false;
  }
}
