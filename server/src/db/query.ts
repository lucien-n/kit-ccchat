import { type Column, eq } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import { httpError } from "../http/errors.js";
import { db } from "./index.js";

type Identifiable = SQLiteTable & { id: Column };

export function findById<Table extends Identifiable>(
  table: Table,
  id: string,
): Table["$inferSelect"] | undefined {
  return db.select().from(table).where(eq(table.id, id)).get();
}

export function getById<Table extends Identifiable>(
  table: Table,
  id: string,
  notFound: string,
): Table["$inferSelect"] {
  const row = findById(table, id);
  if (!row) httpError(404, notFound);
  return row;
}
