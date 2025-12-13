'use client';

import React, { useState, useMemo } from 'react';
import styles from '../styles/workflows.module.css';

export interface WorkflowTrigger {
  type: 'status_changed' | 'priority_changed' | 'assigned' | 'due_date_set' | 'labeled';
  value?: string; // status, priority, user_id, label_id, etc.
}

export interface WorkflowAction {
  type: 'notify' | 'assign' | 'change_status' | 'add_label' | 'remove_label';
  value?: string; // user_id for assign, status for change_status, label_id for add/remove_label
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

export interface WorkflowUIProps {
  isOpen: boolean;
  onClose: () => void;
  workflows: Workflow[];
  users: Array<{ id: string; name: string; email: string }>;
  labels: Array<{ id: string; name: string; color: string }>;
  statuses: string[];
  onSaveWorkflow: (workflow: Workflow) => void;
  onUpdateWorkflow: (workflow: Workflow) => void;
  onDeleteWorkflow: (workflowId: string) => void;
}

const TRIGGER_TYPES = [
  { value: 'status_changed', label: 'Status Changed' },
  { value: 'priority_changed', label: 'Priority Changed' },
  { value: 'assigned', label: 'Task Assigned' },
  { value: 'due_date_set', label: 'Due Date Set' },
  { value: 'labeled', label: 'Label Added' },
];

const ACTION_TYPES = [
  { value: 'notify', label: 'Send Notification' },
  { value: 'assign', label: 'Assign User' },
  { value: 'change_status', label: 'Change Status' },
  { value: 'add_label', label: 'Add Label' },
  { value: 'remove_label', label: 'Remove Label' },
];

const PRIORITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export const WorkflowUI: React.FC<WorkflowUIProps> = ({
  isOpen,
  onClose,
  workflows,
  users,
  labels,
  statuses,
  onSaveWorkflow,
  onUpdateWorkflow,
  onDeleteWorkflow,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formEnabled, setFormEnabled] = useState(true);
  const [formTrigger, setFormTrigger] = useState<WorkflowTrigger>({ type: 'status_changed' });
  const [formActions, setFormActions] = useState<WorkflowAction[]>([]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormEnabled(true);
    setFormTrigger({ type: 'status_changed' });
    setFormActions([]);
    setEditingWorkflow(null);
  };

  const handleCreateWorkflow = () => {
    if (!formName.trim()) {
      alert('Please enter a workflow name');
      return;
    }

    const workflow: Workflow = {
      id: editingWorkflow?.id || `workflow_${Date.now()}`,
      name: formName,
      description: formDescription,
      enabled: formEnabled,
      trigger: formTrigger,
      actions: formActions,
      createdAt: editingWorkflow?.createdAt || Date.now(),
    };

    if (editingWorkflow) {
      onUpdateWorkflow(workflow);
    } else {
      onSaveWorkflow(workflow);
    }

    resetForm();
    setActiveTab('list');
  };

  const handleEditWorkflow = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setFormName(workflow.name);
    setFormDescription(workflow.description || '');
    setFormEnabled(workflow.enabled);
    setFormTrigger(workflow.trigger);
    setFormActions([...workflow.actions]);
    setActiveTab('create');
  };

  const handleAddAction = () => {
    setFormActions([...formActions, { type: 'notify' }]);
  };

  const handleRemoveAction = (index: number) => {
    setFormActions(formActions.filter((_, i) => i !== index));
  };

  const handleActionChange = (index: number, action: WorkflowAction) => {
    const newActions = [...formActions];
    newActions[index] = action;
    setFormActions(newActions);
  };

  const getTriggerLabel = (trigger: WorkflowTrigger) => {
    const triggerType = TRIGGER_TYPES.find((t) => t.value === trigger.type);
    if (!triggerType) return 'Unknown Trigger';

    let valueLabel = '';
    if (trigger.value) {
      if (trigger.type === 'status_changed') {
        valueLabel = ` to "${trigger.value}"`;
      } else if (trigger.type === 'priority_changed') {
        valueLabel = ` to ${trigger.value}`;
      } else if (trigger.type === 'assigned') {
        const user = users.find((u) => u.id === trigger.value);
        valueLabel = user ? ` to ${user.name}` : '';
      } else if (trigger.type === 'labeled') {
        const label = labels.find((l) => l.id === trigger.value);
        valueLabel = label ? ` "${label.name}"` : '';
      }
    }

    return `${triggerType.label}${valueLabel}`;
  };

