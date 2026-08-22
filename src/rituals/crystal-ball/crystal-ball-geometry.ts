export type LayoutRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type SphereLayout = LayoutRect & {
  diameter: number;
  centerX: number;
  centerY: number;
};

export type ArtworkInSphereLayout = LayoutRect;

export const crystalBallArtwork = {
  width: 941,
  height: 1672,
  sphere: { x: 235, y: 719, width: 472, height: 472 },
  sphereInner: { x: 260, y: 744, width: 422, height: 422 },
  pedestal: { x: 277, y: 1138, width: 390, height: 256 },
} as const;

export function getCrystalBallGeometry(viewportWidth: number, viewportHeight: number) {
  const scale = Math.min(
    viewportWidth / crystalBallArtwork.width,
    viewportHeight / crystalBallArtwork.height,
  );
  const offsetX = (viewportWidth - crystalBallArtwork.width * scale) / 2;
  const offsetY = (viewportHeight - crystalBallArtwork.height * scale) / 2;

  const rect = (source: { x: number; y: number; width: number; height: number }): LayoutRect => ({
    left: offsetX + source.x * scale,
    top: offsetY + source.y * scale,
    width: source.width * scale,
    height: source.height * scale,
  });

  const sphereRect = rect(crystalBallArtwork.sphere);
  const sphere: SphereLayout = {
    ...sphereRect,
    diameter: sphereRect.width,
    centerX: sphereRect.left + sphereRect.width / 2,
    centerY: sphereRect.top + sphereRect.height / 2,
  };
  const sphereInner = rect(crystalBallArtwork.sphereInner);
  const artworkInSphereScale = sphere.diameter / crystalBallArtwork.sphere.width;
  const artworkInSphere: ArtworkInSphereLayout = {
    left: -crystalBallArtwork.sphere.x * artworkInSphereScale,
    top: -crystalBallArtwork.sphere.y * artworkInSphereScale,
    width: crystalBallArtwork.width * artworkInSphereScale,
    height: crystalBallArtwork.height * artworkInSphereScale,
  };

  return {
    scale,
    artwork: {
      left: offsetX,
      top: offsetY,
      width: crystalBallArtwork.width * scale,
      height: crystalBallArtwork.height * scale,
    },
    sphere,
    sphereInner,
    artworkInSphere,
    pedestal: rect(crystalBallArtwork.pedestal),
    prediction: {
      left: sphereInner.left + sphereInner.width * 0.055,
      top: sphereInner.top + sphereInner.height * 0.16,
      width: sphereInner.width * 0.89,
      height: sphereInner.height * 0.68,
    },
  };
}

export type CrystalBallGeometry = ReturnType<typeof getCrystalBallGeometry>;
