import JSZip from "jszip";
import initSqlJs, { type Database } from "sql.js";
import TurndownService from "turndown";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ImportedCard {
  front: string;
  back: string;
}

export interface ImportResult {
  deckName: string;
  cards: ImportedCard[];
}

export interface ExportCard {
  content: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

function htmlToMarkdown(html: string): string {
  // Strip Anki-specific sound/media tags
  let cleaned = html.replace(/\[sound:[^\]]+\]/g, "");
  // Convert <br> variants to newlines before turndown
  cleaned = cleaned.replace(/<br\s*\/?>/gi, "\n");
  return turndown.turndown(cleaned).trim();
}

function markdownToHtml(md: string): string {
  // Simple markdown-to-HTML for Anki export (basic conversion)
  let html = md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(.+?)\*/g, "<i>$1</i>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/```(\w*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");

  // Convert remaining newlines to <br>
  html = html.replace(/\n/g, "<br>");
  return html;
}

function cardToContent(front: string, back: string): string {
  return `${front}\n\n---\n\n${back}`;
}

function contentToFrontBack(content: string): { front: string; back: string } {
  const parts = content.split("\n---\n");
  if (parts.length < 2) {
    return { front: content.trim(), back: "" };
  }
  return {
    front: parts[0].trim(),
    back: parts.slice(1).join("\n---\n").trim(),
  };
}

// ── SQL.js initialization ──────────────────────────────────────────────────

let sqlPromise: ReturnType<typeof initSqlJs> | null = null;

function getSql() {
  if (!sqlPromise) {
    sqlPromise = initSqlJs({
      locateFile: () => "/sql-wasm.wasm",
    });
  }
  return sqlPromise;
}

// ── APKG Import ────────────────────────────────────────────────────────────

export async function importApkg(file: File): Promise<ImportResult> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  // Find the collection database file
  let dbFile = zip.file("collection.anki21") ?? zip.file("collection.anki2");
  if (!dbFile) {
    // Some .apkg files store it differently
    const files = Object.keys(zip.files);
    const dbName = files.find(
      (f) => f.endsWith(".anki21") || f.endsWith(".anki2"),
    );
    if (dbName) dbFile = zip.file(dbName);
  }

  if (!dbFile) {
    throw new Error(
      "Invalid .apkg file: no collection database found",
    );
  }

  const SQL = await getSql();
  const dbData = await dbFile.async("uint8array");
  const db: Database = new SQL.Database(dbData);

  try {
    // Get deck name from col table
    let deckName = file.name.replace(/\.apkg$/i, "");
    try {
      const colResult = db.exec("SELECT decks FROM col LIMIT 1");
      if (colResult.length > 0 && colResult[0].values.length > 0) {
        const decksJson = JSON.parse(colResult[0].values[0][0] as string);
        // Find the first non-default deck, or use the first deck
        const deckEntries = Object.values(decksJson) as { name: string }[];
        const nonDefault = deckEntries.find(
          (d) => d.name !== "Default" && d.name !== "default",
        );
        if (nonDefault) deckName = nonDefault.name;
        else if (deckEntries.length > 0) deckName = deckEntries[0].name;
      }
    } catch {
      // Use filename as fallback
    }

    // Extract notes
    const notes = db.exec("SELECT flds FROM notes");
    if (notes.length === 0 || notes[0].values.length === 0) {
      throw new Error("No notes found in this .apkg file");
    }

    const cards: ImportedCard[] = notes[0].values.map((row) => {
      const fields = (row[0] as string).split("\x1f");
      const front = htmlToMarkdown(fields[0] ?? "");
      const back = htmlToMarkdown(fields[1] ?? "");
      return { front, back };
    });

    return { deckName, cards };
  } finally {
    db.close();
  }
}

// ── APKG Export ────────────────────────────────────────────────────────────

