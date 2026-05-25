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

// ============================================================================
// Notion actions — long-term memory backed by the user's Notion workspace.
// All actions require the user to have configured an integration token in
// Settings → Notion. They never accept the token as an argument.
// ============================================================================

export const notionSearchActionSchema: ActionSchema = {
  name: 'notion_search',
  description:
    "Search the user's Notion workspace for pages or databases the integration has access to. Use this to discover where the user wants new content created, to find a database by approximate title, or to confirm an integration has access to a known page. Returns rows of { id, type: 'page'|'database', title, url }.",
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    query: z
      .string()
      .optional()
      .describe('Substring of the title to match. Omit to list everything the integration can see.'),
    filter_type: z.enum(['page', 'database']).optional().describe('Restrict results to pages or databases only.'),
    page_size: z.number().int().min(1).max(100).optional().describe('Max rows (default 25)'),
  }),
};

export const notionGetPinnedDbActionSchema: ActionSchema = {
  name: 'notion_get_pinned_db',
  description:
    'Look up a database the user has pinned in Settings → Notion by its friendly name (e.g. "Job Tracker"). Returns { database_id, description } or fails clearly if no pin exists with that name. Use this BEFORE notion_query_database / notion_create_page when the user refers to a database by name across sessions.',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    name: z.string().describe('Friendly name as configured in Settings → Notion → Pinned databases.'),
  }),
};

export const notionGetDatabaseActionSchema: ActionSchema = {
  name: 'notion_get_database',
  description:
    "Retrieve a Notion database's schema (property names + types). Use this BEFORE notion_create_page or notion_update_page so you know which fields exist and what types they expect. Returns { id, title, properties: { name: { type } } }.",
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    database_id: z.string().describe('Notion database UUID (with or without dashes).'),
  }),
};

export const notionQueryDatabaseActionSchema: ActionSchema = {
  name: 'notion_query_database',
  description: `Read rows from a Notion database with optional filtering and sorting. Use this for "show me", "list", "what's in", "sorted by", "filter by" requests.

The filter and sorts objects use Notion's filter DSL — pass them as-is from your understanding of the schema. Common patterns:
  filter: { "property": "Status", "select": { "equals": "To apply" } }
  filter: { "and": [{ "property": "Status", "select": { "equals": "Applied" } }, { "property": "Date", "date": { "after": "2026-01-01" } }] }
  sorts: [{ "property": "Date Posted", "direction": "descending" }]

Returns rows flattened to { _id, _url, <field_name>: <scalar_or_array> } so you can render them as a markdown table in the chat.`,
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    database_id: z.string().describe('Notion database UUID'),
    filter: z.any().optional().describe('Notion filter object — see action description for patterns.'),
    sorts: z
      .array(z.any())
      .optional()
      .describe('Notion sorts array, e.g. [{ property: "Date", direction: "descending" }]'),
    page_size: z.number().int().min(1).max(100).optional().describe('Max rows (default 25)'),
  }),
};

export const notionGetPageActionSchema: ActionSchema = {
  name: 'notion_get_page',
  description:
    'Read a single Notion page by ID. Returns its flattened properties (and url). Use when the user asks "show me that entry" or you need to inspect one row.',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    page_id: z.string().describe('Notion page UUID'),
  }),
};

export const notionCreateDatabaseActionSchema: ActionSchema = {
  name: 'notion_create_database',
  description: `Create a new Notion database under a parent page the integration has access to. Use this when the user asks to "set up a tracker / log / list" or you need persistent structured memory for a new domain.

The "schema" argument is a flat map { propertyName: typeSpec }. Type spec is either a string ('title','text','number','url','email','phone','date','checkbox') or an object ({ type: 'select'|'multi_select', options: ['a','b','c'] }) or ({ type: 'number', format: 'dollar' }). Exactly one property must be of type 'title' — if you omit it, the first key is forced to title.

Example for a job tracker:
  parent_page_id: <id from notion_search>
  title: "Job Tracker"
  schema: {
    "Position": "title",
    "Company": "text",
    "URL": "url",
    "Status": { "type": "select", "options": ["To apply","Applied","Interviewing","Offer","Rejected"] },
    "Date Posted": "date",
    "Location": "text",
    "Salary": "text",
    "Skills Match": { "type": "multi_select", "options": [] },
    "Notes": "text"
  }

Returns { database_id, url, title } so you can immediately offer to pin it.`,
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    parent_page_id: z.string().describe('Notion page UUID under which the new database is created.'),
    title: z.string().describe('Database title shown in Notion.'),
    schema: z.record(z.any()).describe('Property schema as { name: typeSpec } — see action description.'),
  }),
};

export const notionCreatePageActionSchema: ActionSchema = {
  name: 'notion_create_page',
  description: `Insert a new row into a Notion database. Pass a flat field-map as "values"; types are coerced automatically using the database schema.

Example for the job tracker above:
  database_id: <id>
  values: {
    "Position": "Senior Backend Engineer",
    "Company": "Acme Robotics",
    "URL": "https://acme.example.com/jobs/123",
    "Status": "To apply",
    "Date Posted": "2026-03-15",
    "Location": "San Francisco / Remote",
    "Salary": "$220K-$280K",
    "Skills Match": ["Go", "Kafka", "Kubernetes"],
    "Notes": "Quarterly travel to SF expected."
  }

Returns { page_id, url } so you can reference the new row in your response.`,
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    database_id: z.string().describe('Notion database UUID'),
    values: z.record(z.any()).describe('Flat { fieldName: value } map of column values for the new row.'),
  }),
};

