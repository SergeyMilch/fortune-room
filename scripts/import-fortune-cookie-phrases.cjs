const fs = require("node:fs");
const path = require("node:path");

const inputPath = process.argv[2];
if (!inputPath) throw new Error("Pass the edited Fortune Cookie JSON file path.");

const projectRoot = path.resolve(__dirname, "..");
const contentPath = path.join(
  projectRoot,
  "src/rituals/fortune-cookie/content/fortune-cookie-ru-700.json",
);
const incoming = JSON.parse(fs.readFileSync(path.resolve(inputPath), "utf8"));
const content = JSON.parse(fs.readFileSync(contentPath, "utf8"));

if (incoming.ritual !== "fortune-cookie" || !Array.isArray(incoming.entries)) {
  throw new Error("The edited file is not a Fortune Cookie phrase export.");
}
if (incoming.entryCount !== incoming.entries.length) {
  throw new Error("The edited file entryCount does not match its entries array.");
}
if (incoming.entries.length !== content.entries.length) {
  throw new Error(`Expected ${content.entries.length} phrases, got ${incoming.entries.length}.`);
}

const incomingById = new Map();
for (const entry of incoming.entries) {
  if (typeof entry.id !== "string" || typeof entry.text !== "string" || !entry.text.trim()) {
    throw new Error("Every edited phrase must have a non-empty id and text.");
  }
  if (incomingById.has(entry.id)) throw new Error(`Duplicate edited phrase ID: ${entry.id}`);
  incomingById.set(entry.id, entry.text.trim());
}

for (const entry of content.entries) {
  const text = incomingById.get(entry.id);
  if (text === undefined) throw new Error(`Missing edited phrase ID: ${entry.id}`);
  entry.text = text;
  incomingById.delete(entry.id);
}
if (incomingById.size > 0) {
  throw new Error(`Unknown edited phrase ID: ${incomingById.keys().next().value}`);
}

fs.writeFileSync(contentPath, `${JSON.stringify(content, null, 2)}\n`, "utf8");
console.log(`Imported ${content.entries.length} Fortune Cookie phrases.`);
