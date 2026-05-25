export interface WorkflowParam {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
  optional?: boolean;
}

export interface WorkflowDef {
  id: string;
  label: string;
  description: string;
  params: WorkflowParam[];
  buildTaskString: (params: Record<string, string>) => string;
}

import { jobSearchWorkflow } from './job-search';
import { researchWorkflow } from './research';
import { extractWorkflow } from './extract';
import { fillFormsWorkflow } from './fill-forms';

export const WORKFLOWS: WorkflowDef[] = [jobSearchWorkflow, researchWorkflow, extractWorkflow, fillFormsWorkflow];

export function getWorkflow(id: string): WorkflowDef | undefined {
  return WORKFLOWS.find(w => w.id === id);
}
