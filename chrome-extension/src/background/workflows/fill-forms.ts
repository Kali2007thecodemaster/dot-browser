import type { WorkflowDef } from './index';

export const fillFormsWorkflow: WorkflowDef = {
  id: 'fill-forms',
  label: 'Fill Form',
  description: 'Auto-fill a web form using your profile data',
  params: [
    {
      key: 'url',
      label: 'Form URL',
      type: 'text',
      placeholder: 'https://example.com/apply',
    },
    {
      key: 'formType',
      label: 'Form Type',
      type: 'select',
      options: ['job-application', 'contact', 'signup', 'other'],
      defaultValue: 'job-application',
    },
  ],
  buildTaskString(params) {
    const { url, formType } = params;
    return (
      `Go to ${url}. Fill the ${formType} form using my profile information. ` +
      `For each required field, use get_profile_field to read the appropriate value (name, email, phone, location, etc.). ` +
      `Before clicking submit, call human_interrupt with reason "Ready to submit ${formType} form — please review and confirm" ` +
      `and url "${url}". Only submit after I resume.`
    );
  },
};