export async function exportApkg(
  deckName: string,
  cards: ExportCard[],
): Promise<Blob> {
  const SQL = await getSql();
  const db: Database = new SQL.Database();

  try {
    const now = Math.floor(Date.now() / 1000);
    const deckId = Date.now();
    const modelId = deckId + 1;

    // Create Anki schema
    db.run(`
      CREATE TABLE col (
        id INTEGER PRIMARY KEY,
        crt INTEGER NOT NULL,
        mod INTEGER NOT NULL,
        scm INTEGER NOT NULL,
        ver INTEGER NOT NULL,
        dty INTEGER NOT NULL,
        usn INTEGER NOT NULL,
        ls INTEGER NOT NULL,
        conf TEXT NOT NULL,
        models TEXT NOT NULL,
        decks TEXT NOT NULL,
        dconf TEXT NOT NULL,
        tags TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE notes (
        id INTEGER PRIMARY KEY,
        guid TEXT NOT NULL,
        mid INTEGER NOT NULL,
        mod INTEGER NOT NULL,
        usn INTEGER NOT NULL,
        tags TEXT NOT NULL,
        flds TEXT NOT NULL,
        sfld TEXT NOT NULL,
        csum INTEGER NOT NULL,
        flags INTEGER NOT NULL,
        data TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE cards (
        id INTEGER PRIMARY KEY,
        nid INTEGER NOT NULL,
        did INTEGER NOT NULL,
        ord INTEGER NOT NULL,
        mod INTEGER NOT NULL,
        usn INTEGER NOT NULL,
        type INTEGER NOT NULL,
        queue INTEGER NOT NULL,
        due INTEGER NOT NULL,
        ivl INTEGER NOT NULL,
        factor INTEGER NOT NULL,
        reps INTEGER NOT NULL,
        lapses INTEGER NOT NULL,
        "left" INTEGER NOT NULL,
        odue INTEGER NOT NULL,
        odid INTEGER NOT NULL,
        flags INTEGER NOT NULL,
        data TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE revlog (
        id INTEGER PRIMARY KEY,
        cid INTEGER NOT NULL,
        usn INTEGER NOT NULL,
        ease INTEGER NOT NULL,
        ivl INTEGER NOT NULL,
        lastIvl INTEGER NOT NULL,
        factor INTEGER NOT NULL,
        time INTEGER NOT NULL,
        type INTEGER NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE graves (
        usn INTEGER NOT NULL,
        oid INTEGER NOT NULL,
        type INTEGER NOT NULL
      )
    `);

    // Basic model (front/back)
    const model = {
      [modelId]: {
        id: modelId,
        name: "Basic",
        type: 0,
        mod: now,
        usn: -1,
        sortf: 0,
        did: deckId,
        tmpls: [
          {
            name: "Card 1",
            ord: 0,
            qfmt: "{{Front}}",
            afmt: '{{FrontSide}}<hr id="answer">{{Back}}',
            bqfmt: "",
            bafmt: "",
            did: null,
            bfont: "",
            bsize: 0,
          },
        ],
        flds: [
          {
            name: "Front",
            ord: 0,
            sticky: false,
            rtl: false,
            font: "Arial",
            size: 20,
            description: "",
            plainText: false,
            collapsed: false,
            excludeFromSearch: false,
          },
          {
            name: "Back",
            ord: 1,
            sticky: false,
            rtl: false,
            font: "Arial",
            size: 20,
            description: "",
            plainText: false,
            collapsed: false,
            excludeFromSearch: false,
          },
        ],
        css: ".card { font-family: arial; font-size: 20px; text-align: center; color: black; background-color: white; }",
        latexPre:
          "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
        latexPost: "\\end{document}",
        latexsvg: false,
        req: [[0, "any", [0]]],
        tags: [],
        vers: [],
      },
    };

    const decks = {
      1: {
        id: 1,
        name: "Default",
        mod: now,
        usn: -1,
        lrnToday: [0, 0],
        revToday: [0, 0],
        newToday: [0, 0],
        timeToday: [0, 0],
        collapsed: false,
        browserCollapsed: false,
        desc: "",
        dyn: 0,
        conf: 1,
        extendNew: 0,
        extendRev: 0,
      },
      [deckId]: {
        id: deckId,
        name: deckName,
        mod: now,
        usn: -1,
        lrnToday: [0, 0],
        revToday: [0, 0],
        newToday: [0, 0],
        timeToday: [0, 0],
        collapsed: false,
        browserCollapsed: false,
        desc: "",
        dyn: 0,
        conf: 1,
        extendNew: 0,
        extendRev: 0,
      },
    };

    const dconf = {
      1: {
        id: 1,
        name: "Default",
        mod: 0,
        usn: 0,
        maxTaken: 60,
        autoplay: true,
        timer: 0,
        replayq: true,
        new: {
          bury: false,
          delays: [1, 10],
          initialFactor: 2500,
          ints: [1, 4, 0],
          order: 1,
          perDay: 20,
        },
        rev: {
          bury: false,
          ease4: 1.3,
          ivlFct: 1,
          maxIvl: 36500,
          perDay: 200,
          hardFactor: 1.2,
        },
        lapse: {
          delays: [10],
          leechAction: 1,
          leechFails: 8,
          minInt: 1,
          mult: 0,
        },
      },
    };

    const conf = {
      activeDecks: [1],
      curDeck: 1,
      newSpread: 0,
      collapseTime: 1200,
      timeLim: 0,
      estTimes: true,
      dueCounts: true,
      curModel: modelId,
      nextPos: cards.length + 1,
      sortType: "noteFld",
      sortBackwards: false,
      addToCur: true,
    };

    db.run(
      "INSERT INTO col VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        1,
        now,
        now,
        now,
        11,
        0,
        0,
        0,
        JSON.stringify(conf),
        JSON.stringify(model),
        JSON.stringify(decks),
        JSON.stringify(dconf),
        "{}",
      ],
    );

    // Insert notes and cards
    cards.forEach((card, i) => {
      const { front, back } = contentToFrontBack(card.content);
      const frontHtml = markdownToHtml(front);
      const backHtml = markdownToHtml(back);
      const noteId = now * 1000 + i;
      const cardId = noteId + 1;
      const guid = generateGuid();

      // Simple checksum (first 8 chars of front field)
      const csum = simpleChecksum(front);

      db.run(
        "INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          noteId,
          guid,
          modelId,
          now,
          -1,
          "",
          `${frontHtml}\x1f${backHtml}`,
          frontHtml,
          csum,
          0,
          "",
        ],
      );

      db.run(
        'INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          cardId,
          noteId,
          deckId,
          0,
          now,
          -1,
          0, // type: new
          0, // queue: new
          i, // due (position for new cards)
          0, // ivl
          0, // factor
          0, // reps
          0, // lapses
          0, // left
          0, // odue
          0, // odid
          0, // flags
          "", // data
        ],
      );
    });

    // Export database to binary
    const dbBinary = db.export();
    const zip = new JSZip();
    zip.file("collection.anki2", dbBinary);
    zip.file("media", "{}");

    return await zip.generateAsync({ type: "blob" });
  } finally {
    db.close();
  }
}

