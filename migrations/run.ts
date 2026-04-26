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
    await sql(sqlText);
    process.stdout.write('OK\n');
    applied += 1;
  } catch (err: unknown) {
    const message: string = err instanceof Error ? err.message : String(err);
    process.stderr.write(`error in ${filename}: ${message}\n`);
    process.exit(1);
  }
}

process.stdout.write(`migrations applied: ${applied}\n`);
process.exit(0);
