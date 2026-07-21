export type FilterKey = "in" | "from";

export interface ParsedQuery {
  text: string;
  in: string | null;
  from: string | null;
}

export interface PartialToken {
  key: FilterKey;
  value: string;
}

const TOKEN = /^(in|from):(.*)$/i;
const SIGIL: Record<FilterKey, string> = { in: "#", from: "@" };

const readToken = (word: string) => {
  const m = TOKEN.exec(word);
  if (!m) return null;
  return {
    key: m[1].toLowerCase() as FilterKey,
    value: m[2].replace(/^[#@]/, ""),
  };
};

export function parseQuery(raw: string): ParsedQuery {
  const text: string[] = [];
  const found: Partial<Record<FilterKey, string>> = {};

  for (const word of raw.split(/\s+/)) {
    const token = readToken(word);
    if (!token) {
      if (word) text.push(word);
    } else if (token.value) {
      found[token.key] = token.value;
    }
  }

  return { text: text.join(" "), in: found.in ?? null, from: found.from ?? null };
}

export function withoutFilter(raw: string, key: FilterKey): string {
  return raw
    .split(/\s+/)
    .filter((word) => readToken(word)?.key !== key)
    .join(" ")
    .trim();
}

/** The token being typed at the end of the query, which is what the suggestion
 *  list completes. Null once it is finished, so the list closes on its own. */
export function partialToken(raw: string): PartialToken | null {
  const last = raw.split(/\s+/).at(-1) ?? "";
  const token = readToken(last);
  return token && !raw.endsWith(" ") ? token : null;
}

export function completeToken(raw: string, key: FilterKey, value: string): string {
  const words = raw.split(/\s+/);
  const last = words.at(-1) ?? "";
  if (readToken(last)) words.pop();
  return [...words, `${key}:${SIGIL[key]}${value}`].filter(Boolean).join(" ") + " ";
}
