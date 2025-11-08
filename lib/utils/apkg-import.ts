import { Database } from "bun:sqlite";
import { unlinkSync, writeFileSync } from "fs";
import JSZip from "jszip";
import path from "path";

interface AnkiNote {
  id: number;
  guid: string;
  mid: number;
  mod: number;
  tags: string;
  flds: string;
}

interface AnkiCard {
  id: number;
  nid: number;
  did: number;
  ord: number;
  type: number;
  queue: number;
  due: number;
  ivl: number;
  factor: number;
  reps: number;
  lapses: number;
}

interface AnkiDeck {
  id: number;
  name: string;
  desc: string;
}

export interface ImportResult {
  decksImported: number;
  cardsImported: number;
  errors: string[];
}

export async function parseApkgFile(fileBuffer: ArrayBuffer): Promise<{
  notes: AnkiNote[];
  cards: AnkiCard[];
  decks: Map<number, AnkiDeck>;
}> {
  // Unzip the .apkg file
  const zip = await JSZip.loadAsync(fileBuffer);

  // Find the SQLite database file (collection.anki2 or collection.anki21)
  let dbFile = zip.file("collection.anki21") || zip.file("collection.anki2");

  if (!dbFile) {
    throw new Error("No collection database found in .apkg file");
  }

  // Extract the database to a temporary file
  const dbBuffer = await dbFile.async("uint8array");
  const tempDbPath = path.join(process.cwd(), "data", `temp-${Date.now()}.db`);

  try {
    // Write the database to a temporary file
    writeFileSync(tempDbPath, dbBuffer);

    // Open the database with bun:sqlite
    const db = new Database(tempDbPath, { readonly: true });

    // Parse decks from col table
    const colResult = db.query("SELECT decks FROM col").get() as {
      decks: string;
    };
    const decksJson = JSON.parse(colResult.decks);
    const decks = new Map<number, AnkiDeck>();

    for (const [deckId, deckData] of Object.entries(
      decksJson as Record<string, any>
    )) {
      decks.set(parseInt(deckId), {
        id: parseInt(deckId),
        name: deckData.name,
        desc: deckData.desc || "",
      });
    }

    // Parse notes
    const notesResult = db
      .query("SELECT id, guid, mid, mod, tags, flds FROM notes")
      .all() as AnkiNote[];
    const notes: AnkiNote[] = notesResult || [];

    // Parse cards
    const cardsResult = db
      .query(
        "SELECT id, nid, did, ord, type, queue, due, ivl, factor, reps, lapses FROM cards"
      )
      .all() as AnkiCard[];
    const cards: AnkiCard[] = cardsResult || [];

    db.close();

    // Clean up temporary file
    unlinkSync(tempDbPath);

    return { notes, cards, decks };
  } catch (error) {
    // Clean up temporary file on error
    try {
      unlinkSync(tempDbPath);
    } catch {
      // Ignore cleanup errors
    }
    throw error;
  }
}