function generateGuid(): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 10; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function simpleChecksum(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// ── CSV Import ─────────────────────────────────────────────────────────────

export function importCsv(text: string): ImportedCard[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) throw new Error("CSV file is empty");

  // Detect delimiter: tab, semicolon, or comma
  const firstLine = lines[0];
  let delimiter = ",";
  if (firstLine.includes("\t")) delimiter = "\t";
  else if (firstLine.includes(";")) delimiter = ";";

  // Check if first line is a header
  const firstFields = parseCsvLine(firstLine, delimiter);
  const isHeader =
    firstFields.length >= 2 &&
    /^(front|question|term|prompt)/i.test(firstFields[0]) &&
    /^(back|answer|definition|response)/i.test(firstFields[1]);

  const startIdx = isHeader ? 1 : 0;
  const cards: ImportedCard[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i], delimiter);
    if (fields.length >= 2 && (fields[0].trim() || fields[1].trim())) {
      cards.push({
        front: fields[0].trim(),
        back: fields[1].trim(),
      });
    }
  }

  if (cards.length === 0) {
    throw new Error(
      "No valid cards found. CSV should have at least 2 columns (front, back).",
    );
  }

  return cards;
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

// ── CSV Export ──────────────────────────────────────────────────────────────

export function exportCsv(cards: ExportCard[]): string {
  const header = "front,back";
  const rows = cards.map((card) => {
    const { front, back } = contentToFrontBack(card.content);
    return `${csvEscape(front)},${csvEscape(back)}`;
  });
  return [header, ...rows].join("\n");
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ── JSON Import/Export ─────────────────────────────────────────────────────

export interface JsonDeckExport {
  format: "koku-v1";
  deck: {
    name: string;
    description: string | null;
  };
  cards: {
    content: string;
    state: number;
    stability: number;
    difficulty: number;
    reps: number;
    lapses: number;
    due: string;
    last_review: string | null;
  }[];
  exported_at: string;
}

export function importJson(text: string): ImportResult {
  const data = JSON.parse(text);

  // Handle Koku native format
  if (data.format === "koku-v1") {
    const json = data as JsonDeckExport;
    return {
      deckName: json.deck.name,
      cards: json.cards.map((c) => {
        const parts = c.content.split("\n---\n");
        return {
          front: parts[0]?.trim() ?? "",
          back: parts.slice(1).join("\n---\n").trim(),
        };
      }),
    };
  }

  // Handle generic JSON array of {front, back} objects
  if (Array.isArray(data)) {
    return {
      deckName: "Imported Deck",
      cards: data.map((item: { front?: string; back?: string; question?: string; answer?: string }) => ({
        front: (item.front ?? item.question ?? "").toString(),
        back: (item.back ?? item.answer ?? "").toString(),
      })),
    };
  }

  throw new Error("Unrecognized JSON format");
}

export function exportJson(
  deckName: string,
  description: string | null,
  cards: { content: string; state: number; stability: number; difficulty: number; reps: number; lapses: number; due: string; last_review: string | null }[],
): string {
  const data: JsonDeckExport = {
    format: "koku-v1",
    deck: { name: deckName, description },
    cards: cards.map((c) => ({
      content: c.content,
      state: c.state,
      stability: c.stability,
      difficulty: c.difficulty,
      reps: c.reps,
      lapses: c.lapses,
      due: c.due,
      last_review: c.last_review,
    })),
    exported_at: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// ── Export All Decks ───────────────────────────────────────────────────────

export interface JsonAllDecksExport {
  format: "koku-all-v1";
  decks: {
    name: string;
    description: string | null;
    cards: {
      content: string;
      state: number;
      stability: number;
      difficulty: number;
      reps: number;
      lapses: number;
      due: string;
      last_review: string | null;
    }[];
  }[];
  exported_at: string;
}

export function exportAllJson(
  decks: {
    name: string;
    description: string | null;
    cards: { content: string; state: number; stability: number; difficulty: number; reps: number; lapses: number; due: string; last_review: string | null }[];
  }[],
): string {
  const data: JsonAllDecksExport = {
    format: "koku-all-v1",
    decks,
    exported_at: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// ── Download helper ────────────────────────────────────────────────────────

export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string,
) {
  const blob =
    content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
