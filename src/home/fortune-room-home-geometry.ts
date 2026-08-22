export const homeArtwork = {
  width: 941,
  height: 1672,
} as const;

export type HomeItemId = "crystalBall" | "book" | "cookie" | "coin" | "runes";

export type HomeSourceRegion = {
  left: number;
  top: number;
  width: number;
  height: number;
  borderRadius: number;
};

export type HomeItemConfig = {
  id: HomeItemId;
  label: string;
  enabled: boolean;
  route?: "/crystal-ball" | "/fortune-book" | "/fortune-cookie" | "/fortune-coin" | "/runes";
  region: HomeSourceRegion;
  hitSlop: number;
};

export const homeItems: readonly HomeItemConfig[] = [
  {
    id: "crystalBall",
    label: "Хрустальный шар",
    enabled: true,
    route: "/crystal-ball",
    region: { left: 318, top: 635, width: 326, height: 400, borderRadius: 163 },
    hitSlop: 12,
  },
  {
    id: "book",
    label: "Книга предсказаний",
    enabled: true,
    route: "/fortune-book",
    region: { left: 8, top: 1040, width: 486, height: 360, borderRadius: 42 },
    hitSlop: 8,
  },
  {
    id: "cookie",
    label: "Печенье с предсказанием",
    enabled: true,
    route: "/fortune-cookie",
    region: { left: 22, top: 965, width: 250, height: 168, borderRadius: 84 },
    hitSlop: 10,
  },
  {
    id: "coin",
    label: "Монета судьбы",
    enabled: true,
    route: "/fortune-coin",
    region: { left: 525, top: 1232, width: 196, height: 132, borderRadius: 66 },
    hitSlop: 12,
  },
  {
    id: "runes",
    label: "Руны",
    enabled: true,
    route: "/runes",
    region: { left: 590, top: 1032, width: 345, height: 205, borderRadius: 102 },
    hitSlop: 8,
  },
] as const;

export type HomeGeometry = {
  scale: number;
  artwork: { left: number; top: number; width: number; height: number };
  items: Record<HomeItemId, HomeSourceRegion>;
};

function mapRegion(region: HomeSourceRegion, scale: number, left: number, top: number) {
  return {
    left: left + region.left * scale,
    top: top + region.top * scale,
    width: region.width * scale,
    height: region.height * scale,
    borderRadius: region.borderRadius * scale,
  };
}

export function getHomeGeometry(viewportWidth: number, viewportHeight: number): HomeGeometry {
  const scale = Math.max(
    viewportWidth / homeArtwork.width,
    viewportHeight / homeArtwork.height,
  );
  const width = homeArtwork.width * scale;
  const height = homeArtwork.height * scale;
  const left = (viewportWidth - width) / 2;
  const top = (viewportHeight - height) / 2;

  const items = Object.fromEntries(
    homeItems.map((item) => [item.id, mapRegion(item.region, scale, left, top)]),
  ) as Record<HomeItemId, HomeSourceRegion>;

  return {
    scale,
    artwork: { left, top, width, height },
    items,
  };
}
