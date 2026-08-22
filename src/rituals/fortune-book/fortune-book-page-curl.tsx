import { useMemo } from "react";
import {
  BlurMask,
  Canvas,
  ColorMatrix,
  Group,
  Image as SkiaImage,
  ImageShader,
  Vertices,
  useImage,
  vec,
  type SkPoint,
} from "@shopify/react-native-skia";
import { StyleSheet } from "react-native";
import { useDerivedValue, type SharedValue } from "react-native-reanimated";

import type { FortuneBookGeometry } from "./fortune-book-geometry";

const SOURCE_WIDTH = 941;
const SOURCE_HEIGHT = 1671;
const HORIZONTAL_SEGMENTS = 20;
const VERTICAL_SEGMENTS = 8;
const SHADOW_HORIZONTAL_SEGMENTS = 10;

const sceneBackgroundAsset = require("../../../assets/fortune-book/layers/scene-background-no-flames.png");
const bookBodyAsset = require("../../../assets/fortune-book/layers/book-body-no-flames.png");
const leftPageAsset = require("../../../assets/fortune-book/layers/left-resting-page.png");
const rightUnderPageAsset = require("../../../assets/fortune-book/layers/right-under-page.png");
const rightMovingPageAsset = require("../../../assets/fortune-book/layers/moving-top-page.png");

type Point = { x: number; y: number };
type PageRegistration = {
  topEdge: Point[];
  outerEdge: Point[];
  bottomEdge: Point[];
};
type RegistrationPoints = {
  spineTop: Point;
  outerTop: Point;
  outerUpper: Point;
  outerMid: Point;
  outerLower: Point;
  outerBottom: Point;
  spineBottom: Point;
};

const SOURCE_RIGHT_PAGE: PageRegistration = {
  topEdge: [
    { x: 535, y: 530 }, { x: 571, y: 528 }, { x: 619, y: 531 },
    { x: 669, y: 537 }, { x: 719, y: 545 }, { x: 770, y: 553 },
    { x: 820, y: 562 }, { x: 866, y: 571 }, { x: 902, y: 580 },
    { x: 919, y: 591 },
  ],
  outerEdge: [
    { x: 919, y: 591 }, { x: 892, y: 800 }, { x: 859, y: 984 },
    { x: 802, y: 1162 }, { x: 767, y: 1238 },
  ],
  bottomEdge: [
    { x: 366, y: 1208 }, { x: 420, y: 1212 }, { x: 465, y: 1219 },
    { x: 514, y: 1227 }, { x: 565, y: 1235 }, { x: 616, y: 1242 },
    { x: 667, y: 1249 }, { x: 716, y: 1253 }, { x: 759, y: 1253 },
    { x: 767, y: 1238 },
  ],
};

const SOURCE_LEFT_PAGE: PageRegistration = {
  topEdge: [
    { x: 535, y: 530 }, { x: 508, y: 513 }, { x: 474, y: 499 },
    { x: 434, y: 489 }, { x: 390, y: 481 }, { x: 344, y: 477 },
    { x: 297, y: 475 }, { x: 252, y: 476 }, { x: 214, y: 479 },
    { x: 184, y: 485 },
  ],
  outerEdge: [
    { x: 184, y: 485 }, { x: 96, y: 611 }, { x: 46, y: 772 },
    { x: 8, y: 970 }, { x: 0, y: 1084 },
  ],
  bottomEdge: [
    { x: 366, y: 1208 }, { x: 339, y: 1198 }, { x: 305, y: 1185 },
    { x: 261, y: 1170 }, { x: 213, y: 1154 }, { x: 164, y: 1138 },
    { x: 116, y: 1122 }, { x: 70, y: 1108 }, { x: 29, y: 1096 },
    { x: 0, y: 1084 },
  ],
};

// Approved on Android in source coordinates. These are independent resting
// registrations; the left landing never derives its shape from the right page.
const RIGHT_REST_POINTS: RegistrationPoints = {
  spineTop: { x: 535.3445512820513, y: 515.801282051282 },
  outerTop: { x: 916.8717948717949, y: 606.2820512820513 },
  outerUpper: { x: 885.2035256410256, y: 855.1041666666666 },
  outerMid: { x: 865.7652243589744, y: 1003.7748397435897 },
  outerLower: { x: 806.786858974359, y: 1164.246794871795 },
  outerBottom: { x: 754.0064102564103, y: 1265.2836538461538 },
  spineBottom: { x: 366, y: 1208 },
};

