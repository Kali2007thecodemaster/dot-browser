# ARCHITECTURE.md — Dot System Design

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: WORKFLOWS (Orchestration — deterministic)            │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │Job Search│ │ Research │ │ Extract  │ │Fill Forms│  + custom │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       └─────────────┴─────────────┴─────────────┘              │
│                         │                                       │
│                    Workflow Registry                             │
│                    buildTask(params) → task string              │
│                         │                                       │
├─────────────────────────┼───────────────────────────────────────┤
│  LAYER 2: AGENTS (Reasoning — LLM-powered)                     │
│                         │                                       │
│           ┌─────────────▼──────────────┐                       │
│           │        Executor            │                       │
│           │   background/index.ts      │                       │
│           └──┬──────────┬──────────┬───┘                       │
│              │          │          │                             │
│     ┌────────▼──┐ ┌────▼─────┐ ┌──▼─────────┐                 │
│     │ Planner   │ │Navigator │ │ Validator   │                 │
│     │           │ │          │ │             │                  │
│     │ Strategy  │ │ DOM read │ │ Checks goal │                 │
│     │ Planning  │ │ Actions  │ │ completion  │                 │
│     │ Replan    │ │ Execute  │ │ Pass/fail   │                 │
│     └───────────┘ └────┬─────┘ └─────────────┘                 │
│                        │                                        │
├────────────────────────┼────────────────────────────────────────┤
│  LAYER 3: TOOLS (Execution — deterministic functions)          │
│                        │                                        │
│  ┌─────────────────────▼──────────────────────────────────────┐│
│  │                 ActionBuilder (builder.ts)                  ││
│  │                                                             ││
│  │  BROWSER (upstream)       CUSTOM (Dot)                     ││
│  │  ──────────────────       ────────────                     ││
│  │  click(index)             getProfileField(field)           ││
│  │  type(index, text)        saveResults(type, data)          ││
│  │  scroll(dir, amt)         humanInterrupt(reason, url)      ││
│  │  goToUrl(url)             getWorkflowParams(workflowId)    ││
│  │  goBack()                 readUploadedFile(fileId)         ││
│  │  openTab(url)             listUploadedFiles()              ││
│  │  switchTab(index)                                          ││
│  │  extract(instruction)     STORAGE (Chrome local)           ││
│  │  waitForContent(sel)      ─────────────────────            ││
│  │  done(result)             profileStore                     ││
│  │  sendKeys(keys)           resultsStore                     ││
│  │                           uploadStore                      ││
│  │                           chatHistoryStore (upstream)      ││
│  │                           agentModelStore (upstream)       ││
│  └────────────────────────────────────────────────────────────┘│
│                        │                                        │
│              ┌─────────▼───────────┐                           │
│              │  Puppeteer (CDP)    │                           │
│              │  BrowserContext     │                           │
│              │  Page               │                           │
│              └─────────────────────┘                           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Job Search (End-to-End)

```
 1  User clicks "Job search" pill in WorkflowPicker
 2  WorkflowPicker renders param form (site, query, location, count)
 3  User fills params → buildTask() generates task string
 4  Task string → Chrome messaging → background service worker
 5  Executor → PlannerAgent
 6  Planner generates strategy:
      Step 1: goToUrl("indeed.com")
      Step 2: type(searchBox, "junior developer")
      Step 3: type(locationBox, "Regina, SK")
      Step 4: click(searchButton)
      Step 5: extract("job title, company, location, salary, URL")
      Step 6: saveResults("job", extractedData)
 7  NavigatorAgent receives strategy → reads DOM → executes actions
 8  Action loop via Puppeteer CDP
 9  ValidatorAgent checks: did we get N results? URLs valid? Data complete?
10  If invalid → Planner replans (max 3 retries)
11  If valid → results flow back via Chrome messaging → side panel
12  ResultsCard renders with clickable rows
```

## HITL Interrupt Matrix

| Trigger | Agent detects | Action |
|---------|--------------|--------|
| Login required | Login/auth form in DOM | `humanInterrupt("Authentication required", url)` |
| CAPTCHA | CAPTCHA element detected | `humanInterrupt("CAPTCHA detected", url)` |
| Form submit | `fill-forms` workflow at submit step | Always interrupt — never auto-submit |
| Max retries | Same action fails 3× | Interrupt with error context |
| Sensitive action | Payment, deletion, account changes | `humanInterrupt("Sensitive action", url)` |

## State (Chrome Storage Local)

```
Chrome Storage
├── llmProviderStore     upstream — API keys per provider
├── agentModelStore      upstream — model assignments per agent
├── settingsStore        upstream — general settings
├── chatHistoryStore     upstream — conversation sessions
├── firewallStore        upstream — URL allowlist/denylist
├── profileStore         ★ Dot — user profile data
├── resultsStore         ★ Dot — extraction results
└── uploadStore          ★ Dot — parsed file uploads (.md, .pdf → text)
```

No external database. No server. No cloud sync.
All persistence via `packages/storage/lib/` using `createStorage()`.

## File Upload Pipeline

```
 1  User clicks 📎 in ChatInput  OR  drags file onto input area
 2  FileUpload validates: .md or .pdf only, max 5MB
 3  Parse:
      .md  → FileReader.readAsText() → raw UTF-8 string
      .pdf → pdfjs-dist workerless → page.getTextContent() per page → joined text
 4  uploadStore.addFile({ id, name, type, content, size, timestamp })
 5  FileChip renders above input bar: "report.pdf · 142KB  ×"
 6  User types task + sends → task string includes "[Attached: report.pdf]"
 7  Planner receives task → sees attachment reference
 8  Planner calls list_uploaded_files → gets { id, name, type }[]
 9  Planner calls read_uploaded_file(fileId) → gets parsed text
10  Planner incorporates content into strategy
```

### Constraints
- **Accepted types**: `.md`, `.pdf` only — reject all others
- **Max per file**: 5MB
- **Max total**: 20MB across all stored uploads
- **PDF parsing**: `pdfjs-dist` in workerless mode (no web worker needed in extension context)
- **Storage**: Chrome local storage via `createStorage()` — same as all other stores
- **No binary blobs**: PDFs are parsed to text before storage, original binary is discarded
- **Cleanup**: `clearAll()` removes all uploads; individual files removable via `removeFile(id)`
