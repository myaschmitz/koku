import { describe, it, expect, vi, beforeAll } from "vitest";
import path from "path";
import initSqlJs from "sql.js";

// Mock sql.js to use the actual wasm binary from node_modules instead of /sql-wasm.wasm
vi.mock("sql.js", async () => {
  const actual = await vi.importActual<typeof import("sql.js")>("sql.js");
  const wasmBinary = await import("fs").then((fs) =>
    fs.readFileSync(
      path.join(__dirname, "../../../node_modules/sql.js/dist/sql-wasm.wasm")
    )
  );
  return {
    ...actual,
    default: () => actual.default({ wasmBinary }),
  };
});

import {
  importCsv,
  exportCsv,
  importJson,
  exportJson,
  exportAllJson,
  exportApkg,
  importApkg,
  type ExportCard,
  type JsonDeckExport,
  type JsonAllDecksExport,
} from "../import-export";

// ── CSV Import ──────────────────────────────────────────────────────────────

describe("importCsv", () => {
  it("parses basic comma-delimited CSV", () => {
    const csv = "What is 2+2?,4\nCapital of France?,Paris";
    const cards = importCsv(csv);
    expect(cards).toEqual([
      { front: "What is 2+2?", back: "4" },
      { front: "Capital of France?", back: "Paris" },
    ]);
  });

  it("skips header row when detected", () => {
    const csv = "front,back\nWhat is 2+2?,4\nCapital of France?,Paris";
    const cards = importCsv(csv);
    expect(cards).toHaveLength(2);
    expect(cards[0].front).toBe("What is 2+2?");
  });

  it("detects tab delimiter", () => {
    const csv = "hello\tworld\nfoo\tbar";
    const cards = importCsv(csv);
    expect(cards).toEqual([
      { front: "hello", back: "world" },
      { front: "foo", back: "bar" },
    ]);
  });

  it("detects semicolon delimiter", () => {
    const csv = "hello;world\nfoo;bar";
    const cards = importCsv(csv);
    expect(cards).toEqual([
      { front: "hello", back: "world" },
      { front: "foo", back: "bar" },
    ]);
  });

  it("handles quoted fields with commas", () => {
    const csv = '"Hello, world","Goodbye, world"';
    const cards = importCsv(csv);
    expect(cards[0]).toEqual({ front: "Hello, world", back: "Goodbye, world" });
  });

  it("handles escaped quotes in fields", () => {
    const csv = '"He said ""hello""","She said ""bye"""';
    const cards = importCsv(csv);
    expect(cards[0].front).toBe('He said "hello"');
    expect(cards[0].back).toBe('She said "bye"');
  });

  it("recognizes various header names", () => {
    const headers = [
      "question,answer",
      "term,definition",
      "prompt,response",
    ];
    for (const header of headers) {
      const csv = `${header}\nfoo,bar`;
      const cards = importCsv(csv);
      expect(cards).toHaveLength(1);
      expect(cards[0]).toEqual({ front: "foo", back: "bar" });
    }
  });

  it("skips blank lines", () => {
    const csv = "a,b\n\nc,d\n  \ne,f";
    const cards = importCsv(csv);
    expect(cards).toHaveLength(3);
  });

  it("throws on empty input", () => {
    expect(() => importCsv("")).toThrow("CSV file is empty");
  });

  it("throws when no valid cards found", () => {
    expect(() => importCsv("single-column-only")).toThrow("No valid cards found");
  });
});

// ── CSV Export ──────────────────────────────────────────────────────────────

