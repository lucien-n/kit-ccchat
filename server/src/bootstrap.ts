import { db } from './db/index.js';
import { channels, invites, users } from './db/schema.js';
import { hashPassword, newId, randomToken } from './auth.js';
import { OWNER_PASSWORD, OWNER_USERNAME } from './env.js';

/** First-boot setup: create the owner account, seed default channels, and mint
 *  an initial invite code. Everything is printed to the console once so the
 *  self-hoster knows how to log in and how to invite their friends. */
export function bootstrap() {
  const existingOwner = db.select().from(users).all();
  if (existingOwner.length > 0) return;

  const password = OWNER_PASSWORD || randomToken(6);
  const owner = {
    id: newId(),
    username: OWNER_USERNAME.toLowerCase(),
    displayName: OWNER_USERNAME,
    passwordHash: hashPassword(password),
    role: 'owner',
    createdAt: Date.now(),
    banned: 0,
  };
  db.insert(users).values(owner).run();

  db.insert(channels)
    .values([
      { id: newId(), name: 'general', type: 'text', position: 0, createdAt: Date.now() },
      { id: newId(), name: 'random', type: 'text', position: 1, createdAt: Date.now() },
      { id: newId(), name: 'General Voice', type: 'voice', position: 2, createdAt: Date.now() },
    ])
    .run();

  const inviteCode = randomToken(6);
  db.insert(invites)
    .values({
      code: inviteCode,
      createdBy: owner.id,
      createdAt: Date.now(),
      maxUses: 0, // unlimited, so friends can all use this first one
      uses: 0,
      expiresAt: null,
      revoked: 0,
    })
    .run();

  console.log('\n' + '='.repeat(60));
  console.log('  ccchat — first boot complete');
  console.log('='.repeat(60));
  console.log(`  Owner login : ${owner.username}`);
  if (!OWNER_PASSWORD) {
    console.log(`  Owner pass  : ${password}   <-- generated, save it now!`);
  } else {
    console.log(`  Owner pass  : (from OWNER_PASSWORD env)`);
  }
  console.log(`  Invite code : ${inviteCode}   <-- share with friends to join`);
  console.log('='.repeat(60) + '\n');
}