export const notionUpdatePageActionSchema: ActionSchema = {
  name: 'notion_update_page',
  description:
    'Update one or more properties on an existing Notion page (row). Pass only the fields you want to change in "values"; everything else stays. Requires the database_id so types can be coerced.',
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    page_id: z.string().describe('Notion page UUID'),
    database_id: z.string().describe('Parent database UUID (needed to look up property types)'),
    values: z.record(z.any()).describe('Flat field-map of fields to change.'),
  }),
};

export const notionArchivePageActionSchema: ActionSchema = {
  name: 'notion_archive_page',
  description:
    "Soft-delete a Notion page (sets archived=true). The page can still be restored from Notion's trash. Use this when the user explicitly asks to remove / delete / archive a row.",
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    page_id: z.string().describe('Notion page UUID'),
  }),
};

export const notionArchiveDatabaseActionSchema: ActionSchema = {
  name: 'notion_archive_database',
  description:
    "Soft-delete an entire Notion database. The database can still be restored from Notion's trash. DESTRUCTIVE — only call after the user has explicitly confirmed they want to remove this database, not a single row.",
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action'),
    database_id: z.string().describe('Notion database UUID'),
  }),
};

export const generateMdBriefActionSchema: ActionSchema = {
  name: 'generate_md_brief',
  description: `Assemble a detailed, structured markdown brief and save it to the user's Downloads folder as a .md file. The output is designed to be uploaded/pasted into a second AI (Claude, ChatGPT, Gemini) so that AI can perform a complex task with no further clarification from the user.

WHEN TO USE:
- The user is doing repeated work that another AI could finish (e.g. "search 10 job postings and prepare tailoring instructions for my resume" -> one brief per posting)
- You have observed enough material on the current page/task to fully specify the downstream task
- The downstream AI must produce a concrete artifact (rewritten resume, drafted email, code, analysis)

QUALITY BAR — this action is useless when fields are vague:
- The brief must be self-contained: the receiving AI will have ONLY this file as context
- Include direct quotes from the source page where useful, not paraphrases
- "context" should be 200+ words; "instructions" should be 8-15 explicit numbered steps
- Examples beat abstract guidance — provide 1-3 concrete input->output pairs when relevant

The action assembles the fields into a markdown document with proper sections (Role, Context, Source Material, Instructions, Output Format, Constraints, Examples, Success Criteria) and triggers a download. Returns the filename so you can reference it in your reply to the user.`,
  schema: z.object({
    intent: z.string().default('').describe('purpose of this action (one short line)'),
    purpose: z
      .string()
      .describe(
        'One-line statement of what this brief is for. Used as the document title and as the basis for the filename. e.g. "Tailor my resume for Senior Backend Engineer at Acme Corp"',
      ),
    target_ai_role: z
      .string()
      .describe(
        "Persona/expertise of the receiving AI, framed as a direct instruction. Include the domain expertise, years of experience, tone, and POV. e.g. 'You are an expert technical resume editor with 15 years of experience helping senior software engineers land roles at FAANG-tier companies. You write in a confident, results-oriented voice and prefer concrete metrics over generic adjectives.'",
      ),
    context: z
      .string()
      .describe(
        'Rich background the receiving AI needs to understand the task. For a job posting include: company name + description, role title + level, full responsibilities list, required skills, preferred qualifications, team/department, work environment (remote/hybrid/onsite), location, salary range if visible, technology stack, language requirements, anything notable about the company culture. Include verbatim quotes for any specific phrasing the receiving AI should mirror. Aim for >=200 words.',
      ),
    source_material: z
      .string()
      .optional()
      .describe(
        "Reference material the receiving AI should operate on (e.g. the FULL TEXT of the user's current resume, an uploaded document, extracted page content). Pass the complete content verbatim — never summarize.",
      ),
    instructions: z
      .string()
      .describe(
        "Numbered, step-by-step instructions for the receiving AI. Cover: what to read first, what to identify, what to change, how to phrase changes, what order to apply changes, when to ask the user vs proceed, what to leave alone, what to flag. 8-15 explicit steps is the right size for non-trivial tasks. Use newline-separated lines starting with '1.', '2.', etc.",
      ),
    output_format: z
      .string()
      .describe(
        "Exact structure of what the receiving AI should produce. Specify section headings, ordering, what each section contains, length constraints, the format (markdown / plain / JSON / code block), and how the user is meant to use the output (e.g. 'paste this back into your resume editor as-is'). Be prescriptive enough that two AIs would produce structurally identical results.",
      ),
    constraints: z
      .string()
      .optional()
      .describe(
        'Hard rules: what the receiving AI MUST NOT do (fabricate experience, exceed 1 page, change job titles, use buzzwords X/Y/Z, write in first person, etc.). Also tone/voice/perspective requirements. Phrase as imperatives.',
      ),
    examples: z
      .array(
        z.object({
          label: z.string().describe('Short label for this example'),
          input: z.string().describe('Example input the receiving AI might face'),
          output: z.string().describe('Example desired output for that input'),
        }),
      )
      .optional()
      .describe(
        'Few-shot examples. 1-3 concrete input->output pairs are far more useful than 10 mediocre ones. Skip if the task is simple enough that examples would add noise.',
      ),
    success_criteria: z
      .string()
      .optional()
      .describe(
        'Checklist the receiving AI (and the user) can use to self-verify the output. Bullet-list (one per line, starting with "- "). e.g. "- Every bullet starts with a strong action verb", "- All required skills from the job description appear somewhere in the resume", "- Stays under 1 page when rendered at 11pt".',
      ),
    filename: z
      .string()
      .optional()
      .describe(
        'Suggested filename WITHOUT extension. If omitted, derived from purpose. The .md extension is added automatically.',
      ),
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
