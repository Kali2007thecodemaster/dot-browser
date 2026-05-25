import type { WorkflowDef } from './index';

export const jobSearchWorkflow: WorkflowDef = {
  id: 'job-search',
  label: 'Job Search',
  description: 'Search a job board and extract listings',
  params: [
    {
      key: 'site',
      label: 'Site',
      type: 'select',
      options: ['LinkedIn', 'Indeed', 'Glassdoor'],
      defaultValue: 'LinkedIn',
    },
    {
      key: 'query',
      label: 'Job Title / Keywords',
      type: 'text',
      placeholder: 'e.g. Software Engineer',
    },
    {
      key: 'location',
      label: 'Location',
      type: 'text',
      placeholder: 'e.g. Remote or Toronto, ON',
    },
    {
      key: 'count',
      label: 'Max Listings',
      type: 'number',
      defaultValue: '10',
    },
  ],
  buildTaskString(params) {
    const { site, query, location, count } = params;
    return (
      `Search ${site} for "${query}" jobs in "${location}". ` +
      `Collect up to ${count} listings. For each listing extract: job title, company name, location, and URL. ` +
      `Save all results using save_results with type "job".`
    );
  },
};
