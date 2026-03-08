"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Layers, FileText, Ban } from "lucide-react";
import type { CardTemplate } from "@/lib/types";
import { BUILTIN_TEMPLATES, type BuiltinTemplate } from "@/lib/card-templates";

const ICON_MAP = {
  layers: Layers,
  file: FileText,
  ban: Ban,
} as const;

function TemplateIcon({
  icon,
  className,
}: {
  icon: string;
  className?: string;
}) {
  const Icon = ICON_MAP[icon as keyof typeof ICON_MAP] ?? FileText;
  return <Icon className={className} />;
}

interface NewCardButtonProps {
  defaultTemplateId: string;
  userTemplates: CardTemplate[];
  onSelect: (templateId: string) => void;
  onNewTemplate: () => void;
}

export function NewCardButton({
  defaultTemplateId,
  userTemplates,
  onSelect,
  onNewTemplate,
}: NewCardButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  const defaultBuiltin = BUILTIN_TEMPLATES.find(
    (t) => t.id === defaultTemplateId,
  );
  const defaultUser = userTemplates.find((t) => t.id === defaultTemplateId);
  const defaultName = defaultBuiltin?.name ?? defaultUser?.name ?? "New Card";

  return (
    <div ref={ref} className="relative inline-flex">
      {/* Main button - creates card with default template */}
      <button
        type="button"
        onClick={() => onSelect(defaultTemplateId)}
        className="rounded-l-lg border border-r-0 border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        {defaultName}
        <kbd className="hidden sm:inline rounded bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 text-xs font-mono text-slate-400 dark:text-slate-500">
          N
        </kbd>
      </button>

      {/* Dropdown arrow */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`rounded-r-lg border border-slate-300 dark:border-slate-600 px-2 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
          open
            ? "bg-slate-100 dark:bg-slate-800"
            : ""
        }`}
        aria-label="Choose card template"
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      {/* Dropdown menu */}
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
          {BUILTIN_TEMPLATES.map((template) => (
            <DropdownItem
              key={template.id}
              icon={template.icon}
              label={template.name}
              onClick={() => {
                onSelect(template.id);
                setOpen(false);
              }}
            />
          ))}
          {userTemplates.map((template) => (
            <DropdownItem
              key={template.id}
              icon={template.icon}
              label={template.name}
              onClick={() => {
                onSelect(template.id);
                setOpen(false);
              }}
            />
          ))}
          <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
          <DropdownItem
            icon="plus"
            label="New template"
            onClick={() => {
              onNewTemplate();
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
    >
      {icon === "plus" ? (
        <Plus className="h-4 w-4 text-slate-400" />
      ) : (
        <TemplateIcon
          icon={icon}
          className="h-4 w-4 text-slate-400"
        />
      )}
      {label}
    </button>
  );
}
