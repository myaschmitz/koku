"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Convert a hex color string to HSL components.
 */
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 217, s: 91, l: 60 }; // default blue

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate a palette of shades from a single accent hex color.
 */
export function generateAccentShades(hex: string) {
  const { h, s } = hexToHSL(hex);

  return {
    50: hslToHex(h, Math.min(100, s * 0.7), 96),
    100: hslToHex(h, Math.min(100, s * 0.75), 91),
    200: hslToHex(h, Math.min(100, s * 0.7), 83),
    300: hslToHex(h, Math.min(100, s * 0.65), 72),
    400: hslToHex(h, Math.min(100, s * 0.6), 60),
    500: hex,
    600: hslToHex(h, Math.min(100, s * 0.95), 45),
    700: hslToHex(h, Math.min(100, s * 0.9), 37),
    800: hslToHex(h, Math.min(100, s * 0.85), 30),
    900: hslToHex(h, Math.min(100, s * 0.7), 22),
  };
}

/**
 * Apply accent color CSS custom properties to the document root.
 */
export function applyAccentColor(hex: string) {
  const shades = generateAccentShades(hex);
  const root = document.documentElement;

  for (const [shade, color] of Object.entries(shades)) {
    root.style.setProperty(`--accent-${shade}`, color);
  }
}

/**
 * Component that loads the user's accent color from the database
 * and applies it as CSS custom properties.
 */
export function AccentSettings() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("accent_color")
        .eq("user_id", user.id)
        .single();

      if (data?.accent_color) {
        applyAccentColor(data.accent_color);
      }
      setLoaded(true);
    };

    load();
  }, []);

  // Apply default accent before user settings load
  useEffect(() => {
    if (!loaded) {
      const root = document.documentElement;
      if (!root.style.getPropertyValue("--accent-500")) {
        applyAccentColor("#3b82f6");
      }
    }
  }, [loaded]);

  return null;
}
