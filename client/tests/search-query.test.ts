import { describe, expect, it } from "vitest";
import {
  completeToken,
  parseQuery,
  partialToken,
  withoutFilter,
} from "../src/lib/search-query";

describe("parseQuery", () => {
  it("returns bare text untouched", () => {
    expect(parseQuery("deploy script")).toEqual({
      text: "deploy script",
      in: null,
      from: null,
    });
  });

  it("lifts filters out of the text", () => {
    expect(parseQuery("in:#general from:@lucien deploy")).toEqual({
      text: "deploy",
      in: "general",
      from: "lucien",
    });
  });

  it("accepts filters without their sigil, anywhere in the query", () => {
    expect(parseQuery("deploy in:general more from:lucien")).toEqual({
      text: "deploy more",
      in: "general",
      from: "lucien",
    });
  });

  it("is case insensitive on the key but keeps the value verbatim", () => {
    expect(parseQuery("IN:#General")).toMatchObject({ in: "General" });
  });

  it("ignores a filter that has no value yet", () => {
    expect(parseQuery("in: deploy")).toEqual({ text: "deploy", in: null, from: null });
  });

  it("lets the last of a repeated filter win", () => {
    expect(parseQuery("in:#a in:#b")).toMatchObject({ in: "b" });
  });
});

describe("partialToken", () => {
  it("reports the token being typed", () => {
    expect(partialToken("deploy in:gen")).toEqual({ key: "in", value: "gen" });
    expect(partialToken("from:")).toEqual({ key: "from", value: "" });
  });

  it("closes once the token is followed by a space", () => {
    expect(partialToken("in:general ")).toBeNull();
  });

  it("is null for ordinary words", () => {
    expect(partialToken("deploy")).toBeNull();
    expect(partialToken("")).toBeNull();
  });
});

describe("completeToken", () => {
  it("replaces the partial token and leaves room to keep typing", () => {
    expect(completeToken("deploy in:gen", "in", "general")).toBe("deploy in:#general ");
  });

  it("appends when nothing is being typed", () => {
    expect(completeToken("deploy", "from", "lucien")).toBe("deploy from:@lucien ");
  });
});

describe("withoutFilter", () => {
  it("removes only the named filter", () => {
    expect(withoutFilter("in:#general from:@lucien deploy", "in")).toBe(
      "from:@lucien deploy",
    );
  });

  it("is a no-op when the filter is absent", () => {
    expect(withoutFilter("deploy", "in")).toBe("deploy");
  });
});
