import { describe, it, expect } from "vitest";
import { cardToFSRS, scheduleCard, getSchedulingPreview, createNewCard, Rating } from "../srs";
import type { Card, UserSettings } from "../types";

// ── Test Fixtures ───────────────────────────────────────────────────────────

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    deck_id: "deck-1",
    user_id: "user-1",
    content: "Front\n\n---\n\nBack",
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    suspended: false,
    due: new Date().toISOString(),
    last_review: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    user_id: "user-1",
    again_interval_hours: 0.5,
    hard_interval_hours: 6,
    good_interval_hours: 24,
    easy_interval_hours: 96,
    max_new_cards_per_day: 20,
    theme: "system",
    vacation_mode: false,
    vacation_started_at: null,
    font_size: 16,
    font_family: "sans",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// ── cardToFSRS ──────────────────────────────────────────────────────────────

describe("cardToFSRS", () => {
  it("converts app Card to FSRS format", () => {
    const card = makeCard({
      stability: 5.0,
      difficulty: 3.0,
      reps: 5,
      lapses: 1,
      state: 2,
    });
    const fsrsCard = cardToFSRS(card);
    expect(fsrsCard.stability).toBe(5.0);
    expect(fsrsCard.difficulty).toBe(3.0);
    expect(fsrsCard.reps).toBe(5);
    expect(fsrsCard.lapses).toBe(1);
    expect(fsrsCard.state).toBe(2);
    expect(fsrsCard.due).toBeInstanceOf(Date);
  });

  it("handles null last_review", () => {
    const card = makeCard({ last_review: null });
    const fsrsCard = cardToFSRS(card);
    expect(fsrsCard.last_review).toBeUndefined();
  });

  it("converts last_review string to Date", () => {
    const card = makeCard({ last_review: "2026-01-01T00:00:00.000Z" });
    const fsrsCard = cardToFSRS(card);
    expect(fsrsCard.last_review).toBeInstanceOf(Date);
  });
});

// ── scheduleCard ────────────────────────────────────────────────────────────

describe("scheduleCard", () => {
  it("returns a result with updated card and log", () => {
    const card = makeCard();
    const settings = makeSettings();
    const result = scheduleCard(card, Rating.Good, settings);
    expect(result.card).toBeDefined();
    expect(result.card.due).toBeInstanceOf(Date);
    expect(result.card.reps).toBeGreaterThanOrEqual(1);
    expect(result.log).toBeDefined();
  });

  it("Again rating uses custom interval from settings", () => {
    const card = makeCard();
    const settings = makeSettings({ again_interval_hours: 1 });
    const before = Date.now();
    const result = scheduleCard(card, Rating.Again, settings);
    const expectedMs = 1 * 60 * 60 * 1000;
    const dueMs = result.card.due.getTime() - before;
    // Should be approximately 1 hour (within 5 seconds tolerance)
    expect(dueMs).toBeGreaterThan(expectedMs - 5000);
    expect(dueMs).toBeLessThan(expectedMs + 5000);
  });

  it("Hard rating uses custom interval from settings", () => {
    const card = makeCard();
    const settings = makeSettings({ hard_interval_hours: 6 });
    const before = Date.now();
    const result = scheduleCard(card, Rating.Hard, settings);
    const expectedMs = 6 * 60 * 60 * 1000;
    const dueMs = result.card.due.getTime() - before;
    expect(dueMs).toBeGreaterThan(expectedMs - 5000);
    expect(dueMs).toBeLessThan(expectedMs + 5000);
  });

  it("Good rating uses max of FSRS and custom interval", () => {
    const card = makeCard();
    const settings = makeSettings({ good_interval_hours: 24 });
    const before = Date.now();
    const result = scheduleCard(card, Rating.Good, settings);
    const minMs = 24 * 60 * 60 * 1000;
    const dueMs = result.card.due.getTime() - before;
    // Should be at least 24 hours
    expect(dueMs).toBeGreaterThanOrEqual(minMs - 5000);
  });

  it("Easy rating uses max of FSRS and custom interval", () => {
    const card = makeCard();
    const settings = makeSettings({ easy_interval_hours: 96 });
    const before = Date.now();
    const result = scheduleCard(card, Rating.Easy, settings);
    const minMs = 96 * 60 * 60 * 1000;
    const dueMs = result.card.due.getTime() - before;
    // Should be at least 96 hours
    expect(dueMs).toBeGreaterThanOrEqual(minMs - 5000);
  });
});

// ── getSchedulingPreview ────────────────────────────────────────────────────

describe("getSchedulingPreview", () => {
  it("returns formatted intervals for all ratings", () => {
    const card = makeCard();
    const settings = makeSettings({
      again_interval_hours: 0.5,
      hard_interval_hours: 6,
      good_interval_hours: 24,
      easy_interval_hours: 96,
    });
    const preview = getSchedulingPreview(card, settings);

    // Should have entries for all 4 ratings
    expect(preview[Rating.Again]).toBeDefined();
    expect(preview[Rating.Hard]).toBeDefined();
    expect(preview[Rating.Good]).toBeDefined();
    expect(preview[Rating.Easy]).toBeDefined();

    // Again = 0.5h → rounds to "1h" or "0h"
    expect(preview[Rating.Again]).toMatch(/^\d+[hd]|^\d+mo$/);
    // Hard = 6h
    expect(preview[Rating.Hard]).toBe("6h");
    // Good ≥ 24h → at least "1d"
    expect(preview[Rating.Good]).toMatch(/^\d+[hd]|^\d+mo$/);
    // Easy ≥ 96h → at least "4d"
    expect(preview[Rating.Easy]).toMatch(/^\d+[hd]|^\d+mo$/);
  });
});

// ── createNewCard ───────────────────────────────────────────────────────────

describe("createNewCard", () => {
  it("returns an empty FSRS card with defaults", () => {
    const card = createNewCard();
    expect(card.due).toBeInstanceOf(Date);
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.state).toBe(0);
  });
});
