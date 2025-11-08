import { Database } from "bun:sqlite";

const db = new Database("/tmp/apkg_analysis/collection.anki21");

console.log("=== TABLES ===");
const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(tables);

console.log("\n=== COL TABLE SCHEMA ===");
const colSchema = db.query("PRAGMA table_info(col)").all();
console.log(colSchema);

console.log("\n=== COL DATA ===");
const colData = db.query("SELECT * FROM col LIMIT 1").all();
console.log(colData);

console.log("\n=== DECKS TABLE SCHEMA ===");
try {
  const decksSchema = db.query("PRAGMA table_info(decks)").all();
  console.log(decksSchema);
} catch (e) {
  console.log("No decks table");
}

console.log("\n=== NOTES TABLE SCHEMA ===");
const notesSchema = db.query("PRAGMA table_info(notes)").all();
console.log(notesSchema);

console.log("\n=== NOTES COUNT ===");
const notesCount = db.query("SELECT COUNT(*) as count FROM notes").get();
console.log(notesCount);

console.log("\n=== SAMPLE NOTES (first 5) ===");
const sampleNotes = db.query("SELECT id, guid, mid, mod, usn, tags, flds, sfld FROM notes LIMIT 5").all();
sampleNotes.forEach((note: any) => {
  console.log("\n--- Note ID:", note.id);
  console.log("GUID:", note.guid);
  console.log("Model ID:", note.mid);
  console.log("Modified:", note.mod);
  console.log("Tags:", note.tags);
  console.log("Fields:", note.flds);
  console.log("Sort Field:", note.sfld);
});

console.log("\n=== CARDS TABLE SCHEMA ===");
const cardsSchema = db.query("PRAGMA table_info(cards)").all();
console.log(cardsSchema);

console.log("\n=== CARDS COUNT ===");
const cardsCount = db.query("SELECT COUNT(*) as count FROM cards").get();
console.log(cardsCount);

console.log("\n=== SAMPLE CARDS (first 5) ===");
const sampleCards = db.query("SELECT id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses FROM cards LIMIT 5").all();
sampleCards.forEach((card: any) => {
  console.log("\n--- Card ID:", card.id);
  console.log("Note ID:", card.nid);
  console.log("Deck ID:", card.did);
  console.log("Ordinal:", card.ord);
  console.log("Type:", card.type, "(0=new, 1=learning, 2=review, 3=relearning)");
  console.log("Queue:", card.queue);
  console.log("Due:", card.due);
  console.log("Interval:", card.ivl);
  console.log("Factor:", card.factor);
  console.log("Reps:", card.reps);
  console.log("Lapses:", card.lapses);
});

console.log("\n=== CARD TYPES DISTRIBUTION ===");
const typesDist = db.query("SELECT type, COUNT(*) as count FROM cards GROUP BY type").all();
console.log(typesDist);

console.log("\n=== CHECKING COL.decks JSON ===");
const colDecks = db.query("SELECT decks FROM col").get() as any;
if (colDecks && colDecks.decks) {
  const decksJson = JSON.parse(colDecks.decks);
  console.log("\nDecks JSON structure:");
  console.log(JSON.stringify(decksJson, null, 2));
}

db.close();