describe("exportCsv", () => {
  it("exports cards with header row", () => {
    const cards: ExportCard[] = [
      { content: "What is 2+2?\n\n---\n\n4" },
      { content: "Capital of France?\n\n---\n\nParis" },
    ];
    const csv = exportCsv(cards);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("front,back");
    expect(lines[1]).toBe("What is 2+2?,4");
    expect(lines[2]).toBe("Capital of France?,Paris");
  });

  it("escapes commas in content", () => {
    const cards: ExportCard[] = [
      { content: "Hello, world\n\n---\n\nGoodbye, world" },
    ];
    const csv = exportCsv(cards);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('"Hello, world","Goodbye, world"');
  });

  it("escapes quotes in content", () => {
    const cards: ExportCard[] = [
      { content: 'Say "hello"\n\n---\n\nSay "bye"' },
    ];
    const csv = exportCsv(cards);
    expect(csv).toContain('""hello""');
  });

  it("handles cards with no separator (front only)", () => {
    const cards: ExportCard[] = [{ content: "Just front content" }];
    const csv = exportCsv(cards);
    const lines = csv.split("\n");
    expect(lines[1]).toBe("Just front content,");
  });
});

// ── CSV Roundtrip ──────────────────────────────────────────────────────────

describe("CSV roundtrip", () => {
  it("import → export → import preserves data", () => {
    const original: ExportCard[] = [
      { content: "Question 1\n\n---\n\nAnswer 1" },
      { content: "Question 2\n\n---\n\nAnswer 2" },
    ];
    const csv = exportCsv(original);
    const imported = importCsv(csv);
    expect(imported).toEqual([
      { front: "Question 1", back: "Answer 1" },
      { front: "Question 2", back: "Answer 2" },
    ]);
  });
});

// ── JSON Import ─────────────────────────────────────────────────────────────

describe("importJson", () => {
  it("parses koku-v1 format", () => {
    const json: JsonDeckExport = {
      format: "koku-v1",
      deck: { name: "Test Deck", description: "A test" },
      cards: [
        {
          content: "Front 1\n\n---\n\nBack 1",
          state: 0,
          stability: 0,
          difficulty: 0,
          reps: 0,
          lapses: 0,
          due: new Date().toISOString(),
          last_review: null,
        },
      ],
      exported_at: new Date().toISOString(),
    };
    const result = importJson(JSON.stringify(json));
    expect(result.deckName).toBe("Test Deck");
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0]).toEqual({ front: "Front 1", back: "Back 1" });
  });

  it("parses generic array format with front/back", () => {
    const data = [
      { front: "Q1", back: "A1" },
      { front: "Q2", back: "A2" },
    ];
    const result = importJson(JSON.stringify(data));
    expect(result.deckName).toBe("Imported Deck");
    expect(result.cards).toEqual([
      { front: "Q1", back: "A1" },
      { front: "Q2", back: "A2" },
    ]);
  });

  it("parses generic array format with question/answer", () => {
    const data = [
      { question: "Q1", answer: "A1" },
    ];
    const result = importJson(JSON.stringify(data));
    expect(result.cards[0]).toEqual({ front: "Q1", back: "A1" });
  });

  it("throws on unrecognized format", () => {
    expect(() => importJson(JSON.stringify({ foo: "bar" }))).toThrow(
      "Unrecognized JSON format"
    );
  });

  it("throws on invalid JSON", () => {
    expect(() => importJson("not json")).toThrow();
  });
});

// ── JSON Export ─────────────────────────────────────────────────────────────

describe("exportJson", () => {
  it("exports in koku-v1 format", () => {
    const cards = [
      {
        content: "Front\n\n---\n\nBack",
        state: 0,
        stability: 0,
        difficulty: 0,
        reps: 0,
        lapses: 0,
        due: "2026-01-01T00:00:00.000Z",
        last_review: null,
      },
    ];
    const json = exportJson("My Deck", "Description", cards);
    const parsed = JSON.parse(json) as JsonDeckExport;
    expect(parsed.format).toBe("koku-v1");
    expect(parsed.deck.name).toBe("My Deck");
    expect(parsed.deck.description).toBe("Description");
    expect(parsed.cards).toHaveLength(1);
    expect(parsed.cards[0].content).toBe("Front\n\n---\n\nBack");
    expect(parsed.exported_at).toBeDefined();
  });

  it("preserves SRS metadata", () => {
    const cards = [
      {
        content: "Q\n\n---\n\nA",
        state: 2,
        stability: 5.5,
        difficulty: 3.2,
        reps: 10,
        lapses: 2,
        due: "2026-03-01T00:00:00.000Z",
        last_review: "2026-02-15T00:00:00.000Z",
      },
    ];
    const json = exportJson("Deck", null, cards);
    const parsed = JSON.parse(json) as JsonDeckExport;
    const card = parsed.cards[0];
    expect(card.state).toBe(2);
    expect(card.stability).toBe(5.5);
    expect(card.difficulty).toBe(3.2);
    expect(card.reps).toBe(10);
    expect(card.lapses).toBe(2);
    expect(card.last_review).toBe("2026-02-15T00:00:00.000Z");
  });
});

