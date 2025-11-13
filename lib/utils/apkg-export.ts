import type { cards, decks } from "@/lib/db/drizzle-schema";
import { Database } from "bun:sqlite";
import { createHash } from "crypto";
import JSZip from "jszip";

type Decks = typeof decks.$inferSelect;
type Cards = typeof cards.$inferSelect;

// This is a simplified version. A real implementation would need more
// detailed schema and data mapping from FSRS to Anki's format.

const ankiSchema = `
-- col table stores collection-level information
CREATE TABLE col (
    id              integer primary key,
    crt             integer not null,
    mod             integer not null,
    scm             integer not null,
    ver             integer not null,
    dty             integer not null,
    usn             integer not null,
    ls              integer not null,
    conf            text not null,
    models          text not null,
    decks           text not null,
    dconf           text not null,
    tags            text not null
);

-- notes table for the actual content (e.g., front/back of a card)
CREATE TABLE notes (
    id              integer primary key,
    guid            text not null,
    mid             integer not null,
    mod             integer not null,
    usn             integer not null,
    tags            text not null,
    flds            text not null,
    sfld            integer not null,
    csum            integer not null,
    flags           integer not null,
    data            text not null
);

-- cards table links notes to decks and handles scheduling
CREATE TABLE cards (
    id              integer primary key,
    nid             integer not null,
    did             integer not null,
    ord             integer not null,
    mod             integer not null,
    usn             integer not null,
    type            integer not null,
    queue           integer not null,
    due             integer not null,
    ivl             integer not null,
    factor          integer not null,
    reps            integer not null,
    lapses          integer not null,
    left            integer not null,
    odue            integer not null,
    odid            integer not null,
    flags           integer not null,
    data            text not null
);

-- revlog table for review history
CREATE TABLE revlog (
    id              integer primary key,
    cid             integer not null,
    usn             integer not null,
    ease            integer not null,
    ivl             integer not null,
    lastIvl         integer not null,
    factor          integer not null,
    time            integer not null,
    type            integer not null
);

-- graves table for deleted items (cards, notes, decks)
CREATE TABLE graves (
    usn             integer not null,
    oid             integer not null,
    type            integer not null
);
`;

// Default Anki configuration JSON objects
const defaultConf = {
  // ... can be extended
};
const defaultModels = {
  "1": {
    id: 1,
    name: "Basic",
    type: 0,
    mod: 0,
    usn: 0,
    sortf: 0,
    did: 1,
    tmpls: [
      {
        name: "Card 1",
        ord: 0,
        qfmt: "{{Front}}",
        afmt: "{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}",
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
        media: [],
      },
      {
        name: "Back",
        ord: 1,
        sticky: false,
        rtl: false,
        font: "Arial",
        size: 20,
        media: [],
      },
    ],
    css: ".card {\n font-family: arial;\n font-size: 20px;\n text-align: center;\n color: black;\n background-color: white;\n}\n",
    latexPre:
      "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
    latexPost: "\\end{document}",
  },
};
const defaultDconf = {
  "1": {
    name: "Default",
    replayq: true,
    lapse: {
      leechFails: 8,
      minInt: 1,
      delays: [10],
      leechAction: 0,
      mult: 0,
    },
    rev: {
      perDay: 200,
      ease4: 1.3,
      fuzz: 0.05,
      maxIvl: 36500,
      ivlFct: 1,
      bury: true,
      hardFactor: 1.2,
    },
    timer: 0,
    maxTaken: 60,
    usn: 0,
    new: {
      perDay: 20,
      delays: [1, 10],
      separate: true,
      ints: [1, 4, 7],
      initialFactor: 2500,
      bury: true,
      order: 1,
    },
    mod: 0,
    id: 1,
    autoplay: true,
  },
};

/**
 * Calculates the checksum for an Anki note field.
 * @param field The first field of the note.
 * @returns The checksum as a number.
 */
function calculateChecksum(field: string): number {
  const hash = createHash("sha1").update(field).digest("hex");
  // Anki's checksum is the first 8 characters of the SHA1 hash, parsed as a base-10 integer.
  return parseInt(hash.substring(0, 8), 16);
}

/**
 * Generates an .apkg file from deck and card data.
 * @param deck The main deck to export.
 * @param childDecks All descendant decks.
 * @param cards All cards belonging to the decks.
 * @returns A Buffer containing the .apkg file content.
 */
