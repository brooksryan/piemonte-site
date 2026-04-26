import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const databaseUrl: string | undefined = process.env.DATABASE_URL;

if (!databaseUrl) {
  process.stderr.write('error: DATABASE_URL is not set in the environment\n');
  process.exit(1);
}

const sql = neon(databaseUrl);

const migrationsDir: string = fileURLToPath(new URL('.', import.meta.url));
const migrationPattern = /^\d+_.*\.sql$/;

function splitSqlStatements(sqlText: string): string[] {
  // Strip line comments (-- ...) before splitting. Naive splitter: assumes
  // migration files do not contain string literals with embedded semicolons.
  const withoutLineComments: string = sqlText
    .split('\n')
    .map((line: string): string => {
      const idx: number = line.indexOf('--');
      return idx === -1 ? line : line.slice(0, idx);
    })
    .join('\n');

  return withoutLineComments
    .split(';')
    .map((chunk: string): string => chunk.trim())
    .filter((chunk: string): boolean => chunk.length > 0);
}

const entries: string[] = await readdir(migrationsDir);
const migrations: string[] = entries
  .filter((name: string): boolean => migrationPattern.test(name))
  .sort((a: string, b: string): number => a.localeCompare(b));

let applied = 0;

for (const filename of migrations) {
  const fullPath: string = join(migrationsDir, filename);
  process.stdout.write(`${filename}\n`);

  try {
    const sqlText: string = await readFile(fullPath, 'utf8');
    const statements: string[] = splitSqlStatements(sqlText);

    const sqlAny = sql as unknown as {
      transaction?: (queries: unknown[]) => Promise<unknown>;
    };

    if (typeof sqlAny.transaction === 'function') {
      await sqlAny.transaction(statements.map((s: string): unknown => sql(s)));
    } else {
      console.warn(
        '[migration] running statements non-atomically (transaction helper unavailable)',
      );
      for (const stmt of statements) {
        await sql(stmt);
      }
    }

    console.log(`OK (${statements.length} statements)`);
    applied += 1;
  } catch (err: unknown) {
    const message: string = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error in ${filename}: ${message}\n`);
    process.exit(1);
  }
}

process.stdout.write(`migrations applied: ${applied}\n`);
process.exit(0);
