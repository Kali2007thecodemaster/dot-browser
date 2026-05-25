# CLAUDE.md — Dot Build Specification

> **Project**: Dot — Personal AI web agent (Nanobrowser fork)
> **Author**: Juan Kali — University of Regina, B.Sc. Math & CS
> **Stack**: TypeScript · React 18 · Tailwind · Vite · Puppeteer · LangChain.js · Chrome MV3
> **Upstream**: https://github.com/nanobrowser/nanobrowser (Apache 2.0)

---

## 0. Operator Rules

Non-negotiable. Follow on every task.

### 0.1 Planning
- **Before writing any code**, output a numbered plan with file paths + one-line descriptions
- Plans touching 3+ files → require human approval (`y/n`) before execution
- Plans touching config files → always require approval:
  `turbo.json`, `pnpm-workspace.yaml`, `tsconfig*`, `manifest.json`, `package.json`

### 0.2 Communication
- Bullet points over paragraphs for all reports, summaries, status updates
- One line per bullet (two max)
- Cite file paths relative to repo root: `chrome-extension/src/background/agent/planner.ts`
- Never say "I'll now..." — execute, then report what was done

### 0.3 Verification
- Never claim a feature works without proof
- Logic → run `pnpm -F <workspace> type-check`, show output
- UI → describe expected visual state after change
- Build → run `pnpm build`, confirm exit code 0
- Tests → run `pnpm -F chrome-extension test`, show pass/fail

### 0.4 Clarifying Questions
- **Ask before** implementing when:
  - Task is ambiguous about user-facing behavior
  - Two valid approaches with different tradeoffs
  - A new dependency needs to be added
  - A file rename/move/delete is involved
- **Do not ask** when:
  - Task is clear and approach is obvious
  - Answer is in this file, in upstream CLAUDE.md, or in the codebase
  - Action is read-only (list files, type-check, lint, build)

### 0.5 Git
- Atomic commits: one concern per commit
- Format: `feat(scope): description` / `fix(scope):` / `refactor(scope):`
- Present tense ("Add feature" not "Added feature")
- Scopes: `ui`, `agent`, `storage`, `workflow`, `config`, `build`
- Never commit: `dist/`, `node_modules/`, `.env`, `.env.local`
- Branch: `feat/short-description`, `fix/short-description`

### 0.6 Upstream Change Policy (from Nanobrowser CLAUDE.md)
- **Allowed without asking**: read/list files, workspace-scoped lint/format/type-check/build, small focused patches
- **Ask first**: new dependencies, file renames/moves/deletes, global/workspace config changes
- **Do not edit**: `dist/**`, `build/**`, `packages/i18n/lib/**` (generated outputs)
- **Do not modify without approval**: `turbo.json`, `pnpm-workspace.yaml`, `tsconfig*`
- **Reuse**: `packages/ui` components and `packages/tailwind-config` tokens — do not reinvent
- **Only use scripts defined in `package.json`** — do not invent new commands

### 0.7 Safety
- Never log, commit, or expose API keys
- Use `.env.local` (git-ignored) for secrets, prefix with `VITE_`
- All user data stays in Chrome local storage — no external calls except LLM providers
- No `eval()` or dynamic code execution
- Sanitize content before rendering (XSS prevention)
- Validate URLs to prevent malicious redirects

---

## 1. Project Overview

Dot is a personal fork of Nanobrowser — an open-source Chrome Extension for AI-powered web automation. It adds:

- **Custom UI theme**: Industrial brutalist + glassmorphism, 3-color palette (beige/black/burnt amber), dark mode
- **Boot ritual**: Manual "power on" before agent initialization (cost control gate)
- **Profile store**: Structured personal data for auto-filling forms
- **Workflow modules**: Pre-built parameterized task templates (job search, research, extraction, form filling)
- **Results store**: Persistent structured output from agent extractions
- **File uploads**: Attach `.md` and `.pdf` files to tasks — parsed and injected into agent context

### 1.1 Design Language

| Token | Light Mode | Dark Mode |
|-------|-----------|-----------|
| `--bg` (ground) | `#EBEBEB` | `#0C0C0C` |
| `--text` (ink) | `#1A1A1A` | `#E8E6E1` |
| `--accent` (burnt amber) | `#C45A2D` | `#D4714A` |
| `--glass` | `rgba(255,255,255,0.5)` | `rgba(24,24,22,0.6)` |
| `--glass-b` | `rgba(255,255,255,0.75)` | `rgba(255,255,255,0.05)` |
| `--line` | `rgba(0,0,0,0.09)` | `rgba(255,255,255,0.07)` |

