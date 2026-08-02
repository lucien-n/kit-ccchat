import { ChannelType } from "@ccchat/shared";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const channelsTable = sqliteTable("channels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: [ChannelType.Text, ChannelType.Voice] })
    .notNull()
    .default(ChannelType.Text),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export type Channel = typeof channelsTable.$inferSelect;
