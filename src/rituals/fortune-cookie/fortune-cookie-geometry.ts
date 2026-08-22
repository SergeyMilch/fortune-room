export const fortuneCookieArtwork = {
  width: 887,
  height: 1774,
} as const;

type SourceRect = { left: number; top: number; width: number; height: number };

const source = {
  tray: { left: -6, top: 820, width: 900, height: 512 },
  cookies: [
    { left: 58, top: 957, width: 234, height: 194 },
    { left: 336, top: 925, width: 216, height: 190 },
    { left: 595, top: 955, width: 234, height: 199 },
  ],
  selectedCookie: { left: 273, top: 830, width: 340, height: 298 },
  leftHalf: { left: 190, top: 918, width: 235, height: 301 },
  rightHalf: { left: 492, top: 918, width: 200, height: 302 },
  paper: { left: 118, top: 742, width: 650, height: 121 },
  breakGesture: { left: 155, top: 790, width: 577, height: 485 },
  paperGesture: { left: 292, top: 850, width: 303, height: 420 },
} as const;

export type FortuneCookieGeometry = {
  scale: number;
  artwork: SourceRect;
  tray: SourceRect;
  cookies: readonly [SourceRect, SourceRect, SourceRect];
  selectedCookie: SourceRect;
  leftHalf: SourceRect;
  rightHalf: SourceRect;
  paper: SourceRect;
  breakGesture: SourceRect;
  paperGesture: SourceRect;
};

function mapRect(rect: SourceRect, scale: number, offsetX: number, offsetY: number): SourceRect {
  return {
    left: offsetX + rect.left * scale,
    top: offsetY + rect.top * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function getFortuneCookieGeometry(width: number, height: number): FortuneCookieGeometry {
  const scale = Math.max(width / fortuneCookieArtwork.width, height / fortuneCookieArtwork.height);
  const renderedWidth = fortuneCookieArtwork.width * scale;
  const renderedHeight = fortuneCookieArtwork.height * scale;
  const offsetX = (width - renderedWidth) / 2;
  const offsetY = (height - renderedHeight) / 2;
  return {
    scale,
    artwork: { left: offsetX, top: offsetY, width: renderedWidth, height: renderedHeight },
    tray: mapRect(source.tray, scale, offsetX, offsetY),
    cookies: [
      mapRect(source.cookies[0], scale, offsetX, offsetY),
      mapRect(source.cookies[1], scale, offsetX, offsetY),
      mapRect(source.cookies[2], scale, offsetX, offsetY),
    ],
    selectedCookie: mapRect(source.selectedCookie, scale, offsetX, offsetY),
    leftHalf: mapRect(source.leftHalf, scale, offsetX, offsetY),
    rightHalf: mapRect(source.rightHalf, scale, offsetX, offsetY),
    paper: mapRect(source.paper, scale, offsetX, offsetY),
    breakGesture: mapRect(source.breakGesture, scale, offsetX, offsetY),
    paperGesture: mapRect(source.paperGesture, scale, offsetX, offsetY),
  };
}
