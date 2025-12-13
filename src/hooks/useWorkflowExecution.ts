import { useCallback } from 'react';
import { Workflow } from './useWorkflows';
import { executeWorkflows, TaskChangeContext, logWorkflowExecution } from '../services/workflowExecutor';

export interface UseWorkflowExecutionOptions {
  projectId?: string;
  workflows: Workflow[];
  onSuccess?: (results: any[]) => void;
  onError?: (error: Error) => void;
}

export const useWorkflowExecution = (options: UseWorkflowExecutionOptions) => {
  const { projectId, workflows, onSuccess, onError } = options;

  const executeOnTaskChange = useCallback(
    async (context: TaskChangeContext, taskData: any) => {
      if (!workflows || workflows.length === 0) {
        return [];
      }

      try {
        // Filter workflows for current project
        const projectWorkflows = workflows;

        // Execute workflows
        const results = await executeWorkflows(projectWorkflows, context, taskData);

        // Log results
        logWorkflowExecution(results, context);

        // Call success callback if provided
        if (onSuccess) {
          onSuccess(results);
        }

        return results;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[WorkflowExecution] Error:', err);

        if (onError) {
          onError(err);
        }

        return [];
      }
    },
    [workflows, onSuccess, onError]
  );

  return { executeOnTaskChange };
};
