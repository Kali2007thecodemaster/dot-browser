import { notionStore } from '@extension/storage';
import { createLogger } from '../log';

const logger = createLogger('NotionClient');

/**
 * Notion REST API client for the background service worker.
 *
 * Phase 1 surface — just enough to validate connectivity and list databases.
 * Phase 2 will add full CRUD on databases and pages.
 *
 * Security:
 *   - Token comes from notionStore (chrome.storage.local). Never accepted as an argument.
 *   - Token is never logged, never serialized into errors that bubble to the chat.
 *   - All requests go through this client so the token has exactly one egress path.
 */

const NOTION_API_BASE = 'https://api.notion.com/v1';
// Notion API version. Pinning this here so a breaking change in their API
// doesn't silently change our request shape.
const NOTION_VERSION = '2022-06-28';

export interface NotionUser {
  id: string;
  name?: string;
  avatar_url?: string | null;
  type?: 'person' | 'bot';
  person?: { email?: string };
  bot?: { workspace_name?: string; owner?: { type: string } };
}

export interface NotionSearchResult {
  object: 'list';
  results: Array<{
    object: 'page' | 'database';
    id: string;
    properties?: Record<string, unknown>;
    title?: Array<{ plain_text: string }>;
    url?: string;
    archived?: boolean;
    parent?: { type: string; page_id?: string; database_id?: string; workspace?: boolean };
  }>;
  has_more: boolean;
  next_cursor: string | null;
}

export class NotionAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionAuthError';
  }
}

export class NotionNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotionNotFoundError';
  }
}

export class NotionRateLimitError extends Error {
  constructor(
    message: string,
    public retryAfterMs: number,
  ) {
    super(message);
    this.name = 'NotionRateLimitError';
  }
}

export class NotionRequestError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = 'NotionRequestError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Override token (used by `testConnection` so the user can validate before saving). */
  overrideToken?: string;
}

export class NotionClient {
  /**
   * Resolve the token from storage. Throws NotionAuthError if not configured.
   */
  private async resolveToken(override?: string): Promise<string> {
    if (override) return override;
    const token = await notionStore.getToken();
    if (!token) {
      throw new NotionAuthError('Notion is not connected. Open Dot settings → Notion to add your integration token.');
    }
    return token;
  }