const LEFT_REST_POINTS: RegistrationPoints = {
  spineTop: { x: 556.4567307692307, y: 529.3733974358973 },
  outerTop: { x: 179.45352564102564, y: 470.56089743589735 },
  outerUpper: { x: 85.95673076923077, y: 702.7948717948717 },
  outerMid: { x: 33.17628205128205, y: 874.7083333333333 },
  outerLower: { x: 0, y: 992.3333333333333 },
  outerBottom: { x: 0, y: 1117.4983974358975 },
  spineBottom: { x: 366, y: 1208 },
};

function lerp(a: number, b: number, amount: number) {
  "worklet";
  return a + (b - a) * amount;
}

function clamp01(value: number) {
  "worklet";
  return Math.max(0, Math.min(1, value));
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function sampleEdge(points: Point[], amount: number): Point {
  "worklet";
  const clamped = clamp01(amount);
  const scaled = clamped * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const fraction = scaled - index;
  return {
    x: lerp(points[index].x, points[index + 1].x, fraction),
    y: lerp(points[index].y, points[index + 1].y, fraction),
  };
}

function getRegistrationPoints(page: PageRegistration): RegistrationPoints {
  return {
    spineTop: { ...page.topEdge[0] },
    outerTop: { ...page.topEdge.at(-1)! },
    outerUpper: { ...page.outerEdge[1] },
    outerMid: { ...page.outerEdge[2] },
    outerLower: { ...page.outerEdge[3] },
    outerBottom: { ...page.bottomEdge.at(-1)! },
    spineBottom: { ...page.bottomEdge[0] },
  };
}

function applyRegistration(
  source: PageRegistration,
  registration: RegistrationPoints,
): PageRegistration {
  const original = getRegistrationPoints(source);
  const shiftEdge = (
    points: Point[],
    start: Point,
    originalStart: Point,
    end: Point,
    originalEnd: Point,
  ) =>
    points.map((point, index) => {
      const amount = index / (points.length - 1);
      return {
        x:
          point.x +
          lerp(start.x - originalStart.x, end.x - originalEnd.x, amount),
        y:
          point.y +
          lerp(start.y - originalStart.y, end.y - originalEnd.y, amount),
      };
    });

  return {
    topEdge: shiftEdge(
      source.topEdge,
      registration.spineTop,
      original.spineTop,
      registration.outerTop,
      original.outerTop,
    ),
    outerEdge: [
      registration.outerTop,
      registration.outerUpper,
      registration.outerMid,
      registration.outerLower,
      registration.outerBottom,
    ],
    bottomEdge: shiftEdge(
      source.bottomEdge,
      registration.spineBottom,
      original.spineBottom,
      registration.outerBottom,
      original.outerBottom,
    ),
  };
}

const RIGHT_PAGE_REST = applyRegistration(SOURCE_RIGHT_PAGE, RIGHT_REST_POINTS);
const LEFT_PAGE_REST = applyRegistration(SOURCE_LEFT_PAGE, LEFT_REST_POINTS);

function projectVertex(localX: number, localY: number): Point {
  "worklet";
  const page = localX >= 0 ? RIGHT_PAGE_REST : LEFT_PAGE_REST;
  const u = Math.abs(localX);
  const top = sampleEdge(page.topEdge, u);
  const bottom = sampleEdge(page.bottomEdge, u);
  const flatX = lerp(top.x, bottom.x, localY);
  const flatY = lerp(top.y, bottom.y, localY);
  const edgeAmount = clamp01(localY);
  const outer = sampleEdge(page.outerEdge, edgeAmount);
  const outerTop = page.topEdge[page.topEdge.length - 1];
  const outerBottom = page.bottomEdge[page.bottomEdge.length - 1];
  const flatOuterX = lerp(outerTop.x, outerBottom.x, edgeAmount);
  const flatOuterY = lerp(outerTop.y, outerBottom.y, edgeAmount);
  const outerInfluence = Math.pow(clamp01(u), 4);
  return {
    x: flatX + (outer.x - flatOuterX) * outerInfluence,
    y: flatY + (outer.y - flatOuterY) * outerInfluence,
  };
}

const averagePageWidth =
  (distance(RIGHT_PAGE_REST.topEdge[0], RIGHT_PAGE_REST.topEdge.at(-1)!) +
    distance(RIGHT_PAGE_REST.bottomEdge[0], RIGHT_PAGE_REST.bottomEdge.at(-1)!)) /
  2;
const averagePageHeight =
  (distance(RIGHT_PAGE_REST.topEdge[0], RIGHT_PAGE_REST.bottomEdge[0]) +
    distance(RIGHT_PAGE_REST.topEdge.at(-1)!, RIGHT_PAGE_REST.bottomEdge.at(-1)!)) /
  2;
const pageAspectRatio = averagePageHeight / averagePageWidth;
const sourceArtworkScale = averagePageWidth / 405;
const rowSize = VERTICAL_SEGMENTS + 1;
const vertexCount = (HORIZONTAL_SEGMENTS + 1) * rowSize;

function getCurlVertex(progress: number, index: number): Point {
  "worklet";
  const column = Math.floor(index / rowSize);
  const row = index % rowSize;
  const u = column / HORIZONTAL_SEGMENTS;
  const theta = progress * Math.PI;
  const lift = Math.sin(theta);
  const curlProfile = Math.sin(Math.PI * u);
  const curlRadius = 0.22 * lift;
  const projectedX = u * Math.cos(theta) + curlRadius * curlProfile;
  const depth = u * Math.sin(theta) - curlRadius * curlProfile * Math.cos(theta);
  const perspectiveShiftY = (-depth * 0.105) / pageAspectRatio;
  const heightScale = 1 - depth * 0.045;
  const paperBow = (lift * curlProfile * 3.2) / (405 * pageAspectRatio);
  const top = 0.5 - heightScale / 2 - paperBow + perspectiveShiftY;
  const bottom = 0.5 + heightScale / 2 + paperBow + perspectiveShiftY;
  return projectVertex(projectedX, lerp(top, bottom, row / VERTICAL_SEGMENTS));
}

function makeIndices(horizontalSegments: number) {
  const indices: number[] = [];
  for (let column = 0; column < horizontalSegments; column += 1) {
    for (let row = 0; row < VERTICAL_SEGMENTS; row += 1) {
      const topLeft = column * rowSize + row;
      const bottomLeft = topLeft + 1;
      const topRight = topLeft + rowSize;
      const bottomRight = topRight + 1;
      indices.push(topLeft, bottomLeft, topRight, topRight, bottomLeft, bottomRight);
    }
  }
  return indices;
}

function makeTextureCoordinates(page: PageRegistration) {
  const coordinates: SkPoint[] = [];
  for (let column = 0; column <= HORIZONTAL_SEGMENTS; column += 1) {
    for (let row = 0; row <= VERTICAL_SEGMENTS; row += 1) {
      const u = column / HORIZONTAL_SEGMENTS;
      const v = row / VERTICAL_SEGMENTS;
      const side = page === RIGHT_PAGE_REST ? u : -u;
      const point = projectVertex(side, v);
      coordinates.push(vec(point.x, point.y));
    }
  }
  return coordinates;
}

const indices = makeIndices(HORIZONTAL_SEGMENTS);
const shadowIndices = makeIndices(SHADOW_HORIZONTAL_SEGMENTS);
const rightTextureCoordinates = makeTextureCoordinates(RIGHT_PAGE_REST);
const leftTextureCoordinates = makeTextureCoordinates(LEFT_PAGE_REST);
const shadowColors = Array.from({ length: vertexCount }, () => "rgba(0,0,0,0.34)");

export function FortuneBookPageCurl({
  geometry,
  progress,
  active,
}: {
  geometry: FortuneBookGeometry;
  progress: SharedValue<number>;
  active: boolean;
}) {
  const sceneBackground = useImage(sceneBackgroundAsset);
  const bookBody = useImage(bookBodyAsset);
  const leftPage = useImage(leftPageAsset);
  const rightUnderPage = useImage(rightUnderPageAsset);
  const rightMovingPage = useImage(rightMovingPageAsset);
  const vertices = useDerivedValue<SkPoint[]>(() => {
    const normalized = clamp01(progress.value);
    return Array.from({ length: vertexCount }, (_, index) =>
      getCurlVertex(normalized, index),
    );
  }, [progress]);
  const shadowVertices = useDerivedValue<SkPoint[]>(() => {
    const normalized = clamp01(progress.value);
    const lift = Math.sin(normalized * Math.PI);
    return Array.from({ length: vertexCount }, (_, index) => {
      const next = getCurlVertex(normalized, index);
      return {
        x: next.x - 2 * Math.cos(normalized * Math.PI) * sourceArtworkScale,
        y: next.y + (2 + lift * 7) * sourceArtworkScale,
      };
    });
  }, [progress]);
  const shadowOpacity = useDerivedValue(
    () => Math.sin(clamp01(progress.value) * Math.PI) * 0.42,
    [progress],
  );
  const frontOpacity = useDerivedValue(() => (progress.value < 0.5 ? 1 : 0), [progress]);
  const backOpacity = useDerivedValue(() => (progress.value < 0.5 ? 0 : 1), [progress]);
  const pageColorMatrix = useDerivedValue(() => {
    const normalized = clamp01(progress.value);
    const backside = clamp01((normalized - 0.48) / 0.52);
    const shade = Math.sin(normalized * Math.PI) * 0.09 + backside * 0.08;
    return [
      1 - shade, 0, 0, 0, 0,
      0, 1 - shade * 1.02, 0, 0, 0,
      0, 0, 1 - shade * 1.08, 0, 0,
      0, 0, 0, 1, 0,
    ];
  }, [progress]);
  const sceneTransform = useMemo(
    () => [
      { translateX: geometry.artwork.left },
      { translateY: geometry.artwork.top },
      { scale: geometry.scale },
    ],
    [geometry.artwork.left, geometry.artwork.top, geometry.scale],
  );

  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Group transform={sceneTransform}>
        <SkiaImage image={sceneBackground} x={0} y={0} width={SOURCE_WIDTH} height={SOURCE_HEIGHT} fit="fill" />
        <SkiaImage image={bookBody} x={0} y={0} width={SOURCE_WIDTH} height={SOURCE_HEIGHT} fit="fill" />
        <SkiaImage image={leftPage} x={0} y={0} width={SOURCE_WIDTH} height={SOURCE_HEIGHT} fit="fill" />
        <SkiaImage image={rightUnderPage} x={0} y={0} width={SOURCE_WIDTH} height={SOURCE_HEIGHT} fit="fill" />

        {active ? (
          <>
            <Vertices
              vertices={shadowVertices}
              colors={shadowColors}
              indices={shadowIndices}
              mode="triangles"
              opacity={shadowOpacity}
            >
              <BlurMask blur={7} style="normal" />
            </Vertices>
            <Vertices
              vertices={vertices}
              textures={rightTextureCoordinates}
              indices={indices}
              mode="triangles"
              opacity={frontOpacity}
            >
              <ImageShader
                image={rightMovingPage}
                fit="fill"
                rect={{ x: 0, y: 0, width: SOURCE_WIDTH, height: SOURCE_HEIGHT }}
                tx="clamp"
                ty="clamp"
              />
              <ColorMatrix matrix={pageColorMatrix} />
            </Vertices>
            <Vertices
              vertices={vertices}
              textures={leftTextureCoordinates}
              indices={indices}
              mode="triangles"
              opacity={backOpacity}
            >
              <ImageShader
                image={leftPage}
                fit="fill"
                rect={{ x: 0, y: 0, width: SOURCE_WIDTH, height: SOURCE_HEIGHT }}
                tx="clamp"
                ty="clamp"
              />
              <ColorMatrix matrix={pageColorMatrix} />
            </Vertices>
          </>
        ) : null}
      </Group>
    </Canvas>
  );
}
