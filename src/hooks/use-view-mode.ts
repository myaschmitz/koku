import { useState, useEffect } from "react";

const STORAGE_KEY = "koku-view-mode";

export function useViewMode<T extends string>(
  page: string,
  defaultMode: T,
): [T, (mode: T) => void] {
  const [viewMode, setViewModeState] = useState<T>(defaultMode);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}-${page}`);
      if (stored) setViewModeState(stored as T);
    } catch {}
  }, [page]);

  const setViewMode = (mode: T) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(`${STORAGE_KEY}-${page}`, mode);
    } catch {}
  };

  return [viewMode, setViewMode];
}
