import { useState, useCallback } from 'react';
import { t } from '@extension/i18n';

interface WorkflowParam {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  optional?: boolean;
}

interface WorkflowDef {
  id: string;
  label: string;
  description: string;
  params: WorkflowParam[];
  buildTaskString: (params: Record<string, string>) => string;
  buildDisplayText: (params: Record<string, string>) => string;
}

const WORKFLOWS: WorkflowDef[] = [
  {
    id: 'job-search',
    label: t('dot_workflow_jobSearch_label'),
    description: 'Search a job board and extract listings',
    params: [
      {
        key: 'site',
        label: 'Site',
        type: 'select',
        options: ['LinkedIn', 'Indeed', 'Glassdoor'],
        defaultValue: 'LinkedIn',
      },
      { key: 'query', label: 'Job Title / Keywords', type: 'text', placeholder: 'e.g. Software Engineer' },
      { key: 'location', label: 'Location', type: 'text', placeholder: 'e.g. Remote or Toronto, ON' },
      { key: 'count', label: 'Max Listings', type: 'number', defaultValue: '10' },
    ],
    buildTaskString(p) {
      return (
        `Search ${p.site} for "${p.query}" jobs in "${p.location}". ` +
        `Collect up to ${p.count} listings. For each listing extract: job title, company name, location, and URL. ` +
        `Save all results using save_results with type "job".`
      );
    },
    buildDisplayText(p) {
      return `Job Search: ${p.query} on ${p.site}`;
    },
  },
  {
    id: 'research',
    label: t('dot_workflow_research_label'),
    description: 'Research a topic across multiple sources',
    params: [
      { key: 'topic', label: 'Topic', type: 'text', placeholder: 'e.g. TypeScript performance tips' },
      {
        key: 'sources',
        label: 'Starting URLs (optional)',
        type: 'text',
        placeholder: 'https://example.com',
        optional: true,
      },
      {
        key: 'depth',
        label: 'Depth',
        type: 'select',
        options: ['quick', 'standard', 'deep'],
        defaultValue: 'standard',
      },
    ],
    buildTaskString(p) {
      const sourceLine = p.sources ? ` Use these starting URLs: ${p.sources}.` : '';
      const depthMap: Record<string, string> = {
        quick: 'Visit 2–3 sources and write a short summary.',
        standard: 'Visit 4–6 sources, compare findings, and write a structured summary.',
        deep: 'Visit 8+ sources, cross-reference findings, and write a detailed report with citations.',
      };
      return (
        `Research the topic: "${p.topic}".${sourceLine} ${depthMap[p.depth] ?? depthMap['standard']} ` +
        `Save the final summary using save_results with type "research".`
      );
    },
    buildDisplayText(p) {
      return `Research: ${p.topic}`;
    },
  },
  {
    id: 'extract',
    label: t('dot_workflow_extract_label'),
    description: 'Extract structured data from a web page',
    params: [
      { key: 'url', label: 'URL', type: 'text', placeholder: 'https://example.com/page' },
      { key: 'instruction', label: 'What to extract', type: 'text', placeholder: 'e.g. all product names and prices' },
      {
        key: 'format',
        label: 'Output format',
        type: 'select',
        options: ['table', 'list', 'json'],
        defaultValue: 'json',
      },
    ],
    buildTaskString(p) {
      return (
        `Go to ${p.url}. Extract the following information: ${p.instruction}. ` +
        `Format the output as ${p.format}. ` +
        `Save the extracted data using save_results with type "extraction".`
      );
    },
    buildDisplayText(p) {
      return `Extract from: ${p.url}`;
    },
  },
  {
    id: 'fill-forms',
    label: t('dot_workflow_fillForms_label'),
    description: 'Auto-fill a web form using your profile data',
    params: [
      { key: 'url', label: 'Form URL', type: 'text', placeholder: 'https://example.com/apply' },
      {
        key: 'formType',
        label: 'Form Type',
        type: 'select',
        options: ['job-application', 'contact', 'signup', 'other'],
        defaultValue: 'job-application',
      },
    ],
    buildTaskString(p) {
      return (
        `Go to ${p.url}. Fill the ${p.formType} form using my profile information. ` +
        `For each required field, use get_profile_field to read the appropriate value (name, email, phone, location, etc.). ` +
        `Before clicking submit, call human_interrupt with reason "Ready to submit ${p.formType} form — please review and confirm" ` +
        `and url "${p.url}". Only submit after I resume.`
      );
    },
    buildDisplayText(p) {
      return `Fill Form: ${p.formType} at ${p.url}`;
    },
  },
];

