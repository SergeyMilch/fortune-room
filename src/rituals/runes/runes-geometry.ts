export const runesArtwork = { width: 841, height: 1870 } as const;

export type RunesRect = { left: number; top: number; width: number; height: number };

const source = {
  pouch: { left: 70, top: 455, width: 350, height: 315 },
  pouchGesture: { left: 35, top: 410, width: 430, height: 410 },
  castGesture: { left: 15, top: 420, width: 811, height: 1040 },
  stones: [
    { left: 172, top: 892, width: 128, height: 106 },
    { left: 359, top: 832, width: 128, height: 106 },
    { left: 553, top: 900, width: 128, height: 106 },
    { left: 107, top: 1035, width: 128, height: 106 },
    { left: 344, top: 1018, width: 128, height: 106 },
    { left: 617, top: 1052, width: 128, height: 106 },
    { left: 211, top: 1203, width: 128, height: 106 },
    { left: 486, top: 1218, width: 128, height: 106 },
  ],
  selectedSlots: [
    { left: 132, top: 1010, width: 176, height: 174 },
    { left: 351, top: 1010, width: 176, height: 174 },
    { left: 570, top: 1010, width: 176, height: 174 },
  ],
} as const;

export type RunesGeometry = {
  scale: number;
  artwork: RunesRect;
  pouch: RunesRect;
  pouchGesture: RunesRect;
  castGesture: RunesRect;
  stones: readonly RunesRect[];
  selectedSlots: readonly RunesRect[];
};

function mapRect(rect: RunesRect, scale: number, offsetX: number, offsetY: number): RunesRect {
  return {
    left: offsetX + rect.left * scale,
    top: offsetY + rect.top * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function getRunesGeometry(width: number, height: number): RunesGeometry {
  const scale = Math.max(width / runesArtwork.width, height / runesArtwork.height);
  const renderedWidth = runesArtwork.width * scale;
  const renderedHeight = runesArtwork.height * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;

  return {
    scale,
    artwork: { left: offsetX, top: offsetY, width: renderedWidth, height: renderedHeight },
    pouch: mapRect(source.pouch, scale, offsetX, offsetY),
    pouchGesture: mapRect(source.pouchGesture, scale, offsetX, offsetY),
    castGesture: mapRect(source.castGesture, scale, offsetX, offsetY),
    stones: source.stones.map((rect) => mapRect(rect, scale, offsetX, offsetY)),
    selectedSlots: source.selectedSlots.map((rect) => mapRect(rect, scale, offsetX, offsetY)),
  };
}