  /**
   * Low-level fetch with auth header, Notion-Version, error normalization, and
   * a single retry on 429 (rate limit) honoring the Retry-After header.
   */
  private async request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    const token = await this.resolveToken(opts.overrideToken);
    const url = `${NOTION_API_BASE}${path}`;
    const method = opts.method ?? 'GET';
    const init: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json',
      },
    };
    if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

    logger.info(`${method} ${path}`);
    let res = await fetch(url, init);

    // Rate-limited — wait once and retry.
    if (res.status === 429) {
      const retryAfter = Number.parseFloat(res.headers.get('Retry-After') || '1');
      const waitMs = Math.min(Math.max(retryAfter * 1000, 500), 10_000);
      logger.warning(`Rate-limited; retrying after ${waitMs}ms`);
      await new Promise(r => setTimeout(r, waitMs));
      res = await fetch(url, init);
      if (res.status === 429) {
        throw new NotionRateLimitError('Notion rate limit exceeded; try again in a moment.', waitMs);
      }
    }

    if (res.ok) {
      return (await res.json()) as T;
    }

    // Try to read Notion's structured error body.
    let code: string | undefined;
    let messageFromBody: string | undefined;
    try {
      const body = (await res.json()) as { code?: string; message?: string };
      code = body.code;
      messageFromBody = body.message;
    } catch {
      /* not JSON; fall through */
    }
    const niceMsg = messageFromBody || `Notion API ${res.status} ${res.statusText}`;

    if (res.status === 401) {
      throw new NotionAuthError(
        'Notion rejected the integration token. Open Settings → Notion and re-enter or regenerate it.',
      );
    }
    if (res.status === 403) {
      throw new NotionAuthError(
        'Notion returned 403 — the integration does not have access to this page or database. In Notion, open the page and use Share → Add connections to grant access.',
      );
    }
    if (res.status === 404) {
      throw new NotionNotFoundError(niceMsg);
    }
    throw new NotionRequestError(niceMsg, res.status, code);
  }

  // ----- Phase 1 endpoints -----

  /**
   * GET /users/me — verifies the token works. Used by the settings UI before save.
   */
  async getMe(overrideToken?: string): Promise<NotionUser> {
    return this.request<NotionUser>('/users/me', { overrideToken });
  }

  /**
   * Quick test-connection wrapper. Returns a friendly summary or throws.
   */
  async testConnection(overrideToken?: string): Promise<{ workspace: string; bot: string }> {
    const me = await this.getMe(overrideToken);
    return {
      workspace: me.bot?.workspace_name || 'Unknown workspace',
      bot: me.name || me.id,
    };
  }

  /**
   * POST /search — list pages/databases the integration can see.
   */
  async search(
    opts: { query?: string; filterType?: 'page' | 'database'; pageSize?: number } = {},
  ): Promise<NotionSearchResult> {
    const body: Record<string, unknown> = {
      page_size: Math.min(Math.max(opts.pageSize ?? 25, 1), 100),
    };
    if (opts.query) body.query = opts.query;
    if (opts.filterType) body.filter = { value: opts.filterType, property: 'object' };
    return this.request<NotionSearchResult>('/search', { method: 'POST', body });
  }

  // ----- Phase 2 endpoints -----

  /** GET /databases/{id} — retrieve schema. */
  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    return this.request<NotionDatabase>(`/databases/${normalizeId(databaseId)}`);
  }

  /** POST /databases/{id}/query — read rows. */
  async queryDatabase(
    databaseId: string,
    opts: { filter?: unknown; sorts?: unknown[]; pageSize?: number; startCursor?: string } = {},
  ): Promise<NotionQueryResult> {
    const body: Record<string, unknown> = {
      page_size: Math.min(Math.max(opts.pageSize ?? 25, 1), 100),
    };
    if (opts.filter) body.filter = opts.filter;
    if (opts.sorts) body.sorts = opts.sorts;
    if (opts.startCursor) body.start_cursor = opts.startCursor;
    return this.request<NotionQueryResult>(`/databases/${normalizeId(databaseId)}/query`, {
      method: 'POST',
      body,
    });
  }

  /** GET /pages/{id} — retrieve a single page's properties + metadata. */
  async getPage(pageId: string): Promise<NotionPage> {
    return this.request<NotionPage>(`/pages/${normalizeId(pageId)}`);
  }

  /**
   * POST /databases — create a database under a parent page.
   * `schemaSpec` is the friendly property spec (see SchemaSpec); we coerce to Notion shape.
   */
  async createDatabase(parentPageId: string, title: string, schemaSpec: SchemaSpec): Promise<NotionDatabase> {
    const properties = buildNotionSchema(schemaSpec);
    return this.request<NotionDatabase>('/databases', {
      method: 'POST',
      body: {
        parent: { type: 'page_id', page_id: normalizeId(parentPageId) },
        title: [{ type: 'text', text: { content: title } }],
        properties,
      },
    });
  }

  /**
   * POST /pages — create a page (row) inside a database.
   * Pass `values` as a flat field map; we coerce using the live database schema.
   */
  async createPage(databaseId: string, values: Record<string, unknown>): Promise<NotionPage> {
    const dbId = normalizeId(databaseId);
    const db = await this.getDatabase(dbId);
    const properties = coerceValuesUsingSchema(values, db.properties);
    return this.request<NotionPage>('/pages', {
      method: 'POST',
      body: {
        parent: { database_id: dbId },
        properties,
      },
    });
  }

  /**
   * PATCH /pages/{id} — update properties of an existing page.
   * `databaseId` is required so we can coerce by schema. (Without it we'd have to
   * fetch the page first to learn its parent — extra round-trip.)
   */
  async updatePage(pageId: string, databaseId: string, values: Record<string, unknown>): Promise<NotionPage> {
    const db = await this.getDatabase(normalizeId(databaseId));
    const properties = coerceValuesUsingSchema(values, db.properties);
    return this.request<NotionPage>(`/pages/${normalizeId(pageId)}`, {
      method: 'PATCH',
      body: { properties },
    });
  }

  /** PATCH /pages/{id} with { archived: true } — soft-delete a row. */
  async archivePage(pageId: string): Promise<NotionPage> {
    return this.request<NotionPage>(`/pages/${normalizeId(pageId)}`, {
      method: 'PATCH',
      body: { archived: true },
    });
  }

  /** PATCH /databases/{id} with { archived: true } — soft-delete a database. */
  async archiveDatabase(databaseId: string): Promise<NotionDatabase> {
    return this.request<NotionDatabase>(`/databases/${normalizeId(databaseId)}`, {
      method: 'PATCH',
      body: { archived: true },
    });
  }
}

// ----- Phase 2 types + helpers -----

export interface NotionDatabaseProperty {
  id: string;
  name: string;
  type: string;
  // Each type has its own config under a property keyed by `type` — we keep it loose.
  [key: string]: unknown;
}

export interface NotionDatabase {
  object: 'database';
  id: string;
  title?: Array<{ plain_text: string }>;
  properties: Record<string, NotionDatabaseProperty>;
  url?: string;
  archived?: boolean;
  parent?: { type: string; page_id?: string; workspace?: boolean };
}

