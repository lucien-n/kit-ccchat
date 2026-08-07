import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { channelsTable } from "./channels.table";
import { messagesTable } from "./messages.table";

export const messagePinsTable = sqliteTable(
  "message_pins",
  {
    // A message is either pinned or not, so it keys the row directly.
    messageId: text("message_id")
      .primaryKey()
      .references(() => messagesTable.id, { onDelete: "cascade" }),
    // Redundant with the message's own channel, but stored so listing a
    // channel's pins is a single-table scan rather than a join back through
    // messages.
    channelId: text("channel_id")
      .notNull()
      .references(() => channelsTable.id, { onDelete: "cascade" }),
    pinnedBy: text("pinned_by").notNull(),
    pinnedAt: integer("pinned_at").notNull(),
  },
  (t) => ({ byChannel: index("idx_message_pins_channel").on(t.channelId, t.pinnedAt) }),
);
