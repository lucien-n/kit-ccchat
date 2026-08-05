import { ChannelType } from "@motus/shared";
import { eq } from "drizzle-orm";
import { hashPassword, newId } from "./auth.js";
import { db } from "./db/index.js";
import { channelsTable, usersTable } from "./db/schema";
import {
  COMMUNITY_NAME,
  OWNER_PASSWORD,
  OWNER_USERNAME,
  RESET_OWNER_PASSWORD,
} from "./env.js";
import * as settingsService from "./modules/settings/settings.service.js";

/** A brand-new instance has no accounts. The client shows the setup wizard in
 *  that state, and POST /api/setup is only accepted while it is true. */
export function needsSetup(): boolean {
  return db.select().from(usersTable).all().length === 0;
}

/** Startup hook. Normally there is nothing to do: a fresh instance stays empty
 *  until someone completes the setup wizard in the browser. Setting OWNER_PASSWORD
 *  is an escape hatch for scripted/headless installs that never see a browser. */
export function bootstrap() {
  if (!needsSetup()) {
    resetOwnerPassword();
    return;
  }

  if (!OWNER_PASSWORD) {
    console.log(
      "\nNo accounts yet - open the app in a browser to create your community.\n",
    );
    return;
  }

  seedCommunity({
    communityName: COMMUNITY_NAME,
    username: OWNER_USERNAME,
    password: OWNER_PASSWORD,
  });
  printBanner("seeded from environment", OWNER_USERNAME.toLowerCase());
}

/** Create the community: the owner account, the default channels, and an initial
 *  unlimited invite code so friends can join straight away. Callers MUST have
 *  checked needsSetup() first - this is the one-and-only chance to become owner. */
export function seedCommunity(input: {
  communityName: string;
  username: string;
  displayName?: string;
  password: string;
}) {
  const now = Date.now();
  const owner = {
    id: newId(),
    username: input.username.toLowerCase(),
    displayName: input.displayName?.trim() || input.username,
    passwordHash: hashPassword(input.password),
    isOwner: 1,
    createdAt: now,
    mutedUntil: null,
    banned: 0,
    avatarVersion: null,
  };

  // One transaction: either the whole community exists or none of it does, so a
  // crash mid-setup can't leave an instance that can never be claimed.
  db.transaction((tx) => {
    tx.insert(usersTable).values(owner).run();
    tx.insert(channelsTable)
      .values([
        {
          id: newId(),
          name: "general",
          type: ChannelType.Text,
          position: 0,
          isMain: 1,
          createdAt: now,
        },
        {
          id: newId(),
          name: "random",
          type: ChannelType.Text,
          position: 1,
          createdAt: now,
        },
        {
          id: newId(),
          name: "General Voice",
          type: ChannelType.Voice,
          position: 2,
          createdAt: now,
        },
      ])
      .run();
  });

  settingsService.setSetting(
    settingsService.SettingKey.CommunityName,
    input.communityName.trim() || "My Community",
  );

  return owner;
}

/** Opt-in recovery: force the existing owner's password back to OWNER_PASSWORD.
 *  The owner account is otherwise only ever created once, so changing
 *  OWNER_PASSWORD later has no effect without this. */
function resetOwnerPassword() {
  if (!RESET_OWNER_PASSWORD) return;
  if (!OWNER_PASSWORD) {
    console.warn("RESET_OWNER_PASSWORD=1 but OWNER_PASSWORD is empty - skipping.");
    return;
  }

  const username = OWNER_USERNAME.toLowerCase();
  const owner = db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .get();
  if (!owner) {
    console.warn(`RESET_OWNER_PASSWORD=1 but no user "${username}" exists - skipping.`);
    return;
  }

  db.update(usersTable)
    .set({
      passwordHash: hashPassword(OWNER_PASSWORD),
      isOwner: 1,
      banned: 0,
    })
    .where(eq(usersTable.id, owner.id))
    .run();

  console.log("\n" + "=".repeat(60));
  console.log("  motus - owner password RESET from OWNER_PASSWORD");
  console.log(`  Login: ${username}`);
  console.log("  Unset RESET_OWNER_PASSWORD now so it does not run again.");
  console.log("=".repeat(60) + "\n");
}

function printBanner(title: string, username: string) {
  console.log("\n" + "=".repeat(60));
  console.log(`  motus - ${title}`);
  console.log("=".repeat(60));
  console.log(`  Owner login : ${username}`);
  console.log(`  Owner pass  : (from OWNER_PASSWORD env)`);
  console.log("=".repeat(60) + "\n");
}
