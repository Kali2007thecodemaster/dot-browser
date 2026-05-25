import { z } from 'zod';

export interface ActionSchema {
  name: string;
  description: string;
  schema: z.ZodType;
}

export const doneActionSchema: ActionSchema = {
  name: 'done',
  description: 'Complete task',
  schema: z.object({
    text: z.string(),
    success: z.boolean(),
  }),
};

// Basic Navigation Actions
export const searchGoogleActionSchema: ActionSchema = {
  name: 'search_google',
  description:
    'Search the query in Google in the current tab, the query should be a search query like humans search in Google, concrete and not vague or super long. More the single most important items.',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    query: z.string(),
  }),
};

export const goToUrlActionSchema: ActionSchema = {
  name: 'go_to_url',
  description: 'Navigate to URL in the current tab',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    url: z.string(),
  }),
};

export const goBackActionSchema: ActionSchema = {
  name: 'go_back',
  description: 'Go back to the previous page',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
  }),
};

export const clickElementActionSchema: ActionSchema = {
  name: 'click_element',
  description: 'Click element by index',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    index: z.number().int().describe('index of the element'),
    xpath: z.string().nullable().optional().describe('xpath of the element'),
  }),
};

export const inputTextActionSchema: ActionSchema = {
  name: 'input_text',
  description: 'Input text into an interactive input element',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    index: z.number().int().describe('index of the element'),
    text: z.string().describe('text to input'),
    xpath: z.string().nullable().optional().describe('xpath of the element'),
  }),
};

// Tab Management Actions
export const switchTabActionSchema: ActionSchema = {
  name: 'switch_tab',
  description: 'Switch to tab by tab id',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    tab_id: z.number().int().describe('id of the tab to switch to'),
  }),
};

export const openTabActionSchema: ActionSchema = {
  name: 'open_tab',
  description: 'Open URL in new tab',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    url: z.string().describe('url to open'),
  }),
};

export const closeTabActionSchema: ActionSchema = {
  name: 'close_tab',
  description: 'Close tab by tab id',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    tab_id: z.number().int().describe('id of the tab'),
  }),
};

export const downloadFileActionSchema: ActionSchema = {
  name: 'download_file',
  description:
    "Download a file (PDF, ZIP, image, etc.) from a direct URL to the user's default downloads folder. Use this when the user asks to download/save a file, or after finding a direct file link on a page. Pass the absolute URL of the file. Optionally pass a filename to suggest one to the browser.",
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    url: z.string().describe('absolute URL of the file to download'),
    filename: z
      .string()
      .optional()
      .describe('suggested filename including extension (e.g. "book.pdf"); browser may rename to avoid conflicts'),
  }),
};

// Content Actions, not used currently
// export const extractContentActionSchema: ActionSchema = {
//   name: 'extract_content',
//   description:
//     'Extract page content to retrieve specific information from the page, e.g. all company names, a specific description, all information about, links with companies in structured format or simply links',
//   schema: z.object({
//     goal: z.string(),
//   }),
// };

// Cache Actions
export const cacheContentActionSchema: ActionSchema = {
  name: 'cache_content',
  description: 'Cache what you have found so far from the current page for future use',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    content: z.string().default('').describe('content to cache'),
  }),
};

export const scrollToPercentActionSchema: ActionSchema = {
  name: 'scroll_to_percent',
  description:
    'Scrolls to a particular vertical percentage of the document or an element. If no index of element is specified, scroll the whole document.',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    yPercent: z.number().int().describe('percentage to scroll to - min 0, max 100; 0 is top, 100 is bottom'),
    index: z.number().int().nullable().optional().describe('index of the element'),
  }),
};

export const scrollToTopActionSchema: ActionSchema = {
  name: 'scroll_to_top',
  description: 'Scroll the document in the window or an element to the top',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    index: z.number().int().nullable().optional().describe('index of the element'),
  }),
};

export const scrollToBottomActionSchema: ActionSchema = {
  name: 'scroll_to_bottom',
  description: 'Scroll the document in the window or an element to the bottom',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    index: z.number().int().nullable().optional().describe('index of the element'),
  }),
};

export const previousPageActionSchema: ActionSchema = {
  name: 'previous_page',
  description:
    'Scroll the document in the window or an element to the previous page. If no index is specified, scroll the whole document.',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    index: z.number().int().nullable().optional().describe('index of the element'),
  }),
};

export const nextPageActionSchema: ActionSchema = {
  name: 'next_page',
  description:
    'Scroll the document in the window or an element to the next page. If no index is specified, scroll the whole document.',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    index: z.number().int().nullable().optional().describe('index of the element'),
  }),
};

