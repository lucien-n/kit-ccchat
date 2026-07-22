import { ChannelType, Permission, username as usernamePrimitive } from "@ccchat/shared";
import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { db } from "./src/db";
import {
  Channel,
  channels as channelsTable,
  messages as messagesTable,
  Role,
  roles as rolesTable,
  User,
  userRoles as userRolesTable,
  users as usersTable,
} from "./src/db/schema";

// scrypt of "password"
const PASSWORD_HASH =
  "28eb8d8e55bf8ac9229aaf64abdc9782:cae16c8c3d7d0410e118401e7dec39397075a8dc8674ed001addba2e9f87634f6e9c14e33ddf28ce8c9b1f3f8db44d6ccfa0de9038c4c8c9af9cb2c520be5cb4";

const TEXT_CHANNELS = [
  { name: "general", messages: 100 },
  { name: "random", messages: 10 },
  { name: "mod", messages: 0 },
];
const VOICE_CHANNELS = ["General", "Hangout"];

const ROLES = [
  { name: "Members", permission: Permission.Member, color: "#4f9dee" },
  { name: "Admins", permission: Permission.Admin, color: "#e14cb9" },
];

const MESSAGE_GAP_MS = 4 * 60_000;

async function seedUsers(): Promise<User[]> {
  const data = Array.from({ length: 5 }, (_, i) => {
    const displayName = faker.internet.displayName();
    const username = usernamePrimitive.parse(
      `${displayName
        .toLowerCase()
        .replace(/[^a-z0-9_.-]/g, "")
        .slice(0, 20)}${i}`,
    );

    return {
      id: crypto.randomUUID(),
      displayName,
      username,
      createdAt: Date.now(),
      passwordHash: PASSWORD_HASH,
    } satisfies typeof usersTable.$inferInsert;
  });

  const users = await db.insert(usersTable).values(data).returning();

  console.log(`Seeded ${users.length} users (password: "password")`);

  return users;
}

async function seedRoles(users: User[]): Promise<Role[]> {
  const roles = await db
    .insert(rolesTable)
    .values(
      ROLES.map((role, i) => ({
        id: crypto.randomUUID(),
        ...role,
        position: i,
        createdAt: Date.now(),
      })),
    )
    .returning();

  const admins = roles.find((r) => r.permission === Permission.Admin)!;
  const members = roles.find((r) => r.permission === Permission.Member)!;

  await db.insert(userRolesTable).values(
    users.map((user, i) => ({
      userId: user.id,
      roleId: i === 0 ? admins.id : members.id,
    })),
  );

  console.log(`Seeded ${roles.length} roles`);

  return roles;
}

async function seedChannels(): Promise<Channel[]> {
  const data = [
    ...TEXT_CHANNELS.map((c) => ({ name: c.name, type: ChannelType.Text })),
    ...VOICE_CHANNELS.map((name) => ({ name, type: ChannelType.Voice })),
  ].map((channel, position) => ({
    id: crypto.randomUUID(),
    ...channel,
    position,
    createdAt: Date.now(),
  }));

  const channels = await db.insert(channelsTable).values(data).returning();

  console.log(
    `Seeded ${channels.length} channels: ${channels.map((c) => `${c.name} (${c.type})`).join(", ")}`,
  );

  return channels;
}

async function seedMessages(channel: Channel, count: number, authors: User[]) {
  const start = Date.now() - count * MESSAGE_GAP_MS;

  await db.insert(messagesTable).values(
    Array.from({ length: count }, (_, i) => ({
      id: crypto.randomUUID(),
      channelId: channel.id,
      authorId: faker.helpers.arrayElement(authors).id,
      content: faker.lorem.sentence({ min: 3, max: 20 }),
      createdAt: start + i * MESSAGE_GAP_MS,
    })),
  );

  console.log(`Seeded ${count} messages in #${channel.name}`);
}

async function main() {
  const owner = await db.query.users.findFirst({ where: eq(usersTable.isOwner, 1) });
  if (!owner) {
    console.error("No owner yet. Open the app and finish the setup wizard first.");
    process.exit(1);
  }

  await db.delete(channelsTable);
  await db.delete(userRolesTable);
  await db.delete(rolesTable);
  await db.delete(usersTable).where(eq(usersTable.isOwner, 0));

  const users = await seedUsers();
  await seedRoles(users);
  const channels = await seedChannels();

  const authors = [owner, ...users];
  for (const [i, { messages }] of TEXT_CHANNELS.entries()) {
    if (messages) await seedMessages(channels[i], messages, authors);
  }

  console.log("\nDone. Restart the server so connected clients pick it up.");
}

main();
