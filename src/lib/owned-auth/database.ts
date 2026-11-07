import { Pool } from "pg";
import { assertPreviewIsolation, isPreview } from "@/lib/preview-mode";

export interface Database {
  query<T extends Record<string, any> = Record<string, any>>(sql: string, values?: any[]): Promise<{ rows: T[] }>;
  transaction<T>(work: (database: Database) => Promise<T>): Promise<T>;
}
let pool: Pool | undefined;
const previewGlobal = globalThis as typeof globalThis & { shoporaPreviewPool?: Pool };
export function authDatabase(): Database {
  if (isPreview()) assertPreviewIsolation();
  const url = process.env.DATABASE_URL || process.env.AUTH_DATABASE_URL;
  if (!url) throw new Error("PostgreSQL is not configured.");
  const connect = () => new Pool({ connectionString: url, max: isPreview() ? 1 : 5,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
    // TLS must be configured in the connection URL with certificate verification.
  });
  const current = isPreview() ? (previewGlobal.shoporaPreviewPool ??= connect()) : (pool ??= connect());
  return {
    query: (sql, values) => current.query(sql, values),
    async transaction(work) {
      const client = await current.connect();
      try {
        await client.query("BEGIN");
        const transaction: Database = { query: (sql, values) => client.query(sql, values), transaction: work => work(transaction) };
        const result = await work(transaction);
        await client.query("COMMIT");
        return result;
      } catch (error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    },
  };
}
