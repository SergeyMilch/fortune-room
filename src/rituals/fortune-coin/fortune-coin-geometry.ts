export const fortuneCoinArtwork = { width: 864, height: 1821 } as const;

export type FortuneCoinRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const source = {
  coin: { left: 267, top: 1020, width: 330, height: 330 },
  gesture: { left: 202, top: 945, width: 460, height: 475 },
} as const;

function mapRect(rect: FortuneCoinRect, scale: number, offsetX: number, offsetY: number) {
  return {
    left: offsetX + rect.left * scale,
    top: offsetY + rect.top * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function getFortuneCoinGeometry(viewportWidth: number, viewportHeight: number) {
  const scale = Math.max(
    viewportWidth / fortuneCoinArtwork.width,
    viewportHeight / fortuneCoinArtwork.height,
  );
  const artworkWidth = fortuneCoinArtwork.width * scale;
  const artworkHeight = fortuneCoinArtwork.height * scale;
  const artworkLeft = (viewportWidth - artworkWidth) / 2;
  const artworkTop = (viewportHeight - artworkHeight) / 2;

  return {
    scale,
    artwork: {
      left: artworkLeft,
      top: artworkTop,
      width: artworkWidth,
      height: artworkHeight,
    },
    coin: mapRect(source.coin, scale, artworkLeft, artworkTop),
    gesture: mapRect(source.gesture, scale, artworkLeft, artworkTop),
  };
}

export type FortuneCoinGeometry = ReturnType<typeof getFortuneCoinGeometry>;

