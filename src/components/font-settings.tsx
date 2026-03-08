"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const FONT_FAMILIES: Record<string, string> = {
  sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  serif: "Georgia, Cambria, 'Times New Roman', Times, serif",
  mono: "var(--font-geist-mono), ui-monospace, SFMono-Regular, monospace",
};

export function FontSettings() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const apply = (fontSize: number, fontFamily: string) => {
      const root = document.documentElement;
      root.style.setProperty("--card-font-size", `${fontSize}px`);
      root.style.setProperty(
        "--card-font-family",
        FONT_FAMILIES[fontFamily] ?? FONT_FAMILIES.sans,
      );
    };

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("font_size, font_family")
        .eq("user_id", user.id)
        .single();

      if (data) {
        apply(data.font_size ?? 16, data.font_family ?? "sans");
      }
      setLoaded(true);
    };

    load();
  }, []);

  // Apply defaults before user settings load
  useEffect(() => {
    if (!loaded) {
      const root = document.documentElement;
      if (!root.style.getPropertyValue("--card-font-size")) {
        root.style.setProperty("--card-font-size", "16px");
        root.style.setProperty(
          "--card-font-family",
          FONT_FAMILIES.sans,
        );
      }
    }
  }, [loaded]);

  return null;
}
