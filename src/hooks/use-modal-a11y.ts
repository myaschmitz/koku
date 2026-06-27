"use client";

import { useEffect, useRef } from "react";

interface UseModalA11yOptions {
  /** Whether the modal is currently open. */
  open: boolean;
  /** Called when Escape is pressed (and `escapeEnabled` is true). */
  onEscape?: () => void;
  /**
   * When false, Escape is ignored — useful when a nested dialog (e.g. a
   * discard-confirmation) wants to handle Escape itself.
   */
  escapeEnabled?: boolean;
  /**
   * When false, Tab focus is not trapped inside the container — useful while a
   * nested dialog rendered outside the container is open, so the user can tab
   * to its controls.
   */
  trapEnabled?: boolean;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Accessibility plumbing shared by every modal/dialog:
 *
 * - Locks body scroll while open (iOS-safe `position: fixed` technique).
 * - Closes on Escape via `onEscape`.
 * - Traps Tab focus inside the dialog.
 * - Moves focus into the dialog on open and restores it to the previously
 *   focused element on close.
 *
 * Returns a ref to attach to the dialog container element.
 */
export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  open,
  onEscape,
  escapeEnabled = true,
  trapEnabled = true,
}: UseModalA11yOptions) {
  const containerRef = useRef<T>(null);

  // Keep the latest callbacks/flags without re-running the lock effect.
  const onEscapeRef = useRef(onEscape);
  const escapeEnabledRef = useRef(escapeEnabled);
  const trapEnabledRef = useRef(trapEnabled);

  useEffect(() => {
    onEscapeRef.current = onEscape;
    escapeEnabledRef.current = escapeEnabled;
    trapEnabledRef.current = trapEnabled;
  });

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // ── Body scroll lock ──────────────────────────────────────────────
    const scrollY = window.scrollY;
    const body = document.body;
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";

    const getFocusable = (): HTMLElement[] => {
      const node = containerRef.current;
      if (!node) return [];
      return Array.from(
        node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    };

    // Move focus into the dialog unless an element inside already has it
    // (e.g. an autoFocus input).
    const raf = requestAnimationFrame(() => {
      const node = containerRef.current;
      if (!node || node.contains(document.activeElement)) return;
      const focusable = getFocusable();
      (focusable[0] ?? node).focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (escapeEnabledRef.current) {
          e.stopPropagation();
          onEscapeRef.current?.();
        }
        return;
      }

      if (e.key !== "Tab" || !trapEnabledRef.current) return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        containerRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const inside = containerRef.current?.contains(active);

      if (e.shiftKey) {
        if (active === first || !inside) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !inside) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = "";
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      window.scrollTo(0, scrollY);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return containerRef;
}
