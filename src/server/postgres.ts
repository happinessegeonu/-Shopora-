import { authDatabase, type Database } from "@/lib/owned-auth/database";
export const database = authDatabase;
export function transaction<T>(work: (client: Database) => Promise<T>) { return database().transaction(work); }