export async function generateApkg(
  deck: Decks,
  childDecks: Decks[],
  cards: Cards[]
): Promise<Buffer> {
  const db = new Database(":memory:");
  db.exec(ankiSchema);

  const now = Date.now();
  const modTime = now; // Milliseconds for mod/scm
  const creationTime = Math.floor(modTime / 1000); // Seconds for crt

  // --- Decks ---
  const decksToExport = [deck, ...childDecks];
  const ankiDecks: any = {
    "1": {
      id: 1,
      name: "Default",
      mod: modTime,
      usn: 0,
      // Fields required by Anki
      collapsed: true,
      dyn: 0,
      extendNew: 10,
      extendRev: 50,
      newToday: [0, 0],
      revToday: [0, 0],
      lrnToday: [0, 0],
      timeToday: [0, 0],
      conf: 1,
      desc: "",
    },
  };
  const deckIdMap = new Map<string, number>(); // gakushukun ID -> Anki ID
  let ankiDeckIdCounter = 2;

  for (const d of decksToExport) {
    const ankiId = ankiDeckIdCounter++;
    deckIdMap.set(d.id, ankiId);
    ankiDecks[ankiId.toString()] = {
      id: ankiId,
      name: d.deckPath, // Use full path for hierarchy
      mod: modTime,
      usn: 0,
      // Fields required by Anki
      collapsed: true,
      dyn: 0,
      extendNew: 10,
      extendRev: 50,
      newToday: [0, 0], // [day, count]
      revToday: [0, 0],
      lrnToday: [0, 0],
      timeToday: [0, 0],
      conf: 1,
      desc: d.description || "",
    };
  }

  // --- Collection ---
  const colStmt = db.prepare(
    "INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  colStmt.run(
    1, // id
    creationTime, // crt
    modTime, // mod
    modTime, // scm
    11, // ver (Anki version)
    0, // dty
    0, // usn
    0, // ls
    JSON.stringify(defaultConf),
    JSON.stringify(defaultModels),
    JSON.stringify(ankiDecks),
    JSON.stringify(defaultDconf),
    "{}" // tags
  );

  // --- Notes and Cards ---
  const noteStmt = db.prepare(
    "INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const cardStmt = db.prepare(
    "INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  // Use a timestamp-based counter to ensure unique IDs for notes and cards
  let idCounter = modTime;
  for (const card of cards) {
    const noteId = idCounter++;
    const cardId = idCounter++; // Ensure card ID is unique and different from note ID
    const ankiDeckId = deckIdMap.get(card.deckId) || 1;
    const frontField = card.front;
    const checksum = calculateChecksum(frontField);

    // Insert Note
    noteStmt.run(
      noteId, // id
      card.id, // guid (using gakushukun ID for uniqueness)
      1, // mid (model ID)
      modTime, // mod
      0, // usn
      "", // tags
      `${frontField}\x1f${card.back}`, // flds (fields separated by \x1f)
      frontField, // sfld (sort field, usually the first field)
      checksum, // csum (checksum of the first field)
      0, // flags
      "" // data
    );

    // Insert Card
    const isNew = card.state === 0;
    cardStmt.run(
      cardId, // id
      noteId, // nid (note id)
      ankiDeckId, // did (deck id)
      0, // ord (template order)
      modTime, // mod
      0, // usn
      isNew ? 0 : 2, // type (0=new, 1=learn, 2=review)
      isNew ? 0 : 2, // queue
      isNew ? cardId : card.due, // due (for new cards, use cardId; for others, use due date)
      card.scheduledDays, // ivl (interval)
      0, // factor
      card.reps, // reps
      card.lapses, // lapses
      0, // left
      0, // odue
      0, // odid
      0, // flags
      "" // data
    );
  }

  // --- ZIP everything ---
  const zip = new JSZip();
  const dbBuffer = db.serialize();
  zip.file("collection.anki2", dbBuffer);
  zip.file("media", "{}"); // Empty media file

  db.close();

  // 修正後
  const uint8Buffer = await zip.generateAsync({
    type: "uint8array", // ← これに変更
    compression: "DEFLATE",
    compressionOptions: {
      level: 9,
    },
  });

  return Buffer.from(uint8Buffer); // uint8arrayからBufferに変換
}