export interface NotionPage {
  object: 'page';
  id: string;
  properties: Record<string, unknown>;
  url?: string;
  archived?: boolean;
  parent?: { type: string; database_id?: string };
}

export interface NotionQueryResult {
  object: 'list';
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}

/**
 * Friendly property-spec shorthand the agent uses when creating a database.
 *
 *   { Title: 'title', Company: 'text', Status: { type: 'select', options: ['a','b'] } }
 *
 * String shorthand maps:
 *   'title'       -> { title: {} }
 *   'text'/'rich_text' -> { rich_text: {} }
 *   'number'      -> { number: { format: 'number' } }
 *   'url'         -> { url: {} }
 *   'email'       -> { email: {} }
 *   'phone'/'phone_number' -> { phone_number: {} }
 *   'date'        -> { date: {} }
 *   'checkbox'    -> { checkbox: {} }
 *
 * Object shorthand:
 *   { type: 'select', options: ['a','b'] }       -> select with named options
 *   { type: 'multi_select', options: ['a','b'] } -> multi_select with named options
 *   { type: 'number', format: 'dollar' }         -> formatted number
 */
export type SchemaSpec = Record<string, string | { type: string; options?: string[]; format?: string }>;

export function buildNotionSchema(spec: SchemaSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  // Every Notion DB needs exactly one title property; if the caller forgot, force the
  // first key to be title-typed.
  const keys = Object.keys(spec);
  if (keys.length === 0) {
    throw new Error('Schema must have at least one property');
  }
  const hasTitle = keys.some(k => {
    const v = spec[k];
    return typeof v === 'string' ? v === 'title' : v.type === 'title';
  });
  if (!hasTitle) {
    out[keys[0]] = { title: {} };
  }
  for (const key of keys) {
    if (!hasTitle && key === keys[0]) continue; // already added as title above
    const v = spec[key];
    out[key] = coercePropertyTypeSpec(v);
  }
  return out;
}

function coercePropertyTypeSpec(
  v: string | { type: string; options?: string[]; format?: string },
): Record<string, unknown> {
  if (typeof v === 'string') {
    switch (v) {
      case 'title':
        return { title: {} };
      case 'text':
      case 'rich_text':
        return { rich_text: {} };
      case 'number':
        return { number: { format: 'number' } };
      case 'url':
        return { url: {} };
      case 'email':
        return { email: {} };
      case 'phone':
      case 'phone_number':
        return { phone_number: {} };
      case 'date':
        return { date: {} };
      case 'checkbox':
        return { checkbox: {} };
      default:
        // Unknown shorthand falls back to rich_text so the DB still creates.
        return { rich_text: {} };
    }
  }
  const opts = v.options ?? [];
  switch (v.type) {
    case 'title':
      return { title: {} };
    case 'rich_text':
    case 'text':
      return { rich_text: {} };
    case 'number':
      return { number: { format: v.format ?? 'number' } };
    case 'select':
      return { select: { options: opts.map(name => ({ name })) } };
    case 'multi_select':
      return { multi_select: { options: opts.map(name => ({ name })) } };
    case 'status':
      // Notion's status type has a more complex internal structure; for simplicity
      // we treat it as a select on create.
      return { select: { options: opts.map(name => ({ name })) } };
    case 'date':
      return { date: {} };
    case 'checkbox':
      return { checkbox: {} };
    case 'url':
      return { url: {} };
    case 'email':
      return { email: {} };
    case 'phone':
    case 'phone_number':
      return { phone_number: {} };
    default:
      return { rich_text: {} };
  }
}

/**
 * Map a flat `{ fieldName: value }` payload into Notion's wire format using a live
 * database schema. Drops fields not present in the schema (with a warning log).
 */
export function coerceValuesUsingSchema(
  values: Record<string, unknown>,
  schema: Record<string, NotionDatabaseProperty>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(values)) {
    if (value === undefined || value === null) continue;
    const prop = schema[field];
    if (!prop) {
      logger.warning(`Dropping unknown field "${field}" — not in database schema`);
      continue;
    }
    out[field] = coerceValueByType(prop.type, value);
  }
  return out;
}

