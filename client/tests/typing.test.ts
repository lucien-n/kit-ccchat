import { TYPING_TIMEOUT_MS } from "@ccchat/shared";
import { describe, expect, it } from "vitest";
import {
  stillOnline,
  typingLabel,
  typistsIn,
  unexpired,
  withoutTypist,
  withTypist,
  type Typist,
} from "../src/lib/typing";

const NOW = 1_700_000_000_000;
const CHANNEL = "channel-1";

const typing = (channelId: string, userId: string, now = NOW): Typist[] =>
  withTypist([], channelId, userId, now);

describe("typists", () => {
  it("keeps channels apart", () => {
    let list = typing(CHANNEL, "ada");
    list = withTypist(list, "channel-2", "grace", NOW);

    expect(typistsIn(list, CHANNEL)).toEqual(["ada"]);
    expect(typistsIn(list, "channel-2")).toEqual(["grace"]);
  });

  it("lists one person once however often they announce themselves", () => {
    let list = typing(CHANNEL, "ada");
    list = withTypist(list, CHANNEL, "ada", NOW + 1000);

    expect(typistsIn(list, CHANNEL)).toEqual(["ada"]);
  });

  it("leaves you out of your own channel", () => {
    let list = typing(CHANNEL, "me");
    list = withTypist(list, CHANNEL, "ada", NOW);

    expect(typistsIn(list, CHANNEL, "me")).toEqual(["ada"]);
  });

  it("drops someone once they go quiet", () => {
    const list = typing(CHANNEL, "ada");

    expect(unexpired(list, NOW + TYPING_TIMEOUT_MS - 1)).toHaveLength(1);
    expect(unexpired(list, NOW + TYPING_TIMEOUT_MS + 1)).toHaveLength(0);
  });

  it("holds on to someone who is still typing", () => {
    let list = typing(CHANNEL, "ada");
    // A heartbeat landing just before the timeout has to push it back, or a long
    // message would blink the indicator off mid-sentence.
    list = withTypist(list, CHANNEL, "ada", NOW + TYPING_TIMEOUT_MS - 1);

    expect(unexpired(list, NOW + TYPING_TIMEOUT_MS + 1)).toHaveLength(1);
  });

  it("drops a typist whose message arrived", () => {
    const list = typing(CHANNEL, "ada");

    expect(withoutTypist(list, CHANNEL, "ada")).toHaveLength(0);
    expect(withoutTypist(list, "channel-2", "ada")).toHaveLength(1);
  });

  it("drops a typist who went offline", () => {
    let list = typing(CHANNEL, "ada");
    list = withTypist(list, CHANNEL, "grace", NOW);

    expect(typistsIn(stillOnline(list, ["grace"]), CHANNEL)).toEqual(["grace"]);
  });
});

describe("typingLabel", () => {
  it("says nothing when nobody is typing", () => {
    expect(typingLabel([])).toBe("");
  });

  it("names one, two and three typists", () => {
    expect(typingLabel(["Ada"])).toBe("Ada is typing...");
    expect(typingLabel(["Ada", "Grace"])).toBe("Ada and Grace are typing...");
    expect(typingLabel(["Ada", "Grace", "Mira"])).toBe(
      "Ada, Grace and Mira are typing...",
    );
  });

  it("stops naming people once the list outgrows the message", () => {
    expect(typingLabel(["Ada", "Grace", "Mira", "Linus"])).toBe(
      "Several people are typing...",
    );
  });
});