- **Fonts**: Manrope (body), Cormorant Garamond (display headings), monospace (labels/status)
- **Glassmorphism**: `backdrop-filter: blur(20px) saturate(140%)` on all cards/bubbles
- **Labels**: `font-family: monospace; text-transform: uppercase; letter-spacing: 0.12em; font-size: 9px`
- **Agent avatars**: 28×28px, `border-radius: 6px` (squared), monospace initial

---

## 2. Architecture — The Three Layers

### Layer 1: Workflows (Orchestration)

Deterministic sequences that define task structure.

```
User input → Boot Gate → Workflow Selection → Task Template → Executor → Result
```

| Workflow | Parameters | Output |
|----------|------------|--------|
| `job-search` | `site`, `query`, `location`, `count` | `JobListing[]` → `resultsStore` |
| `research` | `topic`, `sources[]`, `depth` | Markdown summary + URLs |
| `extract` | `url`, `instruction`, `format` | Structured JSON → `resultsStore` |
| `fill-forms` | `url`, `formType` | Form filled, paused at submit (HITL) |
| `custom` | Raw task string | Agent-determined |

Workflow files: `chrome-extension/src/background/workflows/`

### Layer 2: Agents (Reasoning)

LLM-powered decision makers. Nanobrowser has **three** agents:

| Agent | Role | Source |
|-------|------|--------|
| **PlannerAgent** | Decomposes objectives into sub-tasks, generates strategy, handles replanning | `chrome-extension/src/background/agent/planner.ts` |
| **NavigatorAgent** | Executes browser actions, reads DOM state, generates action sequences | `chrome-extension/src/background/agent/navigator.ts` |
| **ValidatorAgent** | Validates task completion, checks results against objectives | `chrome-extension/src/background/agent/validator.ts` |

Agent coordination:
1. Planner receives task → generates strategy (JSON plan)
2. Navigator receives strategy → reads browser state → generates actions
3. Actions execute via Puppeteer CDP → results return to Navigator
4. **Validator** evaluates result against original objective
5. If invalid → signals Planner for replan; if valid → done

Action registry: `chrome-extension/src/background/agent/actions/builder.ts` (20+ actions)

### Layer 3: Tools (Execution)

Deterministic functions agents invoke.

**Existing browser tools** (from Nanobrowser):
- `click(elementIndex)`, `type(elementIndex, text)`, `scroll(direction, amount)`
- `goToUrl(url)`, `goBack()`, `openTab(url)`, `switchTab(tabIndex)`
- `extract(instruction)`, `waitForContent(selector)`, `done(result)`

**Custom tools** (added by Dot):
- `getProfileField(field)` — read from `profileStore`
- `saveResults(type, data)` — persist to `resultsStore`
- `humanInterrupt(reason, url)` — pause execution, prompt user
- `getWorkflowParams(workflowId)` — retrieve workflow template parameters
- `readUploadedFile(fileId)` — read parsed content from `uploadStore` by ID
- `listUploadedFiles()` — list all uploaded files with IDs, names, and types

---

## 3. Project Structure