function coerceValueByType(type: string, value: unknown): unknown {
  switch (type) {
    case 'title':
      return { title: [{ type: 'text', text: { content: String(value) } }] };
    case 'rich_text':
      return { rich_text: [{ type: 'text', text: { content: String(value) } }] };
    case 'number':
      return { number: typeof value === 'number' ? value : Number(value) };
    case 'select':
      return { select: value == null ? null : { name: String(value) } };
    case 'status':
      return { status: value == null ? null : { name: String(value) } };
    case 'multi_select': {
      const arr = Array.isArray(value) ? value : [value];
      return { multi_select: arr.map(v => ({ name: String(v) })) };
    }
    case 'date': {
      // Accept "YYYY-MM-DD", ISO datetime, or { start, end }
      if (typeof value === 'string') return { date: { start: value } };
      if (typeof value === 'object' && value !== null) {
        const v = value as { start?: string; end?: string };
        if (v.start) return { date: { start: v.start, end: v.end ?? null } };
      }
      return { date: null };
    }
    case 'checkbox':
      return { checkbox: Boolean(value) };
    case 'url':
      return { url: String(value) };
    case 'email':
      return { email: String(value) };
    case 'phone_number':
      return { phone_number: String(value) };
    case 'people': {
      // Expect array of user IDs.
      const arr = Array.isArray(value) ? value : [value];
      return { people: arr.map(id => ({ object: 'user', id: String(id) })) };
    }
    case 'relation': {
      const arr = Array.isArray(value) ? value : [value];
      return { relation: arr.map(id => ({ id: String(id) })) };
    }
    default:
      // Unknown type — best effort as rich_text.
      return { rich_text: [{ type: 'text', text: { content: String(value) } }] };
  }
}

/**
 * Notion accepts IDs with or without dashes. We pass through as-is — the strip happens
 * only when we want to log a short form. (Kept as a helper for future use.)
 */
function normalizeId(id: string): string {
  return id.trim();
}

/**
 * Project a Notion page's `properties` object into a flat `{ fieldName: scalarOrArray }`
 * shape that's easy for the agent to render in chat or feed to other tools.
 */
export function flattenPageProperties(page: NotionPage): Record<string, unknown> {
  const out: Record<string, unknown> = { _id: page.id, _url: page.url };
  for (const [name, raw] of Object.entries(page.properties || {})) {
    const p = raw as { type?: string; [k: string]: unknown };
    if (!p || !p.type) continue;
    switch (p.type) {
      case 'title':
        out[name] = Array.isArray(p.title)
          ? (p.title as Array<{ plain_text: string }>).map(t => t.plain_text).join('')
          : '';
        break;
      case 'rich_text':
        out[name] = Array.isArray(p.rich_text)
          ? (p.rich_text as Array<{ plain_text: string }>).map(t => t.plain_text).join('')
          : '';
        break;
      case 'number':
        out[name] = p.number ?? null;
        break;
      case 'select':
        out[name] = (p.select as { name?: string } | null)?.name ?? null;
        break;
      case 'status':
        out[name] = (p.status as { name?: string } | null)?.name ?? null;
        break;
      case 'multi_select':
        out[name] = Array.isArray(p.multi_select) ? (p.multi_select as Array<{ name: string }>).map(t => t.name) : [];
        break;
      case 'date': {
        const d = p.date as { start?: string; end?: string } | null;
        out[name] = d ? (d.end ? `${d.start} — ${d.end}` : d.start) : null;
        break;
      }
      case 'checkbox':
        out[name] = Boolean(p.checkbox);
        break;
      case 'url':
        out[name] = (p.url as string) ?? null;
        break;
      case 'email':
        out[name] = (p.email as string) ?? null;
        break;
      case 'phone_number':
        out[name] = (p.phone_number as string) ?? null;
        break;
      case 'people':
        out[name] = Array.isArray(p.people)
          ? (p.people as Array<{ id: string; name?: string }>).map(u => u.name ?? u.id)
          : [];
        break;
      case 'relation':
        out[name] = Array.isArray(p.relation) ? (p.relation as Array<{ id: string }>).map(r => r.id) : [];
        break;
      case 'created_time':
      case 'last_edited_time':
        out[name] = p[p.type] ?? null;
        break;
      default:
        // Skip property types we don't surface (formula, rollup, files, etc.) — the
        // agent can fetch the raw page if it needs them.
        break;
    }
  }
  return out;
}

/** Singleton — one client across the service worker. */
export const notionClient = new NotionClient();

/**
 * Extract a human-readable title from a search result row (handles both page and
 * database shapes — Notion stores them differently).
 */
export function extractNotionTitle(row: NotionSearchResult['results'][number]): string {
  // Database: top-level `title` array of rich-text objects.
  if (row.object === 'database' && Array.isArray(row.title)) {
    return row.title.map(t => t.plain_text).join('') || '(untitled)';
  }
  // Page: properties contain a `title`-typed property; find and join it.
  if (row.object === 'page' && row.properties) {
    for (const value of Object.values(row.properties)) {
      const v = value as { type?: string; title?: Array<{ plain_text: string }> };
      if (v.type === 'title' && Array.isArray(v.title)) {
        return v.title.map(t => t.plain_text).join('') || '(untitled)';
      }
    }
  }
  return '(untitled)';
}
