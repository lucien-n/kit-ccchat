import { describe, expect, it } from "vitest";
import { isEmojiOnly, render } from "../src/lib/markdown";

// markdown-it tests its own dialect. These cover the parts that are ours: the
// options that make it safe, the Discord-flavoured overrides, and the plugins.

describe("safety", () => {
  it("escapes raw html rather than rendering it", () => {
    expect(render("<img src=x onerror=alert(1)>")).not.toContain("<img");
    expect(render("<script>alert(1)</script>")).not.toContain("<script");
  });

  it("refuses a dangerous scheme, leaving no anchor at all", () => {
    for (const src of ["[a](javascript:alert(1))", "[a](data:text/html,hi)"]) {
      expect(render(src)).not.toContain("<a ");
    }
  });

  it("marks user links as external and untrusted", () => {
    const html = render("https://example.com");
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow ugc"');
  });
});

describe("discord flavour", () => {
  it("reads __x__ as underline, not bold", () => {
    expect(render("__underline__")).toContain("<u>underline</u>");
    expect(render("**bold**")).toContain("<strong>bold</strong>");
  });

  it("renders spoilers and emoji shortcodes", () => {
    expect(render("!!hidden!!")).toContain('class="spoiler"');
    expect(render(":tada:")).toContain("🎉");
  });

  it("leaves shortcodes and spoilers inside code alone", () => {
    expect(render("`:tada:`")).toContain("<code>:tada:</code>");
    expect(render("`!!x!!`")).toContain("<code>!!x!!</code>");
  });

  it("treats a single newline as a line break", () => {
    expect(render("a\nb")).toContain("<br>");
  });
});

describe("isEmojiOnly", () => {
  it("accepts emoji and whitespace only", () => {
    expect(isEmojiOnly("😀")).toBe(true);
    expect(isEmojiOnly("😀 🎉 🚀")).toBe(true);
    expect(isEmojiOnly("👍🏽")).toBe(true);
  });

  it("rejects text, emptiness and a wall of emoji", () => {
    expect(isEmojiOnly("hi 😀")).toBe(false);
    expect(isEmojiOnly("")).toBe(false);
    expect(isEmojiOnly("   ")).toBe(false);
    expect(isEmojiOnly("😀".repeat(28))).toBe(false);
  });
});
