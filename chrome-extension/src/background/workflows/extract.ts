import type { WorkflowDef } from './index';

export const extractWorkflow: WorkflowDef = {
  id: 'extract',
  label: 'Extract',
  description: 'Extract structured data from a web page',
  params: [
    {
      key: 'url',
      label: 'URL',
      type: 'text',
      placeholder: 'https://example.com/page',
    },
    {
      key: 'instruction',
      label: 'What to extract',
      type: 'text',
      placeholder: 'e.g. all product names and prices',
    },
    {
      key: 'format',
      label: 'Output format',
      type: 'select',
      options: ['table', 'list', 'json'],
      defaultValue: 'json',
    },
  ],
  buildTaskString(params) {
    const { url, instruction, format } = params;
    return (
      `Go to ${url}. Extract the following information: ${instruction}. ` +
      `Format the output as ${format}. ` +
      `Save the extracted data using save_results with type "extraction".`
    );
  },
};
