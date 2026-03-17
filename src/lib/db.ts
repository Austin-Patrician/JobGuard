// @ts-expect-error -- no @types/pg installed
import { Pool } from "pg";

type GlobalWithPg = typeof globalThis & {
  __jobguardPgPool?: Pool;
};

function buildSslConfig() {
  const sslMode = process.env.PGSSLMODE;
  const sslFlag = process.env.PGSSL;
  if (sslMode === "require" || sslFlag === "true") {
    return { rejectUnauthorized: false };
  }
  return undefined;
}

export function getDbPool(): Pool {
  const globalForPg = globalThis as GlobalWithPg;
  if (!globalForPg.__jobguardPgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    globalForPg.__jobguardPgPool = new Pool({
      connectionString,
      ssl: buildSslConfig(),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return globalForPg.__jobguardPgPool;
}

export async function dbQuery<T = unknown>(text: string, params: unknown[] = []) {
  const pool = getDbPool();
  return pool.query<T>(text, params);
}
