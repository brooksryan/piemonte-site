import { neon } from '@neondatabase/serverless';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SqlClient = ReturnType<typeof neon>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DB_UNAVAILABLE_MESSAGE = 'database not configured (DATABASE_URL missing)';

// ---------------------------------------------------------------------------
// Lazy memoized client
// ---------------------------------------------------------------------------

let _sql: SqlClient | null = null;
let _initialized = false;

export function getSql(): SqlClient | null {
  if (_initialized) return _sql;
  _initialized = true;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn(`[db] ${DB_UNAVAILABLE_MESSAGE}`);
    _sql = null;
  } else {
    _sql = neon(url);
  }
  return _sql;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// ---------------------------------------------------------------------------
// Tagged-template helper
// ---------------------------------------------------------------------------

export async function dbExec<T = unknown>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  const sql = getSql();
  if (sql === null) {
    throw new Error(DB_UNAVAILABLE_MESSAGE);
  }
  // neon's HTTP client supports tagged-template usage and returns rows as T[]
  const rows = await (sql as any)(strings, ...values);
  return rows as T[];
}
