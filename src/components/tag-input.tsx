"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Tag } from "@/lib/types";

const SUGGESTED_TAGS = [
  "arrays",
  "binary-search",
  "sliding-window",
  "two-pointers",
  "dynamic-programming",
  "graphs",
  "trees",
  "stack",
  "heap",
  "greedy",
  "backtracking",
  "linked-list",
];

interface TagInputProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
  userId: string;
}

export function TagInput({ selectedTags, onChange, userId }: TagInputProps) {
  const supabase = createClient();
  const [input, setInput] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", userId)
        .order("name");
      setAllTags(data ?? []);
    };
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = new Set(selectedTags.map((t) => t.id));
  const query = input.trim().toLowerCase();

  const filteredTags = allTags.filter(
    (t) => !selectedIds.has(t.id) && t.name.toLowerCase().includes(query),
  );

  // Show suggested tags that haven't been created yet
  const suggestedNew = query
    ? []
    : SUGGESTED_TAGS.filter(
        (s) =>
          !allTags.some((t) => t.name === s) &&
          !selectedTags.some((t) => t.name === s),
      );

  const exactMatch = allTags.some((t) => t.name.toLowerCase() === query);
  const canCreateNew =
    query.length > 0 &&
    !exactMatch &&
    !selectedTags.some((t) => t.name.toLowerCase() === query);

  const options: {
    type: "existing" | "create" | "suggested";
    tag?: Tag;
    name?: string;
  }[] = [
    ...filteredTags.map((tag) => ({ type: "existing" as const, tag })),
    ...(canCreateNew ? [{ type: "create" as const, name: query }] : []),
    ...suggestedNew.map((name) => ({ type: "suggested" as const, name })),
  ];

  const addExistingTag = useCallback(
    (tag: Tag) => {
      onChange([...selectedTags, tag]);
      setInput("");
      setShowDropdown(false);
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [selectedTags, onChange],
  );

  const createAndAddTag = useCallback(
    async (name: string) => {
      const { data, error } = await supabase
        .from("tags")
        .insert({ user_id: userId, name })
        .select()
        .single();

      if (error) {
        // Tag might already exist (race condition), try to find it
        const { data: existing } = await supabase
          .from("tags")
          .select("*")
          .eq("user_id", userId)
          .eq("name", name)
          .single();
        if (existing) {
          setAllTags((prev) =>
            prev.some((t) => t.id === existing.id) ? prev : [...prev, existing],
          );
          onChange([...selectedTags, existing]);
        }
      } else if (data) {
        setAllTags((prev) => [...prev, data]);
        onChange([...selectedTags, data]);
      }

      setInput("");
      setShowDropdown(false);
      setHighlightIndex(-1);
      inputRef.current?.focus();
    },
    [supabase, userId, selectedTags, onChange],
  );

  const removeTag = useCallback(
    (tagId: string) => {
      onChange(selectedTags.filter((t) => t.id !== tagId));
    },
    [selectedTags, onChange],
  );

  const selectOption = useCallback(
    (index: number) => {
      const option = options[index];
      if (!option) return;
      if (option.type === "existing" && option.tag) {
        addExistingTag(option.tag);
      } else if (
        (option.type === "create" || option.type === "suggested") &&
        option.name
      ) {
        createAndAddTag(option.name);
      }
    },
    [options, addExistingTag, createAndAddTag],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightIndex >= 0) {
        selectOption(highlightIndex);
      } else if (canCreateNew) {
        createAndAddTag(query);
      }
    } else if (
      e.key === "Backspace" &&
      input === "" &&
      selectedTags.length > 0
    ) {
      removeTag(selectedTags[selectedTags.length - 1].id);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        Tags
      </label>
      <div
        className="flex flex-wrap gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1.5 min-h-[38px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
          >
            {tag.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag.id);
              }}
              className="hover:text-blue-900 dark:hover:text-blue-100"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowDropdown(true);
            setHighlightIndex(-1);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
          className="flex-1 min-w-[80px] bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {showDropdown && options.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-48 overflow-y-auto">
          {options.map((option, i) => (
            <button
              key={
                option.type === "existing"
                  ? option.tag!.id
                  : `${option.type}-${option.name}`
              }
              type="button"
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                i === highlightIndex
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectOption(i);
              }}
              onMouseEnter={() => setHighlightIndex(i)}
            >
              {option.type === "create" ? (
                <>
                  Create &ldquo;
                  <span className="font-medium">{option.name}</span>&rdquo;
                </>
              ) : option.type === "suggested" ? (
                <span className="text-slate-400 dark:text-slate-500">
                  + {option.name}
                </span>
              ) : (
                option.tag!.name
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
