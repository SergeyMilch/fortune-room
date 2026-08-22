export type FortuneBookRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
};

export type FortuneBookPagePlane = {
  rows: readonly FortuneBookLinePlane[];
};

export type FortuneBookLinePlane = {
  frame: FortuneBookRect;
  rotationDeg: number;
};

export const fortuneBookArtwork = {
  width: 941,
  height: 1671,
} as const;

const sourceGeometry = {
  closedBook: { left: 72, top: 430, width: 770, height: 825, borderRadius: 56 },
  interpretation: { left: 132, top: 205, width: 677, height: 230, borderRadius: 24 },
  leftPage: {
    topLeft: { x: 185, y: 555 },
    topRight: { x: 500, y: 585 },
    bottomLeft: { x: 91, y: 1019 },
    bottomRight: { x: 365, y: 1080 },
    textRotationDeg: 11.5,
    textLeftInsetTop: 40,
    textLeftInsetBottom: 8,
    textRightInset: 4,
  },
  rightPage: {
    topLeft: { x: 567, y: 625 },
    topRight: { x: 825, y: 654 },
    bottomLeft: { x: 430, y: 1081 },
    bottomRight: { x: 744, y: 1118 },
    textRotationDeg: 9,
    textLeftInsetTop: 4,
    textLeftInsetBottom: 4,
    textRightInset: 4,
  },
} as const;

const lineCountPerPage = 10;
const lineHeight = 38;

function makeSourceLinePlanes(
  page: (typeof sourceGeometry)["leftPage"] | (typeof sourceGeometry)["rightPage"],
): FortuneBookLinePlane[] {
  return Array.from({ length: lineCountPerPage }, (_, index) => {
    const progress = index / (lineCountPerPage - 1);
    const leftX = page.topLeft.x + (page.bottomLeft.x - page.topLeft.x) * progress;
    const leftY = page.topLeft.y + (page.bottomLeft.y - page.topLeft.y) * progress;
    const rightX = page.topRight.x + (page.bottomRight.x - page.topRight.x) * progress;
    const rightY = page.topRight.y + (page.bottomRight.y - page.topRight.y) * progress;
    const rotationDeg = page.textRotationDeg;
    const textLeftInset =
      page.textLeftInsetTop +
      (page.textLeftInsetBottom - page.textLeftInsetTop) * progress;

    return {
      frame: {
        left: leftX + textLeftInset,
        top: (leftY + rightY) / 2 - lineHeight / 2,
        width: rightX - leftX - textLeftInset - page.textRightInset,
        height: lineHeight,
        borderRadius: 7,
      },
      rotationDeg,
    };
  });
}

export type FortuneBookGeometry = ReturnType<typeof getFortuneBookGeometry>;

export function getFortuneBookGeometry(viewportWidth: number, viewportHeight: number) {
  const scale = Math.max(
    viewportWidth / fortuneBookArtwork.width,
    viewportHeight / fortuneBookArtwork.height,
  );
  const artworkWidth = fortuneBookArtwork.width * scale;
  const artworkHeight = fortuneBookArtwork.height * scale;
  const artworkLeft = (viewportWidth - artworkWidth) / 2;
  const artworkTop = (viewportHeight - artworkHeight) / 2;

  const mapArtworkRect = (rect: FortuneBookRect): FortuneBookRect => ({
    left: artworkLeft + rect.left * scale,
    top: artworkTop + rect.top * scale,
    width: rect.width * scale,
    height: rect.height * scale,
    borderRadius: rect.borderRadius * scale,
  });
  const mapPagePlane = (
    page: (typeof sourceGeometry)["leftPage"] | (typeof sourceGeometry)["rightPage"],
  ): FortuneBookPagePlane => ({
    rows: makeSourceLinePlanes(page).map((row) => ({
      frame: mapArtworkRect(row.frame),
      rotationDeg: row.rotationDeg,
    })),
  });

  return {
    scale,
    artwork: {
      left: artworkLeft,
      top: artworkTop,
      width: artworkWidth,
      height: artworkHeight,
    },
    closedBook: mapArtworkRect(sourceGeometry.closedBook),
    interpretation: mapArtworkRect(sourceGeometry.interpretation),
    leftPage: mapPagePlane(sourceGeometry.leftPage),
    rightPage: mapPagePlane(sourceGeometry.rightPage),
  };
}