```
dot/
├── CLAUDE.md                          # THIS FILE — Dot build spec
├── package.json                       # Root workspace config
├── pnpm-workspace.yaml               # Workspace definitions
├── turbo.json                        # Build orchestration
├── .nvmrc                            # Node version (nvm use)
├── .npmrc                            # engine-strict=true
├── .env.local                        # Secrets (VITE_*, git-ignored)
│
├── .claude/
│   └── settings.json                 # Claude Code permissions
│
├── chrome-extension/                  # Main extension
│   ├── manifest.json                 # Chrome MV3 manifest
│   ├── vite.config.mts               # Aliases: @root, @src, @assets
│   └── src/
│       └── background/
│           ├── index.ts              # Service worker entry + setupExecutor()
│           ├── agent/
│           │   ├── planner.ts        # PlannerAgent (LangChain)
│           │   ├── navigator.ts      # NavigatorAgent (LangChain)
│           │   ├── validator.ts      # ValidatorAgent (LangChain)
│           │   └── actions/
│           │       └── builder.ts    # ActionBuilder — register custom tools HERE
│           ├── browser/
│           │   ├── browser-context.ts # Multi-tab management
│           │   └── page.ts           # Puppeteer page wrapper
│           ├── llm/
│           │   └── create-chat-model.ts # LLM factory
│           └── workflows/            # ★ NEW
│               ├── index.ts
│               ├── job-search.ts
│               ├── research.ts
│               ├── extract.ts
│               └── fill-forms.ts
│
├── pages/
│   ├── side-panel/                   # ★ PRIMARY UI WORK
│   │   ├── index.html               # Font loading
│   │   ├── vite.config.mts          # Alias: @src → page src/
│   │   └── src/
│   │       ├── index.css             # ★ Theme variables, glassmorphism, dark mode
│   │       ├── App.tsx               # Boot → chat transition
│   │       └── components/
│   │           ├── BootScreen.tsx     # ★ NEW — power-on ritual
│   │           ├── WorkflowPicker.tsx # ★ NEW — workflow pills + param form
│   │           ├── ResultsCard.tsx    # ★ NEW — structured data display
│   │           ├── FileUpload.tsx     # ★ NEW — drag-drop + click file attach
│   │           ├── FileChip.tsx       # ★ NEW — attached file indicator
│   │           ├── AgentMessage.tsx   # ★ RESTYLE — glassmorphic bubbles
│   │           ├── UserMessage.tsx    # ★ RESTYLE — right-aligned bubbles
│   │           ├── StatusRow.tsx      # ★ RESTYLE — execution status
│   │           ├── ChatInput.tsx      # ★ RESTYLE — input bar + amber send + attach btn
│   │           └── TopBar.tsx         # ★ NEW — brand + dark mode toggle
│   ├── options/                      # Settings (API keys, models)
│   └── content/                      # Content script (page injection)
│
├── packages/
│   ├── storage/lib/
│   │   ├── profileStore.ts           # ★ NEW — user profile data
│   │   ├── resultsStore.ts           # ★ NEW — extraction results
│   │   └── uploadStore.ts            # ★ NEW — parsed file uploads
│   ├── shared/                       # Common utilities
│   ├── ui/                           # Shared React components (REUSE)
│   ├── schema-utils/                 # Validation schemas
│   ├── tailwind-config/              # ★ EXTEND — add 3-color palette
│   ├── i18n/                         # Internationalization (DO NOT EDIT lib/**)
│   ├── vite-config/                  # withPageConfig helper
│   ├── dev-utils/                    # Dev utilities
│   ├── hmr/                          # Hot module reload
│   ├── tsconfig/                     # Shared TS configs
│   └── zipper/                       # Distribution zip tool
│
└── docs/                             # ★ NEW
    ├── DESIGN-SYSTEM.md
    ├── WORKFLOWS.md
    └── ARCHITECTURE.md
```

### 3.1 Legend

| Symbol | Meaning |
|--------|---------|
| ★ NEW | Files we create from scratch |
| ★ RESTYLE | Existing files — CSS/layout changes only |
| ★ EXTEND | Existing files — additive config changes |
| (none) | Upstream Nanobrowser — do not modify unless necessary |

### 3.2 Vite Aliases (from upstream)

| Workspace | Alias | Points to |
|-----------|-------|-----------|
| `chrome-extension` | `@root` | extension root |
| `chrome-extension` | `@src` | `chrome-extension/src/` |
| `chrome-extension` | `@assets` | `chrome-extension/assets/` |
| `pages/*` | `@src` | page's `src/` directory |

Use `packages/vite-config`'s `withPageConfig` for page workspaces.

---

## 4. Build Phases

### Phase 1: Foundation (Day 1)
**Goal**: Fork running, dev environment verified

- [ ] Clone nanobrowser → `dot`
- [ ] `nvm use` → verify Node version matches `.nvmrc`
- [ ] `pnpm install` → clean install (engine-strict enforced)
- [ ] `pnpm dev` → hot-reload builds, no errors
- [ ] Load `dist/` as unpacked extension in Chrome
- [ ] Configure one API key via extension options page
- [ ] Test: "Go to Hacker News and extract top 5 titles"
- [ ] Verify all 3 agents (Planner → Navigator → Validator) execute

**Verify**: Side panel shows completed task with extracted results

### Phase 2: Theme Foundation (Day 2–3)
**Goal**: Three-tone brutalist glassmorphism on side panel

- [ ] Add Google Fonts to `pages/side-panel/index.html` (Manrope + Cormorant Garamond)
- [ ] Create CSS variables in `pages/side-panel/src/index.css`
  - Light mode + dark mode (`[data-theme="dark"]`)
  - Glass utility classes (`.glass`, `.glass-card`, `.glass-input`)
  - Monospace label utility (`.label-mono`)
