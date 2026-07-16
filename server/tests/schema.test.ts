import { describe, expect, it } from "vitest";
import { createInviteBody, loginBody, registerBody, username } from "@ccchat/shared";

// The shared schemas are the contract both sides validate against, so their
// edges are worth pinning down here rather than discovering in a form.
describe("username", () => {
  it("normalises rather than rejects harmless input", () => {
    expect(username.parse("  Lucien  ")).toBe("lucien");
  });

  it("rejects what the old hand-rolled regex rejected", () => {
    for (const bad of ["a", "has spaces", "UPPER!", "x".repeat(25), "sym$bol"]) {
      expect(username.safeParse(bad).success, `should reject ${bad}`).toBe(false);
    }
  });
});

describe("registerBody displayName", () => {
  const base = { inviteCode: "ABC123", username: "bob", password: "longenough1" };

  // A form binds an untouched optional field to '', not undefined. If '' failed
  // min(1), leaving the optional display name blank would be a validation error.
  it('accepts an empty string, meaning "use my username"', () => {
    expect(registerBody.safeParse({ ...base, displayName: "" }).success).toBe(true);
  });

  it("accepts it being absent entirely", () => {
    expect(registerBody.safeParse(base).success).toBe(true);
  });

  it("still enforces the length cap on a real name", () => {
    expect(registerBody.safeParse({ ...base, displayName: "x".repeat(33) }).success).toBe(
      false,
    );
  });
});

describe("loginBody", () => {
  // Login must not enforce the register-time username rules: an account created
  // before those rules existed still has to be able to log in.
  it("lowercases without imposing the username charset", () => {
    const parsed = loginBody.parse({ username: "  BOB  ", password: "x" });
    expect(parsed.username).toBe("bob");
  });
});

describe("createInviteBody", () => {
  it("defaults to single use", () => {
    expect(createInviteBody.parse({}).maxUses).toBe(1);
  });

  // The old code ran Math.max(0, -5) and silently minted an unlimited invite.
  it("rejects a negative maxUses instead of reading it as unlimited", () => {
    expect(createInviteBody.safeParse({ maxUses: -5 }).success).toBe(false);
  });

  it("keeps 0 meaning unlimited", () => {
    expect(createInviteBody.parse({ maxUses: 0 }).maxUses).toBe(0);
  });
});
