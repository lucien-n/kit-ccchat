import { beforeAll, describe, expect, it } from "vitest";
import {
  loadEmoji,
  searchEmoji,
  shortcodeQuery,
  type EmojiIndex,
} from "../src/lib/emoji";

let index: EmojiIndex;

beforeAll(async () => {
  index = await loadEmoji();
});

describe("the generated dataset", () => {
  it("carries the Slack shortcodes people actually type", () => {
    const byShortcode = new Map(
      index.all.map(([emoji, shortcode]) => [shortcode, emoji]),
    );
    expect(byShortcode.get("tada")).toBe("🎉");
    expect(byShortcode.get("+1")).toBe("👍");
    expect(byShortcode.get("joy")).toBe("😂");
    expect(byShortcode.get("smile")).toBe("😄");
  });

  it("gives every emoji a shortcode and keeps flags out of the grid", () => {
    expect(index.all.length).toBeGreaterThan(1700);
    expect(index.all.every(([emoji, shortcode]) => !!emoji && !!shortcode)).toBe(true);
    expect(index.groups.some((g) => g.hidden)).toBe(true);
    expect(index.groups.some((g) => !g.hidden)).toBe(true);
  });
});

describe("searchEmoji", () => {
  it("puts the exact name ahead of names that merely start with the query", () => {
    const smile = searchEmoji(index, "smile", 5);
    expect(smile[0][0]).toBe("😄");
    expect(smile.map((e) => e[1])).toContain("smiley");

    const heart = searchEmoji(index, "heart", 5);
    expect(heart[0][0]).toBe("❤️");
    expect(heart.map((e) => e[1])).toContain("heart_eyes");
  });

  it("matches an alias and a tag, not just the shortcode", () => {
    expect(searchEmoji(index, "party_popper").map((e) => e[0])).toContain("🎉");
    expect(searchEmoji(index, "celebration").map((e) => e[0])).toContain("🎉");
  });

  it("respects the limit and returns nothing for an empty or unmatched query", () => {
    expect(searchEmoji(index, "a", 5)).toHaveLength(5);
    expect(searchEmoji(index, "")).toEqual([]);
    expect(searchEmoji(index, "   ")).toEqual([]);
    expect(searchEmoji(index, "zzzzznotanemoji")).toEqual([]);
  });
});

describe("shortcodeQuery", () => {
  it("finds the query being typed and where it starts", () => {
    expect(shortcodeQuery("hi :tad")).toEqual({ start: 3, query: "tad" });
    expect(shortcodeQuery(":tad")).toEqual({ start: 0, query: "tad" });
  });

  it("ignores a colon that is not starting a word", () => {
    expect(shortcodeQuery("http://ex")).toBeNull();
    expect(shortcodeQuery("10:30")).toBeNull();
  });

  it("waits for two characters before offering anything", () => {
    expect(shortcodeQuery("a :")).toBeNull();
    expect(shortcodeQuery("a :t")).toBeNull();
    expect(shortcodeQuery("a :ta")).toEqual({ start: 2, query: "ta" });
  });

  it("stops at whitespace, so a finished word is not a query", () => {
    expect(shortcodeQuery(":tada: ")).toBeNull();
    expect(shortcodeQuery("hi :tada more")).toBeNull();
  });
});
