import { describe, expect, it } from "vitest";
import { isEmojiOnly, render, type MentionResolver } from "../src/lib/markdown";

const resolver: MentionResolver = {
  user: (name) =>
    name === "lucien" ? { label: "Lucien", color: "#ff0000", self: true } : null,
  role: (id) => (id === "r1" ? { label: "Mods", color: "#00ff00" } : null),
  everyone: () => ({ label: "everyone", self: true }),
};
const withMentions = (src: string) => render(src, { mentions: resolver });

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

describe("mentions", () => {
  it("renders a known user as a chip showing the display name", () => {
    const html = withMentions("hi @lucien");
    expect(html).toContain('class="mention"');
    expect(html).toContain("@Lucien");
    expect(html).toContain("--mention:#ff0000");
    expect(html).toContain("data-self");
  });

  it("renders a role token as its name", () => {
    const html = withMentions("ping <@&r1>");
    expect(html).toContain("@Mods");
    expect(html).toContain("--mention:#00ff00");
    expect(html).not.toContain("data-self");
  });

  it("renders everyone", () => {
    expect(withMentions("@everyone hi")).toContain("@everyone");
  });

  it("leaves an unknown handle as plain text", () => {
    const html = withMentions("@nobody there");
    expect(html).not.toContain('class="mention"');
    expect(html).toContain("@nobody");
  });

  it("does not treat an email address as a mention", () => {
    const html = withMentions("mail lucien@example.com");
    expect(html).not.toContain('class="mention"');
  });

  it("keeps a mention out of a code span", () => {
    expect(withMentions("`@lucien`")).toContain("<code>@lucien</code>");
  });

  it("escapes a resolved label so a crafted name cannot inject markup", () => {
    const html = render("@x", {
      mentions: {
        user: () => ({ label: "<img src=x>", color: null }),
        role: () => null,
        everyone: () => ({ label: "everyone" }),
      },
    });
    expect(html).not.toContain("<img");
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
