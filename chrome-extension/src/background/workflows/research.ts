import type { WorkflowDef } from './index';

export const researchWorkflow: WorkflowDef = {
  id: 'research',
  label: 'Research',
  description: 'Research a topic across multiple sources',
  params: [
    {
      key: 'topic',
      label: 'Topic',
      type: 'text',
      placeholder: 'e.g. TypeScript performance tips',
    },
    {
      key: 'sources',
      label: 'Starting URLs (optional)',
      type: 'text',
      placeholder: 'e.g. https://example.com, https://other.com',
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
  buildTaskString(params) {
    const { topic, sources, depth } = params;
    const sourceLine = sources ? ` Use these starting URLs: ${sources}.` : '';
    const depthMap: Record<string, string> = {
      quick: 'Visit 2–3 sources and write a short summary.',
      standard: 'Visit 4–6 sources, compare findings, and write a structured summary.',
      deep: 'Visit 8+ sources, cross-reference findings, and write a detailed report with citations.',
    };
    return (
      `Research the topic: "${topic}".${sourceLine} ${depthMap[depth] ?? depthMap['standard']} ` +
      `Save the final summary using save_results with type "research".`
    );
  },
};