- [ ] Extend `packages/tailwind-config/` with named tokens: `ground`, `ink`, `amber`
- [ ] Build `TopBar.tsx` — amber square mark + "DOT" brand + dark toggle + live dot
- [ ] `pnpm -F pages/side-panel type-check` → pass
- [ ] `pnpm -F pages/side-panel build` → exit 0

**Verify**: Side panel renders with new theme, both light/dark modes

### Phase 3: Boot Ritual + Chat Restyle (Day 4–5)
**Goal**: Power-on gate + restyled messages

- [ ] Build `BootScreen.tsx` — tag pill → Cormorant heading → subtitle → ⏻ button
- [ ] ⏻ click triggers `setupExecutor()` message to background service worker
- [ ] Transition: fade boot → fade in chat + input bar
- [ ] Restyle `AgentMessage.tsx` — glassmorphic bubbles, squared avatars, monospace labels
- [ ] Restyle `UserMessage.tsx` — solid `--text` bg, `--bg` text, sharp bottom-right
- [ ] Restyle `StatusRow.tsx` — left amber border, pulsing dot, monospace status
- [ ] Restyle `ChatInput.tsx` — glassmorphic input, solid amber send button, attach (📎) button
- [ ] Build `FileUpload.tsx` — hidden `<input type="file" accept=".md,.pdf">`, triggered by attach button
  - Drag-and-drop zone: `ChatInput` wrapper accepts dropped `.md`/`.pdf` files
  - On file select: parse content, store via `uploadStore.addFile()`, show `FileChip`
  - PDF parsing: use `pdfjs-dist` to extract text (add as dependency — ask first)
  - MD parsing: read as UTF-8 text, store raw
  - Validation: reject files > 5MB, reject non `.md`/`.pdf`, show error in `StatusRow`
- [ ] Build `FileChip.tsx` — displays attached file name + size + remove (×) button
  - Renders above input bar when files are attached
  - Monospace 9px, `var(--ln)` border, `var(--gl)` bg, 4px radius
  - Remove button: `var(--mu)` color, clears from `uploadStore`
- [ ] `pnpm -F pages/side-panel type-check && pnpm -F pages/side-panel build`

**Verify**: Boot screen → click power → chat with styled messages

### Phase 4: Storage Layer (Day 6)
**Goal**: Profile, results, and upload stores operational

- [ ] Create `packages/storage/lib/profileStore.ts`
  - Interface: `ProfileData { name, email, phone, location, education[], experience[], skills[], links{} }`
  - Uses `createStorage()` with `StorageEnum.Local`
- [ ] Create `packages/storage/lib/resultsStore.ts`
  - Interface: `SavedResult { id, type, data, source, timestamp }`
  - Array storage with append/query helpers
- [ ] Create `packages/storage/lib/uploadStore.ts`
  - Interface: `UploadedFile { id, name, type: 'md'|'pdf', content, size, timestamp }`
  - `.md` files: stored as raw text (no parsing needed)
  - `.pdf` files: parsed to text via `pdf.js` (pdfjs-dist) before storage
  - Max file size: 5MB per file, 20MB total across all uploads
  - Helpers: `addFile()`, `removeFile()`, `getFile(id)`, `listFiles()`, `clearAll()`
- [ ] Export all from `packages/storage/lib/index.ts`
- [ ] `pnpm -F packages/storage type-check` → pass

**Verify**: Import stores, read/write round-trip succeeds for all three

### Phase 5: Custom Tools (Day 7–8)
**Goal**: Six new actions in Navigator's action registry

- [ ] `get_profile_field` — schema: `z.object({ field: z.string() })`, reads `profileStore`
- [ ] `save_results` — schema: `z.object({ type: z.enum([...]), data: z.string() })`, writes `resultsStore`
- [ ] `human_interrupt` — schema: `z.object({ reason: z.string(), url: z.string() })`, pauses executor
- [ ] `get_workflow_params` — schema: `z.object({ workflowId: z.string() })`, reads workflow registry
- [ ] `read_uploaded_file` — schema: `z.object({ fileId: z.string() })`, reads parsed content from `uploadStore`
- [ ] `list_uploaded_files` — schema: `z.object({})`, returns `{ id, name, type }[]` from `uploadStore`
- [ ] All registered in `chrome-extension/src/background/agent/actions/builder.ts`
- [ ] `pnpm -F chrome-extension type-check` → pass

