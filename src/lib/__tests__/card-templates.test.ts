import { describe, it, expect } from "vitest";
import { getTemplateContent, BUILTIN_TEMPLATES } from "../card-templates";

describe("BUILTIN_TEMPLATES", () => {
  it("contains the expected builtin ids", () => {
    const ids = BUILTIN_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("flashcard");
    expect(ids).toContain("no-template");
  });

  it("uses the expected icons for builtins", () => {
    const flashcard = BUILTIN_TEMPLATES.find((t) => t.id === "flashcard");
    const noTemplate = BUILTIN_TEMPLATES.find((t) => t.id === "no-template");
    expect(flashcard?.icon).toBe("layers");
    expect(noTemplate?.icon).toBe("ban");
  });
});

describe("getTemplateContent", () => {
  const userTemplates = [
    { id: "user-1", content: "My custom content" },
    { id: "user-2", content: "Another\n---\nTemplate" },
  ];

  it("returns the flashcard delimiter content for the builtin 'flashcard'", () => {
    expect(getTemplateContent("flashcard", userTemplates)).toBe("\n\n---\n\n");
  });

  it("returns empty string for the builtin 'no-template'", () => {
    expect(getTemplateContent("no-template", userTemplates)).toBe("");
  });

  it("returns the user template's content for a user template id", () => {
    expect(getTemplateContent("user-1", userTemplates)).toBe("My custom content");
    expect(getTemplateContent("user-2", userTemplates)).toBe("Another\n---\nTemplate");
  });

  it("returns empty string for an unknown id", () => {
    expect(getTemplateContent("does-not-exist", userTemplates)).toBe("");
    expect(getTemplateContent("does-not-exist", [])).toBe("");
  });
});
