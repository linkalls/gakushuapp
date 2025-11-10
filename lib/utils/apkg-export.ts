import type { Card, Deck } from "@/lib/db/drizzle-schema";
import { Database } from "bun:sqlite";
import JSZip from "jszip";

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
 * Generates an .apkg file from deck and card data.
 * @param deck The main deck to export.
 * @param childDecks All descendant decks.
 * @param cards All cards belonging to the decks.
 * @returns A Buffer containing the .apkg file content.
 */
export async function generateApkg(
  deck: Deck,
  childDecks: Deck[],
  cards: Card[]
): Promise<Buffer> {
  const db = new Database(":memory:");
  db.exec(ankiSchema);

  const now = Date.now();
  const creationTime = Math.floor(now / 1000);

  // --- Decks ---
  const decksToExport = [deck, ...childDecks];
  const ankiDecks: any = {
    "1": {
      id: 1,
      name: "Default",
      mod: creationTime,
      usn: 0,
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
      mod: creationTime,
      usn: 0,
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
    creationTime, // mod
    creationTime, // scm
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

  let noteIdCounter = creationTime;
  for (const card of cards) {
    const noteId = noteIdCounter++;
    const ankiDeckId = deckIdMap.get(card.deckId) || 1;

    // Insert Note
    noteStmt.run(
      noteId, // id
      card.id, // guid (using gakushukun ID for uniqueness)
      1, // mid (model ID)
      creationTime, // mod
      0, // usn
      "", // tags
      `${card.front}\x1f${card.back}`, // flds (fields separated by \x1f)
      0, // sfld
      0, // csum (checksum)
      0, // flags
      "" // data
    );

    // Insert Card
    cardStmt.run(
      noteId, // id (Anki uses note_id as card_id for basic cards)
      noteId, // nid (note id)
      ankiDeckId, // did (deck id)
      0, // ord (template order)
      creationTime, // mod
      0, // usn
      card.state === 0 ? 0 : 2, // type (0=new, 1=learn, 2=review)
      card.state === 0 ? 0 : 2, // queue
      card.due, // due
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

  return zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9,
    },
  });
}
