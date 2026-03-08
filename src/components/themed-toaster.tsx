"use client";

import { Toaster, type ToasterProps } from "sonner";
import { useTheme } from "next-themes";

export function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      richColors
      position="bottom-right"
      theme={resolvedTheme as ToasterProps["theme"]}
    />
  );
}
