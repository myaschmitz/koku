/**
 * Split card content into front and back sections.
 * The delimiter is a line containing only "---" (horizontal rule).
 * Multiple "---" delimiters create multiple hidden/back sections.
 */
export function splitCardContent(content: string): {
  front: string;
  back: string | null;
  backs: string[];
} {
  // Split on all occurrences of \n---\n
  const parts = content.split("\n---\n");

  // Handle edge case: content starts with ---
  if (parts.length === 1 && content.startsWith("---\n")) {
    const backContent = content.slice(4).trim();
    return { front: "", back: backContent || null, backs: backContent ? [backContent] : [] };
  }

  if (parts.length === 1) {
    return { front: content.trim(), back: null, backs: [] };
  }

  const front = parts[0].trim();
  const backs = parts.slice(1).map((p) => p.trim()).filter(Boolean);

  return {
    front,
    back: backs.length > 0 ? backs.join("\n\n---\n\n") : null,
    backs,
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
