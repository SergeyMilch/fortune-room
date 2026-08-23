const fs = require("node:fs");
const path = require("node:path");

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Pass the edited Fortune Book JSON file path.");

const projectRoot = path.resolve(__dirname, "..");
const contentPath = path.join(
  projectRoot,
  "src/rituals/fortune-book/content/fortune-book-ru-1200.json",
);
const incoming = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));

if (incoming.ritual !== "fortune-book" || !Array.isArray(incoming.entries)) {
  throw new Error("The edited file is not a Fortune Book phrase export.");
}
if (incoming.entryCount !== incoming.entries.length) {
  throw new Error("The edited file entryCount does not match its entries array.");
}
if (incoming.entries.length !== content.entries.length) {
  throw new Error(`Expected ${content.entries.length} entries, got ${incoming.entries.length}.`);
}

const incomingById = new Map();
for (const entry of incoming.entries) {
  const valid = typeof entry.id === "string"
    && typeof entry.line === "string"
    && entry.line.trim()
    && typeof entry.interpretation === "string"
    && entry.interpretation.trim();
  if (!valid) throw new Error("Every edited entry must have a non-empty id, line and interpretation.");
  if (incomingById.has(entry.id)) throw new Error(`Duplicate edited entry ID: ${entry.id}`);
  incomingById.set(entry.id, {
    line: entry.line.trim(),
    interpretation: entry.interpretation.trim(),
  });
}

for (const entry of content.entries) {
  const edited = incomingById.get(entry.id);
  if (edited === undefined) throw new Error(`Missing edited entry ID: ${entry.id}`);
  entry.line = edited.line;
  entry.interpretation = edited.interpretation;
  incomingById.delete(entry.id);
}
if (incomingById.size > 0) {
  throw new Error(`Unknown edited entry ID: ${incomingById.keys().next().value}`);
}

fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
console.log(`Imported ${content.entries.length} Fortune Book entries.`);