export const scrollToTextActionSchema: ActionSchema = {
  name: 'scroll_to_text',
  description: 'If you dont find something which you want to interact with in current viewport, try to scroll to it',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    text: z.string().describe('text to scroll to'),
    nth: z
      .number()
      .int()
      .min(1)
      .default(1)
      .describe('which occurrence of the text to scroll to (1-indexed, default: 1)'),
  }),
};

export const sendKeysActionSchema: ActionSchema = {
  name: 'send_keys',
  description:
    'Send strings of special keys like Backspace, Insert, PageDown, Delete, Enter. Shortcuts such as `Control+o`, `Control+Shift+T` are supported as well. This gets used in keyboard press. Be aware of different operating systems and their shortcuts',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    keys: z.string().describe('keys to send'),
  }),
};

export const getDropdownOptionsActionSchema: ActionSchema = {
  name: 'get_dropdown_options',
  description: 'Get all options from a native dropdown',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    index: z.number().int().describe('index of the dropdown element'),
  }),
};

export const selectDropdownOptionActionSchema: ActionSchema = {
  name: 'select_dropdown_option',
  description: 'Select dropdown option for interactive element index by the text of the option you want to select',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    index: z.number().int().describe('index of the dropdown element'),
    text: z.string().describe('text of the option'),
  }),
};

export const waitActionSchema: ActionSchema = {
  name: 'wait',
  description: 'Wait for x seconds default 3, do NOT use this action unless user asks to wait explicitly',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    seconds: z.number().int().default(3).describe('amount of seconds'),
  }),
};

// Dot Custom Tools
export const getProfileFieldActionSchema: ActionSchema = {
  name: 'get_profile_field',
  description:
    'Read a field from the user profile store (name, email, phone, location, skills, education, experience, links)',
  schema: z.object({
    field: z.string().describe('the profile field to read (e.g. name, email, phone, location, skills)'),
  }),
};

export const saveResultsActionSchema: ActionSchema = {
  name: 'save_results',
  description: 'Save extracted data to the results store for later review',
  schema: z.object({
    type: z.enum(['job', 'research', 'extraction']).describe('category of the result'),
    data: z.string().describe('the extracted data as a JSON string or plain text'),
  }),
};

export const humanInterruptActionSchema: ActionSchema = {
  name: 'human_interrupt',
  description: 'Pause execution and prompt the user for input or confirmation before continuing',
  schema: z.object({
    reason: z.string().describe('reason for interrupting and what the user should do'),
    url: z.string().describe('current URL where the interrupt is triggered'),
  }),
};

export const getWorkflowParamsActionSchema: ActionSchema = {
  name: 'get_workflow_params',
  description: 'Retrieve the template parameters for a named workflow',
  schema: z.object({
    workflowId: z.string().describe('identifier of the workflow (e.g. job-search, research, extract, fill-forms)'),
  }),
};

export const readUploadedFileActionSchema: ActionSchema = {
  name: 'read_uploaded_file',
  description: 'Read the parsed text content of a file that the user has uploaded',
  schema: z.object({
    fileId: z.string().describe('the ID of the uploaded file to read'),
  }),
};

export const listUploadedFilesActionSchema: ActionSchema = {
  name: 'list_uploaded_files',
  description: 'List all files the user has uploaded, returning their IDs, names, and types',
  schema: z.object({}),
};

export const fetchUrlActionSchema: ActionSchema = {
  name: 'fetch_url',
  description:
    'Make an HTTP request from the current page context, inheriting its session cookies and authentication. Use this to call backend API endpoints that the website itself uses (same-origin requests), enabling faster and more complete data extraction than DOM scraping. Ideal for sites like LinkedIn, GitHub, Twitter where internal APIs are available.',
  schema: z.object({
    url: z.string().describe('the full URL of the API endpoint to call'),
    method: z.string().default('GET').describe('HTTP method: GET, POST, PUT, DELETE'),
    headers: z.record(z.string()).optional().describe('additional request headers as key-value pairs'),
    body: z.string().optional().describe('request body for POST/PUT requests (JSON string)'),
  }),
};

export const openAiChatActionSchema: ActionSchema = {
  name: 'open_ai_chat',
  description:
    'Open an AI chat assistant in a new tab to perform tasks like generating documents, synthesizing information, or writing content. Preferred provider order: gemini → claude → chatgpt → deepseek. After opening, use input_text to enter the prompt.',
  schema: z.object({
    provider: z
      .enum(['gemini', 'claude', 'chatgpt', 'deepseek'])
      .default('gemini')
      .describe('which AI assistant to open (default: gemini)'),
  }),
};
