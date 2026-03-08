export interface BuiltinTemplate {
  id: string;
  name: string;
  content: string;
  icon: "layers" | "file" | "ban";
}

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    id: "flashcard",
    name: "Basic Flashcard",
    content: "\n\n---\n\n",
    icon: "layers",
  },
  {
    id: "no-template",
    name: "No template",
    content: "",
    icon: "ban",
  },
];

export function getTemplateContent(
  templateId: string,
  userTemplates: { id: string; content: string }[],
): string {
  const builtin = BUILTIN_TEMPLATES.find((t) => t.id === templateId);
  if (builtin) return builtin.content;

  const userTemplate = userTemplates.find((t) => t.id === templateId);
  return userTemplate?.content ?? "";
}
