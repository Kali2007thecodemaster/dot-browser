# WORKFLOWS.md — Dot Task Templates

## Overview

Workflows are parameterized task templates that generate structured prompts
for the agent system. Each exports a `Workflow` object and lives in
`chrome-extension/src/background/workflows/`.

## Interface

```typescript
interface Workflow {
  id: string;
  name: string;
  description: string;
  parameters: WorkflowParam[];
  buildTask: (params: Record<string, string>) => string;
}

interface WorkflowParam {
  key: string;
  label: string;
  type: 'text' | 'select' | 'number';
  default?: string;
  options?: string[];   // for select type
  required?: boolean;
}
```

## File Attachments

Any workflow can include file attachments. When files are attached via the side panel:

1. Files are parsed and stored in `uploadStore` before task dispatch
2. The task string appends: `\n[Attached files: filename.md, report.pdf]`
3. Agents access content via `list_uploaded_files` and `read_uploaded_file(fileId)` tools
4. File content is injected into the agent's context — not uploaded to any external service

### Accepted formats

| Type | Extension | Parsing |
|------|-----------|---------|
| Markdown | `.md` | Read as UTF-8 text, stored raw |
| PDF | `.pdf` | `pdfjs-dist` extracts text per page, stored as joined string |

### Limits
- Max 5MB per file
- Max 20MB total
- Binary PDFs are discarded after text extraction
- Only `.md` and `.pdf` accepted — all others rejected with error in `StatusRow`

### Example: Research with attached paper

```
User attaches: "attention-is-all-you-need.pdf"
User types: "Summarize this paper and find 5 related recent papers"

Task string sent to Planner:
  "Summarize this paper and find 5 related recent papers
   [Attached files: attention-is-all-you-need.pdf]"

Planner:
  1. list_uploaded_files() → [{ id: "abc", name: "attention-is-all-you-need.pdf", type: "pdf" }]
  2. read_uploaded_file("abc") → full parsed text
  3. Strategy: summarize content, then navigate to Google Scholar, search related work
```

## Workflows

### 1. Job Search (`job-search.ts`)

**Parameters**:
- `site` — select: `indeed.com`, `linkedin.com/jobs`, `glassdoor.com`
- `query` — text, default: `"software developer"`
- `location` — text, default: `"Regina, SK"`
- `count` — number, default: `10`

**Task output**:
```
Go to {site} and search for "{query}" jobs in "{location}".
Extract the first {count} results. For each, get:
- Job title
- Company name
- Location
- URL
- Salary (if shown)
- Posted date (if shown)
When done, use save_results with type "job" to persist them.
```

**Result schema**:
```typescript
interface JobListing {
  title: string;
  company: string;
  location: string;
  url: string;
  salary?: string;
  postedDate?: string;
}
```

### 2. Research (`research.ts`)

**Parameters**:
- `topic` — text, required
- `sources` — text, default: `"Google Scholar, arXiv"` (comma-separated)
- `depth` — select: `quick` (3 sources), `standard` (5), `deep` (10)

**Task output**:
```
Research the topic: "{topic}".
Visit these sources: {sources}.
For each source, find the {depth_count} most relevant results.
Extract: title, URL, key findings (2-3 sentences), date published.
Compile a summary. Use save_results with type "research".
```

### 3. Extract Data (`extract.ts`)

**Parameters**:
- `url` — text, required
- `instruction` — text, required
- `format` — select: `table`, `list`, `json`

**Task output**:
```
Go to {url}.
Extract the following: {instruction}.
Format as {format}.
Use save_results with type "extraction".
```

### 4. Fill Forms (`fill-forms.ts`)

**Parameters**:
- `url` — text, required
- `formType` — select: `job-application`, `registration`, `contact`, `custom`

**Task output**:
```
Go to {url}.
Identify all form fields.
For each field, use get_profile_field to retrieve matching data.
Fill all matchable fields.
DO NOT click submit.
Use human_interrupt with reason "Form filled — ready for review".
```

**HITL**: This workflow always interrupts before submission.

## i18n Keys

Follow upstream convention `component_category_specificAction_state`:

```
dot_workflow_jobSearch_start
dot_workflow_jobSearch_ok
dot_workflow_jobSearch_fail
dot_workflow_research_start
dot_workflow_extract_start
dot_workflow_fillForms_pause   (HITL interrupt)
```

Edit in `packages/i18n/locales/`. Never edit `packages/i18n/lib/`.

## Adding a New Workflow

1. Create `chrome-extension/src/background/workflows/{name}.ts`
2. Export a `Workflow` object following the interface
3. Register in `chrome-extension/src/background/workflows/index.ts`
4. Add i18n keys in `packages/i18n/locales/`
5. `WorkflowPicker` auto-discovers registered workflows
6. `pnpm -F chrome-extension type-check`