// ── JSON Roundtrip ──────────────────────────────────────────────────────────

describe("JSON roundtrip", () => {
  it("export → import preserves card data", () => {
    const cards = [
      {
        content: "Question\n\n---\n\nAnswer",
        state: 0,
        stability: 0,
        difficulty: 0,
        reps: 0,
        lapses: 0,
        due: new Date().toISOString(),
        last_review: null,
      },
    ];
    const json = exportJson("Roundtrip Deck", "desc", cards);
    const result = importJson(json);
    expect(result.deckName).toBe("Roundtrip Deck");
    expect(result.cards[0]).toEqual({ front: "Question", back: "Answer" });
  });
});

// ── Export All Decks ────────────────────────────────────────────────────────

describe("exportAllJson", () => {
  it("exports multiple decks in koku-all-v1 format", () => {
    const decks = [
      {
        name: "Deck 1",
        description: "First",
        cards: [
          {
            content: "Q1\n\n---\n\nA1",
            state: 0,
            stability: 0,
            difficulty: 0,
            reps: 0,
            lapses: 0,
            due: new Date().toISOString(),
            last_review: null,
          },
        ],
      },
      {
        name: "Deck 2",
        description: null,
        cards: [],
      },
    ];
    const json = exportAllJson(decks);
    const parsed = JSON.parse(json) as JsonAllDecksExport;
    expect(parsed.format).toBe("koku-all-v1");
    expect(parsed.decks).toHaveLength(2);
    expect(parsed.decks[0].name).toBe("Deck 1");
    expect(parsed.decks[0].cards).toHaveLength(1);
    expect(parsed.decks[1].name).toBe("Deck 2");
    expect(parsed.decks[1].cards).toHaveLength(0);
    expect(parsed.exported_at).toBeDefined();
  });
});

// ── APKG Export → Import Roundtrip ──────────────────────────────────────────

describe("APKG roundtrip", () => {
  it("export → import preserves card content", async () => {
    const cards: ExportCard[] = [
      { content: "What is TypeScript?\n\n---\n\nA typed superset of JavaScript" },
      { content: "What is React?\n\n---\n\nA UI library" },
    ];

    const blob = await exportApkg("Test Deck", cards);

    // Convert Blob to File for importApkg
    const file = new File([blob], "test.apkg", {
      type: "application/octet-stream",
    });

    const result = await importApkg(file);
    expect(result.deckName).toBe("Test Deck");
    expect(result.cards).toHaveLength(2);

    // APKG goes through markdown→HTML→markdown conversion, so check content is preserved
    expect(result.cards[0].front).toContain("TypeScript");
    expect(result.cards[0].back).toContain("typed superset of JavaScript");
    expect(result.cards[1].front).toContain("React");
    expect(result.cards[1].back).toContain("UI library");
  });

  it("handles cards with markdown formatting", async () => {
    const cards: ExportCard[] = [
      { content: "**Bold** question\n\n---\n\n`code answer`" },
    ];

    const blob = await exportApkg("Markdown Deck", cards);
    const file = new File([blob], "md.apkg", {
      type: "application/octet-stream",
    });

    const result = await importApkg(file);
    expect(result.cards).toHaveLength(1);
    // Content should survive the roundtrip (markdown → html → markdown)
    expect(result.cards[0].front).toContain("Bold");
    expect(result.cards[0].back).toContain("code answer");
  });

  it("throws on invalid apkg file", async () => {
    const file = new File(["not a zip"], "bad.apkg", {
      type: "application/octet-stream",
    });
    await expect(importApkg(file)).rejects.toThrow();
  });
});
