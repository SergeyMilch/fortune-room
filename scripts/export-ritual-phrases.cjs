const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const outputDirectory = path.join(projectRoot, "content-editing");

const exportsToCreate = [
  {
    ritual: "fortune-cookie",
    source: "src/rituals/fortune-cookie/content/fortune-cookie-ru-700.json",
    output: "fortune-cookie-phrases.json",
    select: ({ id, text }) => ({ id, text }),
  },
  {
    ritual: "fortune-book",
    source: "src/rituals/fortune-book/content/fortune-book-ru-1200.json",
    output: "fortune-book-phrases.json",
    select: ({ id, line, interpretation }) => ({ id, line, interpretation }),
  },
  {
    ritual: "crystal-ball",
    source: "assets/data/crystal-ball-predictions-ru.json",
    output: "crystal-ball-phrases.json",
    select: ({ id, text }) => ({ id, text }),
  },
];

fs.mkdirSync(outputDirectory, { recursive: true });

for (const item of exportsToCreate) {
  const source = JSON.parse(fs.readFileSync(path.join(projectRoot, item.source), "utf8"));
  const output = {
    ritual: item.ritual,
    source: item.source,
    entryCount: source.entries.length,
    entries: source.entries.map(item.select),
  };
  fs.writeFileSync(
    path.join(outputDirectory, item.output),
    `${JSON.stringify(output, null, 2)}\n`,
    "utf8",
  );
}
