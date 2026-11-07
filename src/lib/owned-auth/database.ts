import { Pool } from "pg";

export interface Database {
  query<T extends Record<string, any> = Record<string, any>>(sql: string, values?: any[]): Promise<{ rows: T[] }>;
  transaction<T>(work: (database: Database) => Promise<T>): Promise<T>;
}
let pool: Pool | undefined;
export function authDatabase(): Database {
  const url = process.env.DATABASE_URL || process.env.AUTH_DATABASE_URL;
  if (!url) throw new Error("PostgreSQL is not configured.");
  pool ||= new Pool({ connectionString: url, max: 5,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 10000,
    // TLS must be configured in the connection URL with certificate verification.
  });
  const current = pool;
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