  const getActionLabel = (action: WorkflowAction) => {
    const actionType = ACTION_TYPES.find((a) => a.value === action.type);
    if (!actionType) return 'Unknown Action';

    let valueLabel = '';
    if (action.value) {
      if (action.type === 'assign') {
        const user = users.find((u) => u.id === action.value);
        valueLabel = ` ${user?.name || 'Unknown User'}`;
      } else if (action.type === 'change_status') {
        valueLabel = ` to ${action.value}`;
      } else if (action.type === 'add_label' || action.type === 'remove_label') {
        const label = labels.find((l) => l.id === action.value);
        valueLabel = ` "${label?.name || 'Unknown'}"`;
      }
    }

    return `${actionType.label}${valueLabel}`;
  };

  if (!isOpen) return null;

  return (
    <div className="workflow-modal-overlay" style={overlayStyle} onClick={onClose}>
      <div className="workflow-modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Workflows</h2>
          <button
            onClick={onClose}
            style={closeButtonStyle}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--border)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>

        <div style={tabsStyle}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              ...tabButtonStyle,
              borderBottom: activeTab === 'list' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'list' ? 'var(--primary)' : 'var(--text-secondary)',
            }}
          >
            Workflows ({workflows.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              ...tabButtonStyle,
              borderBottom: activeTab === 'create' ? '2px solid var(--primary)' : 'none',
              color: activeTab === 'create' ? 'var(--primary)' : 'var(--text-secondary)',
            }}
          >
            {editingWorkflow ? 'Edit Workflow' : 'Create New'}
          </button>
        </div>

        <div style={contentStyle}>
          {activeTab === 'list' ? (
            // List View
            <div>
              {workflows.length === 0 ? (
                <div style={emptyStateStyle}>
                  <p>No workflows yet. Create one to automate your tasks!</p>
                </div>
              ) : (
                <div style={workflowListStyle}>
                  {workflows.map((workflow) => (
                    <div key={workflow.id} style={workflowCardStyle}>
                      <div style={workflowHeaderStyle}>
                        <div>
                          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>{workflow.name}</h3>
                          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                            {workflow.description}
                          </p>
                        </div>
                        <label style={toggleStyle}>
                          <input
                            type="checkbox"
                            checked={workflow.enabled}
                            onChange={(e) => {
                              onUpdateWorkflow({
                                ...workflow,
                                enabled: e.target.checked,
                              });
                            }}
                            style={{ margin: 0 }}
                          />
                        </label>
                      </div>

                      <div style={workflowDetailsStyle}>
                        <div>
                          <p style={detailLabelStyle}>When:</p>
                          <p style={detailValueStyle}>{getTriggerLabel(workflow.trigger)}</p>
                        </div>
                        <div>
                          <p style={detailLabelStyle}>Then ({workflow.actions.length}):</p>
                          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
                            {workflow.actions.map((action, idx) => (
                              <li key={idx} style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                {getActionLabel(action)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div style={workflowActionsStyle}>
                        <button
                          onClick={() => handleEditWorkflow(workflow)}
                          style={editButtonStyle}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => onDeleteWorkflow(workflow.id)}
                          style={deleteButtonStyle}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Create/Edit View
            <div style={formStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Workflow Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Alert on High Priority"
                  style={inputStyle}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description of what this workflow does"
                  style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>
                  <input
                    type="checkbox"
                    checked={formEnabled}
                    onChange={(e) => setFormEnabled(e.target.checked)}
                    style={{ marginRight: '8px' }}
                  />
                  Enabled
                </label>
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>When this happens:</label>
                <select
                  value={formTrigger.type}
                  onChange={(e) =>
                    setFormTrigger({ type: e.target.value as any, value: undefined })
                  }
                  style={selectStyle}
                >
                  {TRIGGER_TYPES.map((trigger) => (
                    <option key={trigger.value} value={trigger.value}>
                      {trigger.label}
                    </option>
                  ))}
                </select>

                {/* Trigger value selector */}
                {formTrigger.type === 'status_changed' && (
                  <select
                    value={formTrigger.value || ''}
                    onChange={(e) => setFormTrigger({ ...formTrigger, value: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="">Select status...</option>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                )}

                {formTrigger.type === 'priority_changed' && (
                  <select
                    value={formTrigger.value || ''}
                    onChange={(e) => setFormTrigger({ ...formTrigger, value: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="">Select priority...</option>
                    {PRIORITY_LEVELS.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>
                )}

                {formTrigger.type === 'assigned' && (
                  <select
                    value={formTrigger.value || ''}
                    onChange={(e) => setFormTrigger({ ...formTrigger, value: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="">Select user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                )}

                {formTrigger.type === 'labeled' && (
                  <select
                    value={formTrigger.value || ''}
                    onChange={(e) => setFormTrigger({ ...formTrigger, value: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="">Select label...</option>
                    {labels.map((label) => (
                      <option key={label.id} value={label.id}>
                        {label.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div style={formGroupStyle}>
                <label style={labelStyle}>Then perform these actions:</label>

                {formActions.length === 0 ? (
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    No actions added yet. Click "Add Action" to create one.
                  </p>
                ) : (
                  <div style={actionsListStyle}>
                    {formActions.map((action, idx) => (
                      <div key={idx} style={actionItemStyle}>
                        <select
                          value={action.type}
                          onChange={(e) =>
                            handleActionChange(idx, { type: e.target.value as any, value: undefined })
                          }
                          style={{ ...selectStyle, flex: 1 }}
                        >
                          {ACTION_TYPES.map((at) => (
                            <option key={at.value} value={at.value}>
                              {at.label}
                            </option>
                          ))}
                        </select>

                        {/* Action value selectors */}
                        {action.type === 'assign' && (
                          <select
                            value={action.value || ''}
                            onChange={(e) => handleActionChange(idx, { ...action, value: e.target.value })}
                            style={{ ...selectStyle, flex: 1 }}
                          >
                            <option value="">Select user...</option>
                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {user.name}
                              </option>
                            ))}
                          </select>
                        )}

                        {action.type === 'change_status' && (
                          <select
                            value={action.value || ''}
                            onChange={(e) => handleActionChange(idx, { ...action, value: e.target.value })}
                            style={{ ...selectStyle, flex: 1 }}
                          >
                            <option value="">Select status...</option>
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        )}

                        {(action.type === 'add_label' || action.type === 'remove_label') && (
                          <select
                            value={action.value || ''}
                            onChange={(e) => handleActionChange(idx, { ...action, value: e.target.value })}
                            style={{ ...selectStyle, flex: 1 }}
                          >
                            <option value="">Select label...</option>
                            {labels.map((label) => (
                              <option key={label.id} value={label.id}>
                                {label.name}
                              </option>
                            ))}
                          </select>
                        )}

                        <button
                          onClick={() => handleRemoveAction(idx)}
                          style={removeActionButtonStyle}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={handleAddAction} style={addActionButtonStyle}>
                  + Add Action
                </button>
              </div>

              <div style={formActionsStyle}>
                <button
                  onClick={() => {
                    resetForm();
                    setActiveTab('list');
                  }}
                  style={cancelButtonStyle}
                >
                  Cancel
                </button>
                <button onClick={handleCreateWorkflow} style={saveButtonStyle}>
                  {editingWorkflow ? 'Update Workflow' : 'Create Workflow'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Styles
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface)',
  borderRadius: '8px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
  width: '90%',
  maxWidth: '700px',
  maxHeight: '90vh',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '20px',
  borderBottom: '1px solid var(--border)',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: '24px',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  padding: '4px 8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.2s',
};

const tabsStyle: React.CSSProperties = {
  display: 'flex',
  borderBottom: '1px solid var(--border)',
  padding: '0 20px',
};

const tabButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  padding: '12px 16px',
  fontSize: '14px',
  fontWeight: '500',
  cursor: 'pointer',
  transition: 'all 0.2s',
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: '20px',
};

const emptyStateStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: 'var(--text-secondary)',
};

const workflowListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const workflowCardStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  borderRadius: '6px',
  padding: '16px',
  backgroundColor: 'var(--background)',
};

const workflowHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '12px',
};

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
};

const workflowDetailsStyle: React.CSSProperties = {
  margin: '12px 0',
  paddingTop: '12px',
  borderTop: '1px solid var(--border)',
};

const detailLabelStyle: React.CSSProperties = {
  margin: '8px 0 4px 0',
  fontSize: '12px',
  fontWeight: '600',
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
};

const detailValueStyle: React.CSSProperties = {
  margin: '0 0 8px 0',
  fontSize: '13px',
  color: 'var(--primary)',
};

const workflowActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
};

const editButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '13px',
  backgroundColor: 'var(--primary)',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: '500',
};

const deleteButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '13px',
  backgroundColor: 'transparent',
  color: '#ef4444',
  border: '1px solid #ef4444',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: '500',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '16px',
};

const formGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '600',
  color: 'var(--text-primary)',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  fontSize: '13px',
  fontFamily: 'inherit',
  backgroundColor: 'var(--background)',
  color: 'var(--text-primary)',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};

const actionsListStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginBottom: '12px',
};

const actionItemStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
};

const removeActionButtonStyle: React.CSSProperties = {
  padding: '8px 10px',
  backgroundColor: 'transparent',
  color: '#ef4444',
  border: '1px solid #ef4444',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '16px',
};

const addActionButtonStyle: React.CSSProperties = {
  padding: '8px 12px',
  backgroundColor: 'var(--primary)',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
};

const formActionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginTop: '12px',
};

const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  backgroundColor: 'transparent',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
};

const saveButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 16px',
  backgroundColor: 'var(--primary)',
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '500',
};
