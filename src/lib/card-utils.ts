/**
 * Split card content into front and back sections.
 * The delimiter is a line containing only "---" (horizontal rule).
 */
export function splitCardContent(content: string): {
  front: string;
  back: string | null;
} {
  const idx = content.indexOf("\n---\n");
  if (idx === -1) {
    // Also check if content starts with --- (edge case)
    if (content.startsWith("---\n")) {
      return { front: "", back: content.slice(4).trim() };
    }
    return { front: content.trim(), back: null };
  }
  return {
    front: content.slice(0, idx).trim(),
    back: content.slice(idx + 5).trim() || null,
  };
}

/**
 * Extract a display title from card content.
 * Uses the first line, stripping any leading markdown heading markers.
 */
export function getCardTitle(content: string): string {
  const { front } = splitCardContent(content);
  const firstLine = front.split("\n")[0] ?? "";
  return firstLine.replace(/^#+\s*/, "").trim() || "Untitled";
}