**Verify**: Actions appear in Navigator's available action list

### Phase 6: Workflow Templates (Day 8–9)
**Goal**: Four workflows + picker UI

- [ ] Create workflow registry: `chrome-extension/src/background/workflows/index.ts`
- [ ] Create `job-search.ts`, `research.ts`, `extract.ts`, `fill-forms.ts`
- [ ] Build `WorkflowPicker.tsx` — pills that expand to param form
- [ ] Wire workflow → executor via Chrome messaging
- [ ] Add i18n keys following `component_category_specificAction_state` pattern
- [ ] `pnpm -F chrome-extension type-check && pnpm -F pages/side-panel build`

**Verify**: Select "Job search" → params → task dispatched → agent executes

### Phase 7: Results Display (Day 10)
**Goal**: Extraction data renders inline in chat

- [ ] Build `ResultsCard.tsx` — glass card, amber badge, hoverable rows, stats bar
- [ ] Wire `save_results` action → side panel message → renders card
- [ ] Add "Results" tab for browsing saved results
- [ ] `pnpm -F pages/side-panel type-check && build`

**Verify**: Job search completes → results card renders with clickable rows

### Phase 8: Polish + Ship (Day 11–12)
**Goal**: Production-ready extension

- [ ] Transitions: `.4s cubic-bezier(.2,1,.3,1)` on interactive elements
- [ ] Ambient gradients (accent-glass radial, 6% opacity)
- [ ] Scrollbar styling (thin, glass-themed)
- [ ] `docs/DESIGN-SYSTEM.md`, `docs/WORKFLOWS.md`, `docs/ARCHITECTURE.md`
- [ ] Update `manifest.json`: name → "Dot", version → "0.1.0"
- [ ] Update extension icons (amber dot mark)
- [ ] Full build: `pnpm build` → exit 0
- [ ] Distribution: `pnpm zip` → `dist-zip/`
- [ ] E2E: `pnpm e2e` (if applicable)
- [ ] Clean install test from zip in fresh Chrome profile

**Verify**: Full job search workflow succeeds end-to-end

---

## 5. Development Commands

```bash
# Install
pnpm install

# Development (hot-reload)
pnpm dev

# Production build
pnpm build

# Workspace-scoped (PREFER THESE — faster)
pnpm -F pages/side-panel build
pnpm -F chrome-extension type-check
pnpm -F packages/storage type-check
pnpm -F pages/side-panel lint -- src/components/BootScreen.tsx
pnpm -F chrome-extension prettier -- src/background/index.ts

# Tests
pnpm -F chrome-extension test
pnpm -F chrome-extension test -- -t "ProfileStore"

# E2E (builds + zips first)
pnpm e2e

# Distribution
pnpm zip                    # → dist-zip/

# Cleaning
pnpm clean                  # all artifacts + node_modules
pnpm clean:bundle           # just build outputs
pnpm clean:turbo            # Turbo state/cache
pnpm clean:node_modules     # deps only
pnpm clean:install          # clean + reinstall

# Version
pnpm update-version
```

**Always use `pnpm`** — `.npmrc` enforces `engine-strict=true`.
**Only use scripts in `package.json`** — never invent new commands.

---

## 6. Code Style (from upstream)

- Prettier: 2 spaces, semicolons, single quotes, trailing commas, `printWidth: 120`
- ESLint: React/Hooks/Import/A11y + TypeScript
- Components: `PascalCase` | Variables/functions: `camelCase` | Directories: `kebab-case`
- Type imports: `import type { X } from '...'` (enforced: `@typescript-eslint/consistent-type-imports`)
- Run `pnpm type-check` before committing
- Run `pnpm lint` to maintain style consistency

---

## 7. i18n (from upstream)

### Key Naming Convention: `component_category_specificAction_state`

| Prefix | Component |
|--------|-----------|
| `bg_` | Background service worker |
| `exec_` | Executor/agent lifecycle |
| `act_` | Agent actions |
| `chat_` | Chat interface |
| `nav_` | Navigation |
| `dot_` | Dot-specific features (★ NEW) |

| Suffix | State |
|--------|-------|
| `_start` | Action beginning |
| `_ok` | Success |
| `_fail` | Failure |
| `_cancel` | Cancelled |
| `_pause` | Paused |

```typescript
import { t } from '@extension/i18n';
t('dot_boot_powerOn_start')
t('dot_workflow_jobSearch_ok', ['10', 'Indeed'])
```

