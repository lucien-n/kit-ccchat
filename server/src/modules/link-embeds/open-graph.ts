// Regex-based, not a DOM parse: only a few <meta> tags and <title> are wanted,
// the input is already size-capped, and it keeps the module dependency-free.

const TITLE_MAX = 300;
const DESCRIPTION_MAX = 1000;
const SITE_NAME_MAX = 100;

export interface OgData {
  title: string | null;
  description: string | null;
  siteName: string | null;
  imageUrl: string | null;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
  "#34": '"',
  nbsp: " ",
};

// Decode the HTML entities that turn up in meta text (named + numeric); leave
// anything unrecognised as-is.
function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    const key = body.toLowerCase();
    if (key in ENTITIES) return ENTITIES[key];
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      if (Number.isFinite(code) && code > 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return whole;
        }
      }
    }
    return whole;
  });
}

function clean(value: string | undefined, max: number): string | null {
  if (!value) return null;
  const text = decodeEntities(value).replace(/\s+/g, " ").trim();
  if (!text) return null;
  return text.slice(0, max);
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) {
    out[m[1].toLowerCase()] = m[3] ?? m[4] ?? m[5] ?? "";
  }
  return out;
}

export function parseOpenGraph(html: string, pageUrl: string): OgData {
  // property/name -> content, first tag of a kind winning (OG convention).
  const meta = new Map<string, string>();
  const tagRe = /<meta\b[^>]*>/gi;
  let tag: RegExpExecArray | null;
  while ((tag = tagRe.exec(html))) {
    const a = attrs(tag[0]);
    const key = a.property ?? a.name;
    if (key && a.content !== undefined && !meta.has(key.toLowerCase())) {
      meta.set(key.toLowerCase(), a.content);
    }
  }

  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];

  const pick = (...keys: string[]) => keys.map((k) => meta.get(k)).find((v) => v);

  const rawImage = pick("og:image", "og:image:url", "og:image:secure_url", "twitter:image", "twitter:image:src");
  let imageUrl: string | null = null;
  if (rawImage) {
    try {
      imageUrl = new URL(decodeEntities(rawImage).trim(), pageUrl).toString();
    } catch {
      imageUrl = null;
    }
  }

  return {
    title: clean(pick("og:title", "twitter:title"), TITLE_MAX) ?? clean(titleTag, TITLE_MAX),
    description: clean(pick("og:description", "twitter:description", "description"), DESCRIPTION_MAX),
    siteName: clean(pick("og:site_name", "application-name"), SITE_NAME_MAX),
    imageUrl,
  };
}
