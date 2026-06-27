import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { linkifyText } from "../linkify";

function isAnchor(node: unknown): node is ReactElement<{
  href: string;
  target: string;
  rel: string;
  children: string;
}> {
  return (
    typeof node === "object" &&
    node !== null &&
    (node as ReactElement).type === "a"
  );
}

describe("linkifyText", () => {
  it("returns a single string segment for plain text", () => {
    const result = linkifyText("just plain text");
    expect(result).toEqual(["just plain text"]);
  });

  it("wraps a single URL in an anchor with the correct props", () => {
    const url = "https://example.com/page";
    const result = linkifyText(url);
    expect(result).toHaveLength(1);
    const anchor = result[0];
    expect(isAnchor(anchor)).toBe(true);
    if (!isAnchor(anchor)) throw new Error("expected anchor");
    expect(anchor.props.href).toBe(url);
    expect(anchor.props.target).toBe("_blank");
    expect(anchor.props.rel).toBe("noopener noreferrer");
    expect(anchor.props.children).toBe(url);
  });

  it("preserves the text before and after a URL", () => {
    const result = linkifyText("see https://a.com now");
    expect(result).toHaveLength(3);
    expect(result[0]).toBe("see ");
    expect(isAnchor(result[1])).toBe(true);
    expect(result[2]).toBe(" now");
  });

  it("creates multiple anchors for multiple URLs", () => {
    const result = linkifyText("https://a.com and https://b.com");
    const anchors = result.filter(isAnchor);
    expect(anchors).toHaveLength(2);
    expect(anchors[0].props.href).toBe("https://a.com");
    expect(anchors[1].props.href).toBe("https://b.com");
  });

  it("does not capture trailing punctuation into the URL", () => {
    for (const trailing of [")", "]", '"', "'", ">"]) {
      const result = linkifyText(`(see https://a.com${trailing})`);
      const anchor = result.find(isAnchor);
      expect(anchor).toBeDefined();
      expect(anchor!.props.href).toBe("https://a.com");
    }
  });

  it("does not capture trailing whitespace into the URL", () => {
    const result = linkifyText("https://a.com next");
    const anchor = result.find(isAnchor);
    expect(anchor!.props.href).toBe("https://a.com");
  });
});
