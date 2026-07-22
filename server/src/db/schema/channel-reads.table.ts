import { integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { channelsTable } from "./channels.table";

export const channelReadsTable = sqliteTable(
  "channel_reads",
  {
    userId: text("user_id").notNull(),
    channelId: text("channel_id")
      .notNull()
      .references(() => channelsTable.id, { onDelete: "cascade" }),
    lastReadAt: integer("last_read_at").notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.userId, t.channelId] }) }),
);
