import { describe, it, expect } from "vitest";
import { splitCardContent, getCardTitle } from "../card-utils";

describe("splitCardContent", () => {
  it("returns trimmed front and null back when there is no delimiter", () => {
    const result = splitCardContent("  Just a front  ");
    expect(result).toEqual({ front: "Just a front", back: null, backs: [] });
  });

  it("splits a single delimiter into front and one back", () => {
    const result = splitCardContent("Front\n---\nBack");
    expect(result.front).toBe("Front");
    expect(result.back).toBe("Back");
    expect(result.backs).toEqual(["Back"]);
  });

  it("supports multiple delimiters producing N backs joined with the visible separator", () => {
    const result = splitCardContent("Front\n---\nB1\n---\nB2\n---\nB3");
    expect(result.front).toBe("Front");
    expect(result.backs).toHaveLength(3);
    expect(result.backs).toEqual(["B1", "B2", "B3"]);
    expect(result.back).toBe("B1\n\n---\n\nB2\n\n---\n\nB3");
  });

  it("treats content starting with the delimiter as empty front and the remainder as back", () => {
    const result = splitCardContent("---\nOnly back content");
    expect(result.front).toBe("");
    expect(result.back).toBe("Only back content");
    expect(result.backs).toEqual(["Only back content"]);
  });

  it("filters out trailing/empty back sections via Boolean", () => {
    const result = splitCardContent("Front\n---\nReal\n---\n   \n---\n");
    expect(result.front).toBe("Front");
    expect(result.backs).toEqual(["Real"]);
    expect(result.back).toBe("Real");
  });
});

describe("getCardTitle", () => {
  it("strips a leading single-hash markdown heading", () => {
    expect(getCardTitle("# Hello World\n\nbody")).toBe("Hello World");
  });

  it("strips a leading double-hash markdown heading", () => {
    expect(getCardTitle("## Section title")).toBe("Section title");
  });

  it("returns only the first line", () => {
    expect(getCardTitle("First line\nSecond line")).toBe("First line");
  });

  it("returns 'Untitled' for empty or whitespace content", () => {
    expect(getCardTitle("")).toBe("Untitled");
    expect(getCardTitle("   \n  ")).toBe("Untitled");
  });

  it("uses the front section only, ignoring the back", () => {
    expect(getCardTitle("# Front title\n---\n# Back heading")).toBe(
      "Front title",
    );
  });
});
