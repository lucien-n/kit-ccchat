import { spoiler } from "@mdit/plugin-spoiler";
import MarkdownIt from "markdown-it";
import { full as emoji } from "markdown-it-emoji";

// html:false escapes every tag in the source, so message text cannot inject
// markup and there is no sanitiser in the loop to get wrong. markdown-it also
// refuses javascript:/data: hrefs by default.
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  typographer: false,
})
  .use(emoji)
  .use(spoiler, {
    attrs: [
      ["class", "spoiler"],
      ["role", "button"],
      ["tabindex", "0"],
      ["aria-label", "Reveal spoiler"],
    ],
  });

// CommonMark reads __x__ as bold; Discord reads it as underline.
md.renderer.rules.strong_open = (tokens, i) =>
  tokens[i].markup === "__" ? "<u>" : "<strong>";
md.renderer.rules.strong_close = (tokens, i) =>
  tokens[i].markup === "__" ? "</u>" : "</strong>";

const link = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, i, opts, env, self) => {
  tokens[i].attrSet("target", "_blank");
  tokens[i].attrSet("rel", "noopener noreferrer nofollow ugc");
  return link ? link(tokens, i, opts, env, self) : self.renderToken(tokens, i, opts);
};

export const render = (src: string) => md.render(src);

const EMOJI_ONLY = /^(?:\p{RGI_Emoji}|\s)+$/v;

export function isEmojiOnly(src: string) {
  const trimmed = src.trim();
  if (!trimmed) return false;
  const count = [...trimmed.matchAll(/\p{RGI_Emoji}/gv)].length;
  return count > 0 && count <= 27 && EMOJI_ONLY.test(trimmed);
}
