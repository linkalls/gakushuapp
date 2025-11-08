import { Database } from "bun:sqlite";

const db = new Database("/tmp/apkg_analysis/collection.anki21");

console.log("=== CARDS COUNT ===");
const cardsCount = db.query("SELECT COUNT(*) as count FROM cards").get();
console.log(cardsCount);

console.log("\n=== CARD TYPES DISTRIBUTION ===");
const typesDist = db.query("SELECT type, queue, COUNT(*) as count FROM cards GROUP BY type, queue").all();
console.log(typesDist);

console.log("\n=== SAMPLE NEW CARDS (type=0, first 3) ===");
const newCards = db.query(`
  SELECT c.id, c.nid, c.did, c.type, c.queue, c.due, c.ivl, c.factor, c.reps, c.lapses,
         n.flds, n.tags
  FROM cards c
  JOIN notes n ON c.nid = n.id
  WHERE c.type = 0
  LIMIT 3
`).all();

newCards.forEach((card: any) => {
  console.log("\n--- NEW Card ID:", card.id);
  console.log("Note ID:", card.nid);
  console.log("Deck ID:", card.did);
  console.log("Type:", card.type, "(0=new)");
  console.log("Queue:", card.queue);
  console.log("Due:", card.due, "(for new cards, this is the order in queue)");
  console.log("Interval:", card.ivl);
  console.log("Factor:", card.factor);
  console.log("Reps:", card.reps);
  console.log("Lapses:", card.lapses);
  console.log("Tags:", card.tags);
  const fields = card.flds.split('\x1f');
  console.log("Front:", fields[0]);
  console.log("Back:", fields[1]);
  if (fields[2]) console.log("Extra:", fields[2]);
});

console.log("\n=== SAMPLE REVIEW CARDS (type=2, first 3) ===");
const reviewCards = db.query(`
  SELECT c.id, c.nid, c.did, c.type, c.queue, c.due, c.ivl, c.factor, c.reps, c.lapses,
         n.flds, n.tags
  FROM cards c
  JOIN notes n ON c.nid = n.id
  WHERE c.type = 2
  LIMIT 3
`).all();

reviewCards.forEach((card: any) => {
  console.log("\n--- REVIEW Card ID:", card.id);
  console.log("Note ID:", card.nid);
  console.log("Deck ID:", card.did);
  console.log("Type:", card.type, "(2=review)");
  console.log("Queue:", card.queue);
  console.log("Due:", card.due, "(days since collection creation)");
  console.log("Interval:", card.ivl, "days");
  console.log("Factor:", card.factor, "(ease factor * 1000)");
  console.log("Reps:", card.reps);
  console.log("Lapses:", card.lapses);
  console.log("Tags:", card.tags);
  const fields = card.flds.split('\x1f');
  console.log("Front:", fields[0]);
  console.log("Back:", fields[1]);
});

console.log("\n=== CHECKING COL.crt (collection creation time) ===");
const colCrt = db.query("SELECT crt FROM col").get() as any;
console.log("Collection creation timestamp:", colCrt.crt);
console.log("Collection creation date:", new Date(colCrt.crt * 1000).toISOString());

db.close();