- Edit source locale JSON in `packages/i18n/locales/**`
- **Never edit** generated files under `packages/i18n/lib/**`

---

## 8. VS Code Setup

### 8.1 Prerequisites

```bash
nvm install 22 && nvm use 22       # Node (match .nvmrc)
npm install -g pnpm                 # Package manager
npm install -g @anthropic-ai/claude-code  # Claude Code CLI
```

### 8.2 Clone + Configure

```bash
git clone https://github.com/nanobrowser/nanobrowser.git dot
cd dot
# Drop in: CLAUDE.md, .claude/settings.json, docs/*.md
```

### 8.3 VS Code Extension

1. `Ctrl+Shift+X` → search "Claude Code" → install from **Anthropic**
2. Click **⚡ Spark icon** → sign in
3. Requires: Claude Pro ($20/mo) or Max ($100/mo) or API credits

### 8.4 First Prompt

```
@CLAUDE.md

Read this file completely. Confirm by listing:
1. The 3-color palette hex values
2. The 8 build phases
3. The 3 upstream agents (Planner, Navigator, Validator)
4. The 4 custom tools to register

Then execute Phase 1: Foundation.
Show plan first. Use /plan mode.
```

### 8.5 Workflow: Plan → Review → Execute → Verify

1. Prompt: "Execute Phase N. Show plan first."
2. Review: numbered steps with file paths → approve `y`
3. Execute: inline diffs in VS Code
4. Accept/Reject each diff
5. Verify: `pnpm -F <workspace> type-check` → pass
6. Commit: `feat(scope): description`

### 8.6 Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+P` → "Claude Code: Open" | Open panel |
| `@filename` | Attach file to context |
| `/plan` | Plan mode (review before execute) |
| `/compact` | Compact conversation (save context) |
| `/permissions` | View permission rules |

---

## 9. Resources

| Resource | URL |
|----------|-----|
| Nanobrowser upstream | https://github.com/nanobrowser/nanobrowser |
| Nanobrowser DeepWiki | https://deepwiki.com/nanobrowser/nanobrowser |
| Chrome MV3 docs | https://developer.chrome.com/docs/extensions/mv3/ |
| LangChain.js | https://js.langchain.com/ |
| Puppeteer | https://pptr.dev/ |
| Tailwind CSS | https://tailwindcss.com/docs |
| Vite | https://vitejs.dev/ |
| Zod | https://zod.dev/ |
| Chrome Storage API | https://developer.chrome.com/docs/extensions/reference/storage/ |
| Claude Code best practices | https://code.claude.com/docs/en/best-practices |
| Claude Code permissions | https://code.claude.com/docs/en/permissions |
| Agentic workflow patterns | https://www.patronus.ai/ai-agent-development/agentic-workflow |

---

## 10. File Manifest

### New Files (19)
```
.claude/settings.json
docs/DESIGN-SYSTEM.md
docs/WORKFLOWS.md
docs/ARCHITECTURE.md
pages/side-panel/src/components/BootScreen.tsx
pages/side-panel/src/components/WorkflowPicker.tsx
pages/side-panel/src/components/ResultsCard.tsx
pages/side-panel/src/components/FileUpload.tsx
pages/side-panel/src/components/FileChip.tsx
pages/side-panel/src/components/TopBar.tsx
pages/side-panel/src/components/StatusRow.tsx
chrome-extension/src/background/workflows/index.ts
chrome-extension/src/background/workflows/job-search.ts
chrome-extension/src/background/workflows/research.ts
chrome-extension/src/background/workflows/extract.ts
chrome-extension/src/background/workflows/fill-forms.ts
packages/storage/lib/profileStore.ts
packages/storage/lib/resultsStore.ts
packages/storage/lib/uploadStore.ts
```

### Modified Files (8)
```
pages/side-panel/index.html              → Google Fonts
pages/side-panel/src/index.css            → theme + glass utilities
pages/side-panel/src/App.tsx              → boot → chat transition
pages/side-panel/src/components/AgentMessage.tsx  → restyle
pages/side-panel/src/components/ChatInput.tsx     → restyle
chrome-extension/src/background/agent/actions/builder.ts → 4 custom actions
packages/storage/lib/index.ts             → export new stores
packages/tailwind-config/...              → extend palette
chrome-extension/manifest.json            → name: "Dot", version: "0.1.0"
```

### Untouched
Everything else — preserves upstream mergeability.
