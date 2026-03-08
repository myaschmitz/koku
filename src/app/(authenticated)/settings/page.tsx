"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Palmtree } from "lucide-react";
import { toast } from "sonner";
import type { UserSettings } from "@/lib/types";

const AGAIN_OPTIONS = [
  { label: "1 hour", value: 1 },
  { label: "6 hours", value: 6 },
  { label: "12 hours", value: 12 },
  { label: "1 day", value: 24 },
  { label: "2 days", value: 48 },
  { label: "3 days", value: 72 },
];

const HARD_OPTIONS = [
  { label: "1 day", value: 24 },
  { label: "2 days", value: 48 },
  { label: "3 days", value: 72 },
  { label: "5 days", value: 120 },
  { label: "7 days", value: 168 },
];

export default function SettingsPage() {
  const supabase = createClient();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const lastSavedValues = useRef<string | null>(null);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [togglingVacation, setTogglingVacation] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const fetchSettings = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? "");

      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setSettings(data);
        if (data.theme && data.theme !== "system") {
          setTheme(data.theme);
        }
      }
      setLoading(false);
      // Snapshot initial values so auto-save only fires on user changes
      if (data) {
        lastSavedValues.current = JSON.stringify([
          data.again_interval_hours,
          data.hard_interval_hours,
          data.max_new_cards_per_day,
        ]);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSettings = async (
    updatedSettings: UserSettings,
    currentTheme: string,
  ) => {
    const { error } = await supabase
      .from("user_settings")
      .update({
        again_interval_hours: updatedSettings.again_interval_hours,
        hard_interval_hours: updatedSettings.hard_interval_hours,
        max_new_cards_per_day: updatedSettings.max_new_cards_per_day,
        theme: currentTheme,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", updatedSettings.user_id);

    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved");
    }
  };

  // Auto-save when settings change (debounced), only if values differ from last save
  useEffect(() => {
    if (!settings) return;

    const currentValues = JSON.stringify([
      settings.again_interval_hours,
      settings.hard_interval_hours,
      settings.max_new_cards_per_day,
    ]);

    if (currentValues === lastSavedValues.current) return;

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      lastSavedValues.current = currentValues;
      saveSettings(settings, theme ?? "system");
    }, 500);

    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    settings?.again_interval_hours,
    settings?.hard_interval_hours,
    settings?.max_new_cards_per_day,
  ]);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    if (settings) {
      saveSettings(settings, newTheme);
    }
  };

  const handleVacationToggle = async () => {
    if (!settings) return;
    setTogglingVacation(true);

    const enabling = !settings.vacation_mode;

    if (enabling) {
      // Turn on vacation mode — record start time
      const now = new Date().toISOString();
      await supabase
        .from("user_settings")
        .update({
          vacation_mode: true,
          vacation_started_at: now,
          updated_at: now,
        })
        .eq("user_id", settings.user_id);

      setSettings({
        ...settings,
        vacation_mode: true,
        vacation_started_at: now,
      });
    } else {
      // Turn off vacation mode — shift all card due dates forward
      const vacationStart = new Date(settings.vacation_started_at!);
      const now = new Date();
      const vacationMs = now.getTime() - vacationStart.getTime();

      // Fetch all non-suspended cards for this user
      const { data: cards } = await supabase
        .from("cards")
        .select("id, due")
        .eq("user_id", settings.user_id)
        .eq("suspended", false);

      if (cards && cards.length > 0) {
        // Shift each card's due date forward by the vacation duration
        const updates = cards.map((card) => {
          const oldDue = new Date(card.due);
          const newDue = new Date(oldDue.getTime() + vacationMs);
          return supabase
            .from("cards")
            .update({ due: newDue.toISOString() })
            .eq("id", card.id);
        });
        await Promise.all(updates);
      }

      const nowIso = now.toISOString();
      await supabase
        .from("user_settings")
        .update({
          vacation_mode: false,
          vacation_started_at: null,
          updated_at: nowIso,
        })
        .eq("user_id", settings.user_id);

      setSettings({
        ...settings,
        vacation_mode: false,
        vacation_started_at: null,
      });
    }

    setTogglingVacation(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate-500 dark:text-slate-400">
          Unable to load settings.
        </p>
      </div>
    );
  }

  const themeOptions = [
    { value: "light", icon: <Sun className="h-4 w-4" />, label: "Light" },
    { value: "dark", icon: <Moon className="h-4 w-4" />, label: "Dark" },
    {
      value: "system",
      icon: <Monitor className="h-4 w-4" />,
      label: "System",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* SRS Intervals */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          SRS Intervals
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              When you press Again, show card again in:
            </label>
            <select
              value={settings.again_interval_hours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  again_interval_hours: Number(e.target.value),
                })
              }
              className="w-full sm:w-48 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {AGAIN_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              When you press Hard, show card again in:
            </label>
            <select
              value={settings.hard_interval_hours}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  hard_interval_hours: Number(e.target.value),
                })
              }
              className="w-full sm:w-48 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {HARD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Max new cards per day:
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={settings.max_new_cards_per_day}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  max_new_cards_per_day: Math.max(
                    1,
                    Math.min(100, Number(e.target.value) || 1),
                  ),
                })
              }
              className="w-full sm:w-48 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          Good and Easy intervals are calculated automatically by FSRS based on
          your review history.
        </p>
      </section>

      {/* Appearance */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Appearance
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Theme
          </label>
          {mounted && (
            <div className="flex rounded-lg bg-slate-200 dark:bg-slate-700 p-0.5 w-fit">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleThemeChange(opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    theme === opt.value
                      ? "bg-white dark:bg-slate-600 shadow-sm text-slate-900 dark:text-slate-100"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-600"
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Vacation Mode */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palmtree className="h-5 w-5 text-emerald-500" />
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Vacation Mode
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Pause all cards so they don&apos;t pile up while you&apos;re
                away.
              </p>
            </div>
          </div>
          <button
            aria-label="Toggle vacation mode"
            onClick={handleVacationToggle}
            disabled={togglingVacation}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
              settings.vacation_mode
                ? "bg-emerald-500"
                : "bg-slate-300 dark:bg-slate-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                settings.vacation_mode ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
        {settings.vacation_mode && settings.vacation_started_at && (
          <div className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-3">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              Vacation mode is active since{" "}
              <span className="font-medium">
                {new Date(settings.vacation_started_at).toLocaleDateString(
                  undefined,
                  {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </span>
              . When you turn it off, all card due dates will be shifted forward
              so nothing piles up.
            </p>
          </div>
        )}
      </section>

      {/* Account */}
      <section className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Account
        </h2>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <p className="text-sm text-slate-900 dark:text-slate-100">{email}</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            Sign out
          </button>
          <button
            onClick={() => {
              setShowDeleteModal(true);
              setDeleteConfirm("");
              setDeleteError("");
            }}
            className="rounded-lg border border-red-300 dark:border-red-700 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            Delete account
          </button>
        </div>
      </section>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
              Delete Account
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              This will permanently delete your account and all your data,
              including all decks, cards, review history, and uploaded images.
              This action cannot be undone.
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Type <span className="font-mono font-bold">delete</span> to
                confirm:
              </label>
              <input
                autoFocus
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder="delete"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (deleteConfirm !== "delete") {
                    setDeleteError('Please type "delete" to confirm.');
                    return;
                  }
                  setDeleting(true);
                  setDeleteError("");
                  const res = await fetch("/api/account/delete", {
                    method: "POST",
                  });
                  if (res.ok) {
                    window.location.href = "/login";
                  } else {
                    setDeleteError(
                      "Failed to delete account. Please try again.",
                    );
                    setDeleting(false);
                  }
                }}
                disabled={deleting || deleteConfirm !== "delete"}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
