import { parseMentions } from "@ccchat/shared";
import { describe, expect, it } from "vitest";

describe("parseMentions", () => {
  it("reads a plain username", () => {
    expect(parseMentions("hey @lucien look")).toMatchObject({
      usernames: ["lucien"],
      roleIds: [],
      everyone: false,
    });
  });

  it("is case insensitive and normalises to the stored lowercase handle", () => {
    expect(parseMentions("@Lucien").usernames).toEqual(["lucien"]);
  });

  it("does not read an email address as a mention", () => {
    expect(parseMentions("write to lucien@example.com").usernames).toEqual([]);
  });

  it("leaves sentence punctuation out of the handle", () => {
    expect(parseMentions("ask @lucien.").usernames).toEqual(["lucien"]);
    expect(parseMentions("@lucien, @ana-").usernames).toEqual(["lucien", "ana"]);
  });

  it("keeps dots and dashes that are inside the handle", () => {
    expect(parseMentions("@first.last and @a-b").usernames).toEqual([
      "first.last",
      "a-b",
    ]);
  });

  it("mentions the same person once however often they are named", () => {
    expect(parseMentions("@lucien @lucien @lucien").usernames).toEqual(["lucien"]);
  });

  it("reads a role token", () => {
    expect(parseMentions("ping <@&role_123> please")).toMatchObject({
      usernames: [],
      roleIds: ["role_123"],
      everyone: false,
    });
  });

  it("reads everyone as everyone rather than as a person", () => {
    const parsed = parseMentions("@everyone stand up");
    expect(parsed.everyone).toBe(true);
    expect(parsed.usernames).toEqual([]);
  });

  it("takes all three kinds out of one message", () => {
    expect(parseMentions("@everyone <@&r1> and @ana")).toMatchObject({
      usernames: ["ana"],
      roleIds: ["r1"],
      everyone: true,
    });
  });

  it("ignores a handle too short to be a username", () => {
    expect(parseMentions("@a").usernames).toEqual([]);
  });

  it("finds nothing in text without mentions", () => {
    expect(parseMentions("just talking, 3 @ 4")).toMatchObject({
      usernames: [],
      roleIds: [],
      everyone: false,
    });
  });
});