interface WorkflowPickerProps {
  onSendMessage: (text: string, displayText?: string) => void;
  disabled: boolean;
}

function initParams(workflow: WorkflowDef): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of workflow.params) {
    out[p.key] = p.defaultValue ?? '';
  }
  return out;
}

export default function WorkflowPicker({ onSendMessage, disabled }: WorkflowPickerProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});

  const handlePillClick = useCallback(
    (workflow: WorkflowDef) => {
      if (activeId === workflow.id) {
        setActiveId(null);
        setParams({});
      } else {
        setActiveId(workflow.id);
        setParams(initParams(workflow));
      }
    },
    [activeId],
  );

  const handleRun = useCallback(
    (workflow: WorkflowDef) => {
      const taskString = workflow.buildTaskString(params);
      const displayText = workflow.buildDisplayText(params);
      onSendMessage(taskString, displayText);
      setActiveId(null);
      setParams({});
    },
    [params, onSendMessage],
  );

  const activeWorkflow = WORKFLOWS.find(w => w.id === activeId) ?? null;

  const isRunDisabled = useCallback(
    (workflow: WorkflowDef) => {
      if (disabled) return true;
      return workflow.params.filter(p => !p.optional).some(p => !params[p.key]?.trim());
    },
    [params, disabled],
  );

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Section label */}
      <div className="label-mono px-2 pb-2" style={{ color: 'var(--muted)' }}>
        Workflows
      </div>

      {/* Pills row */}
      <div className="flex flex-wrap gap-1 px-2">
        {WORKFLOWS.map(workflow => {
          const isActive = activeId === workflow.id;
          return (
            <button
              key={workflow.id}
              type="button"
              onClick={() => handlePillClick(workflow)}
              disabled={disabled}
              className="label-mono"
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--line)'}`,
                background: isActive ? 'transparent' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'border-color 0.2s linear, color 0.2s linear',
                opacity: disabled ? 0.4 : 1,
              }}>
              {workflow.label}
            </button>
          );
        })}
      </div>

      {/* Expanded param form */}
      {activeWorkflow && (
        <div className="glass-card mx-2 mt-2 p-3" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {activeWorkflow.params.map(param => (
            <div key={param.key} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label className="label-mono" style={{ color: 'var(--muted)' }} htmlFor={`wf-param-${param.key}`}>
                {param.label}
                {param.optional && <span style={{ marginLeft: 4, opacity: 0.6 }}>(optional)</span>}
              </label>

              {param.type === 'select' ? (
                <select
                  id={`wf-param-${param.key}`}
                  value={params[param.key] ?? param.defaultValue ?? ''}
                  onChange={e => setParams(prev => ({ ...prev, [param.key]: e.target.value }))}
                  className="glass-input"
                  style={{
                    fontSize: 12,
                    padding: '4px 6px',
                    color: 'var(--text)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}>
                  {param.options?.map(opt => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`wf-param-${param.key}`}
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={params[param.key] ?? ''}
                  onChange={e => setParams(prev => ({ ...prev, [param.key]: e.target.value }))}
                  placeholder={param.placeholder ?? ''}
                  className="glass-input"
                  style={{
                    fontSize: 12,
                    padding: '4px 6px',
                    color: 'var(--text)',
                    background: 'transparent',
                  }}
                />
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={() => handleRun(activeWorkflow)}
            disabled={isRunDisabled(activeWorkflow)}
            className="label-mono"
            style={{
              marginTop: 4,
              width: '100%',
              padding: '6px',
              borderRadius: 4,
              border: 'none',
              background: isRunDisabled(activeWorkflow) ? 'var(--muted)' : 'var(--accent)',
              color: 'var(--bg)',
              cursor: isRunDisabled(activeWorkflow) ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s linear',
              opacity: isRunDisabled(activeWorkflow) ? 0.5 : 1,
            }}>
            {t('dot_workflow_run_label')}
          </button>
        </div>
      )}
    </div>
  );
}
