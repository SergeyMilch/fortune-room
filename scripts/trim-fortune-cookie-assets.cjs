const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const layerDirectory = path.resolve(__dirname, "../assets/fortune-cookie/layers");
const files = [
  "tray-clean-v1.png",
  "cookie-01-v1.png",
  "cookie-02-v1.png",
  "cookie-03-v1.png",
  "cookie-left-half-v1.png",
  "cookie-right-half-v1.png",
  "paper-strip-v1.png",
  "crumbs-01-v1.png",
  "crumbs-02-v1.png",
  "crumbs-03-v1.png",
];

const padding = 12;

for (const file of files) {
  const filePath = path.join(layerDirectory, file);
  const source = PNG.sync.read(fs.readFileSync(filePath));
  let left = source.width;
  let top = source.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (source.data[(y * source.width + x) * 4 + 3] <= 2) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) throw new Error(`No visible pixels in ${file}`);
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(source.width - 1, right + padding);
  bottom = Math.min(source.height - 1, bottom + padding);

  const width = right - left + 1;
  const height = bottom - top + 1;
  const target = new PNG({ width, height });
  PNG.bitblt(source, target, left, top, width, height, 0, 0);
  fs.writeFileSync(filePath, PNG.sync.write(target));
  process.stdout.write(`${file}: ${source.width}x${source.height} -> ${width}x${height}\n`);
}
