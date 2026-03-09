"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-24" />;
  }

  const options = [
    { value: "light", icon: <Sun className="h-4 w-4" />, title: "Light" },
    { value: "dark", icon: <Moon className="h-4 w-4" />, title: "Dark" },
    { value: "system", icon: <Monitor className="h-4 w-4" />, title: "System" },
  ];

  return (
    <div className="inline-flex rounded-lg bg-slate-200 dark:bg-slate-700 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          title={opt.title}
          className={`px-2 py-1 rounded-md text-sm transition-colors ${
            theme === opt.value
              ? "bg-white dark:bg-slate-600 shadow-sm"
              : "hover:bg-slate-300 dark:hover:bg-slate-600"
          }`}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
