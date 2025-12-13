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

const STORAGE_KEY = 'zyync_project_workflows';

export const useWorkflows = (projectId: string) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load workflows from localStorage
  const loadWorkflows = useCallback(() => {
    if (!projectId) {
      setIsLoading(false);
      return;
    }

    try {
      const allWorkflows = localStorage.getItem(STORAGE_KEY);
      const workflowsMap = allWorkflows ? JSON.parse(allWorkflows) : {};
      const projectWorkflows = workflowsMap[projectId] || [];
      setWorkflows(projectWorkflows);
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
    (workflow: Workflow) => {
      if (!projectId) return;

      try {
        const allWorkflows = localStorage.getItem(STORAGE_KEY);
        const workflowsMap = allWorkflows ? JSON.parse(allWorkflows) : {};

        if (!workflowsMap[projectId]) {
          workflowsMap[projectId] = [];
        }

        workflowsMap[projectId].push(workflow);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workflowsMap));
        setWorkflows([...workflows, workflow]);
      } catch (error) {
        console.error('Failed to save workflow:', error);
      }
    },
    [projectId, workflows]
  );

  // Update workflow
  const updateWorkflow = useCallback(
    (workflow: Workflow) => {
      if (!projectId) return;

      try {
        const allWorkflows = localStorage.getItem(STORAGE_KEY);
        const workflowsMap = allWorkflows ? JSON.parse(allWorkflows) : {};

        if (!workflowsMap[projectId]) {
          workflowsMap[projectId] = [];
        }

        workflowsMap[projectId] = workflowsMap[projectId].map((w: Workflow) =>
          w.id === workflow.id ? workflow : w
        );

        localStorage.setItem(STORAGE_KEY, JSON.stringify(workflowsMap));
        setWorkflows(
          workflows.map((w) => (w.id === workflow.id ? workflow : w))
        );
      } catch (error) {
        console.error('Failed to update workflow:', error);
      }
    },
    [projectId, workflows]
  );

  // Delete workflow
  const deleteWorkflow = useCallback(
    (workflowId: string) => {
      if (!projectId) return;

      try {
        const allWorkflows = localStorage.getItem(STORAGE_KEY);
        const workflowsMap = allWorkflows ? JSON.parse(allWorkflows) : {};

        if (workflowsMap[projectId]) {
          workflowsMap[projectId] = workflowsMap[projectId].filter(
            (w: Workflow) => w.id !== workflowId
          );
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(workflowsMap));
        setWorkflows(workflows.filter((w) => w.id !== workflowId));
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
