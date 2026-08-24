import { describe, expect, it } from "vitest";

import {
  getHomeGeometry,
  HOME_SCENE_ZOOM,
  homeArtwork,
} from "./fortune-room-home-geometry";

describe("home scene geometry", () => {
  it("zooms the complete scene out while keeping artwork and hit regions aligned", () => {
    const viewport = { width: 360, height: 752 };
    const geometry = getHomeGeometry(viewport.width, viewport.height);
    const coverScale = Math.max(
      viewport.width / homeArtwork.width,
      viewport.height / homeArtwork.height,
    );

    expect(geometry.scale).toBeCloseTo(coverScale * HOME_SCENE_ZOOM);
    expect(geometry.artwork.left + geometry.artwork.width / 2)
      .toBeCloseTo(viewport.width / 2);
    expect(geometry.artwork.top + geometry.artwork.height / 2)
      .toBeCloseTo(viewport.height / 2);

    const cookie = geometry.items.cookie;
    expect(cookie.left).toBeGreaterThan(-10);
    expect(cookie.left + cookie.width).toBeGreaterThan(0);
  });
});
