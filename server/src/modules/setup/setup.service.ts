import type { SetupBody } from "@ccchat/shared";
import { createSession } from "../../auth.js";
import { needsSetup, seedCommunity } from "../../bootstrap.js";
import { httpError } from "../../http/errors.js";
import { toMember } from "../../views.js";

// Guards against two requests racing to claim a brand-new instance. needsSetup()
// only flips once the owner row is committed, so without this both could pass the
// check. Node is single-threaded, so a plain flag is enough.
let claiming = false;

/** Open only while the database has no users - the moment an owner exists this
 *  throws 409 forever. That is the whole security model, so a public instance
 *  must be set up promptly after first boot. */
export function claimCommunity(body: SetupBody) {
  if (claiming || !needsSetup()) httpError(409, "this community is already set up");

  const { communityName, username, password } = body;
  const displayName = body.displayName || username;

  claiming = true;
  try {
    const { owner, inviteCode } = seedCommunity({
      communityName,
      username,
      displayName,
      password,
    });
    return {
      token: createSession(owner.id),
      user: toMember(owner),
      inviteCode,
      communityName,
    };
  } finally {
    claiming = false;
  }
}
