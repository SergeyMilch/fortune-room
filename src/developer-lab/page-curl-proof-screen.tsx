import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  BlurMask,
  Canvas,
  Circle,
  ColorMatrix,
  Group,
  Image as SkiaImage,
  ImageShader,
  Path,
  Skia,
  Vertices,
  useImage,
  vec,
  type SkPoint,
} from "@shopify/react-native-skia";
import kvStore from "expo-sqlite/kv-store";
import {
  Clipboard,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { palette } from "@/theme/palette";

import { FortuneBookContentPanel } from "./fortune-book-content-panel";

const MESH_SEGMENTS = 20;
const MESH_VERTICAL_SEGMENTS = 8;
const SHADOW_SEGMENTS = 10;
const ARTWORK_WIDTH = 941;
const ARTWORK_HEIGHT = 1671;
const CALIBRATION_SCENE_PADDING = 24;
const SCENE_BACKGROUND = require("../../assets/fortune-book/layers/scene-background.png");
const BOOK_BODY = require("../../assets/fortune-book/layers/book-body.png");
const LEFT_RESTING_PAGE = require("../../assets/fortune-book/layers/left-resting-page.png");
const RIGHT_UNDER_PAGE = require("../../assets/fortune-book/layers/right-under-page.png");
const MOVING_TOP_PAGE = require("../../assets/fortune-book/layers/moving-top-page.png");
const CHECKPOINTS = [0, 0.25, 0.5, 0.75, 1] as const;
const REGISTRATION_STORAGE_KEY = "developerLab.pageCurlRegistration.v2";

type Point = { x: number; y: number };
type PageRegistration = {
  topEdge: Point[];
  outerEdge: Point[];
  bottomEdge: Point[];
};
type RegistrationCorners = {
  spineTop: Point;
  outerTop: Point;
  outerUpper: Point;
  outerMid: Point;
  outerLower: Point;
  outerBottom: Point;
  spineBottom: Point;
};
type RegistrationCornerName = keyof RegistrationCorners;
type RegistrationSide = "right" | "left";
type RegistrationCalibration = {
  sourceWidth: number;
  sourceHeight: number;
  rightPage: RegistrationCorners;
  leftPage: RegistrationCorners;
};

// Edge anchors are measured directly in the 941 × 1671 approved artwork.
// Twenty anchors per page replace the former four-corner-only registration.
const SOURCE_RIGHT_PAGE: PageRegistration = {
  topEdge: [
    { x: 535, y: 530 }, { x: 571, y: 528 }, { x: 619, y: 531 },
    { x: 669, y: 537 }, { x: 719, y: 545 }, { x: 770, y: 553 },
    { x: 820, y: 562 }, { x: 866, y: 571 }, { x: 902, y: 580 },
    { x: 919, y: 591 },
  ],
  outerEdge: [
    { x: 919, y: 591 },
    { x: 892, y: 800 },
    { x: 859, y: 984 },
    { x: 802, y: 1162 },
    { x: 767, y: 1238 },
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
    { x: 184, y: 485 },
    { x: 96, y: 611 },
    { x: 46, y: 772 },
    { x: 8, y: 970 },
    { x: 0, y: 1084 },
  ],
  bottomEdge: [
    { x: 366, y: 1208 }, { x: 339, y: 1198 }, { x: 305, y: 1185 },
    { x: 261, y: 1170 }, { x: 213, y: 1154 }, { x: 164, y: 1138 },
    { x: 116, y: 1122 }, { x: 70, y: 1108 }, { x: 29, y: 1096 },
    { x: 0, y: 1084 },
  ],
};

type PageMesh = {
  vertices: SkPoint[];
  shadowVertices: SkPoint[];
};

type LocalVertex = { x: number; y: number };

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

function lerpPoint(a: Point, b: Point, amount: number): Point {
  return { x: lerp(a.x, b.x, amount), y: lerp(a.y, b.y, amount) };
}

function distance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function getRegistrationCorners(page: PageRegistration): RegistrationCorners {
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

function applyRegistrationCorners(
  source: PageRegistration,
  corners: RegistrationCorners,
): PageRegistration {
  const original = getRegistrationCorners(source);
  const shiftPoint = (
    point: Point,
    startDelta: Point,
    endDelta: Point,
    amount: number,
  ): Point => ({
    x: point.x + lerp(startDelta.x, endDelta.x, amount),
    y: point.y + lerp(startDelta.y, endDelta.y, amount),
  });
  const topStartDelta = {
    x: corners.spineTop.x - original.spineTop.x,
    y: corners.spineTop.y - original.spineTop.y,
  };
  const topEndDelta = {
    x: corners.outerTop.x - original.outerTop.x,
    y: corners.outerTop.y - original.outerTop.y,
  };
  const bottomStartDelta = {
    x: corners.spineBottom.x - original.spineBottom.x,
    y: corners.spineBottom.y - original.spineBottom.y,
  };
  const bottomEndDelta = {
    x: corners.outerBottom.x - original.outerBottom.x,
    y: corners.outerBottom.y - original.outerBottom.y,
  };

  return {
    topEdge: source.topEdge.map((point, index) =>
      shiftPoint(point, topStartDelta, topEndDelta, index / (source.topEdge.length - 1)),
    ),
    outerEdge: [
      corners.outerTop,
      corners.outerUpper,
      corners.outerMid,
      corners.outerLower,
      corners.outerBottom,
    ].map((point) => ({ ...point })),
    bottomEdge: source.bottomEdge.map((point, index) =>
      shiftPoint(
        point,
        bottomStartDelta,
        bottomEndDelta,
        index / (source.bottomEdge.length - 1),
      ),
    ),
  };
}

function isPoint(value: unknown): value is Point {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Point>;
  return (
    typeof candidate.x === "number" &&
    Number.isFinite(candidate.x) &&
    typeof candidate.y === "number" &&
    Number.isFinite(candidate.y)
  );
}

function upgradeRegistrationCorners(
  value: unknown,
  source: PageRegistration,
): RegistrationCorners | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<RegistrationCorners>;
  const legacyNames = ["spineTop", "outerTop", "outerBottom", "spineBottom"] as const;
  if (!legacyNames.every((name) => isPoint(candidate[name]))) return null;
  if (
    isPoint(candidate.outerUpper) &&
    isPoint(candidate.outerMid) &&
    isPoint(candidate.outerLower)
  ) {
    return candidate as RegistrationCorners;
  }

  const original = getRegistrationCorners(source);
  const topDelta = {
    x: candidate.outerTop!.x - original.outerTop.x,
    y: candidate.outerTop!.y - original.outerTop.y,
  };
  const bottomDelta = {
    x: candidate.outerBottom!.x - original.outerBottom.x,
    y: candidate.outerBottom!.y - original.outerBottom.y,
  };
  const migrateOuterPoint = (point: Point, amount: number): Point => ({
    x: point.x + lerp(topDelta.x, bottomDelta.x, amount),
    y: point.y + lerp(topDelta.y, bottomDelta.y, amount),
  });

  return {
    spineTop: { ...candidate.spineTop! },
    outerTop: { ...candidate.outerTop! },
    outerUpper: migrateOuterPoint(original.outerUpper, 0.25),
    outerMid: migrateOuterPoint(original.outerMid, 0.5),
    outerLower: migrateOuterPoint(original.outerLower, 0.75),
    outerBottom: { ...candidate.outerBottom! },
    spineBottom: { ...candidate.spineBottom! },
  };
}

function parseRegistrationCalibration(value: unknown): RegistrationCalibration | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<RegistrationCalibration>;
  if (candidate.sourceWidth !== ARTWORK_WIDTH || candidate.sourceHeight !== ARTWORK_HEIGHT) {
    return null;
  }
  const rightPage = upgradeRegistrationCorners(candidate.rightPage, SOURCE_RIGHT_PAGE);
  const leftPage = upgradeRegistrationCorners(candidate.leftPage, SOURCE_LEFT_PAGE);
  return rightPage && leftPage ? makeCalibration(rightPage, leftPage) : null;
}

function makeCalibration(
  rightPage: RegistrationCorners,
  leftPage: RegistrationCorners,
): RegistrationCalibration {
  return {
    sourceWidth: ARTWORK_WIDTH,
    sourceHeight: ARTWORK_HEIGHT,
    rightPage,
    leftPage,
  };
}

function sampleEdge(points: Point[], amount: number): Point {
  const clamped = clamp01(amount);
  const scaled = clamped * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(scaled));
  return lerpPoint(points[index], points[index + 1], scaled - index);
}

function makeIndices(horizontalSegments: number, verticalSegments: number) {
  const indices: number[] = [];

  for (let column = 0; column < horizontalSegments; column += 1) {
    for (let row = 0; row < verticalSegments; row += 1) {
      const topLeft = column * (verticalSegments + 1) + row;
      const bottomLeft = topLeft + 1;
      const topRight = topLeft + verticalSegments + 1;
      const bottomRight = topRight + 1;

      indices.push(topLeft, bottomLeft, topRight);
      indices.push(topRight, bottomLeft, bottomRight);
    }
  }

  return indices;
}

function makeTextureCoordinates(page: PageRegistration) {
  const coordinates: SkPoint[] = [];

  for (let column = 0; column <= MESH_SEGMENTS; column += 1) {
    const u = column / MESH_SEGMENTS;
    for (let row = 0; row <= MESH_VERTICAL_SEGMENTS; row += 1) {
      const point = projectLocalVertex(
        { x: u, y: row / MESH_VERTICAL_SEGMENTS },
        page,
        page,
      );
      coordinates.push(vec(point.x, point.y));
    }
  }

  return coordinates;
}

function projectLocalVertex(
  localVertex: LocalVertex,
  rightPageRest: PageRegistration,
  leftPageRest: PageRegistration,
): Point {
  const page = localVertex.x >= 0 ? rightPageRest : leftPageRest;
  const u = Math.abs(localVertex.x);
  const v = localVertex.y;
  const top = sampleEdge(page.topEdge, u);
  const bottom = sampleEdge(page.bottomEdge, u);
  const flatPoint = lerpPoint(top, bottom, v);
  const clampedV = clamp01(v);
  const outerCurvePoint = sampleEdge(page.outerEdge, clampedV);
  const flatOuterPoint = lerpPoint(page.topEdge.at(-1)!, page.bottomEdge.at(-1)!, clampedV);
  const outerInfluence = Math.pow(clamp01(u), 4);

  return {
    x: flatPoint.x + (outerCurvePoint.x - flatOuterPoint.x) * outerInfluence,
    y: flatPoint.y + (outerCurvePoint.y - flatOuterPoint.y) * outerInfluence,
  };
}

function makeLocalCurlVertices(progress: number, pageAspectRatio: number): LocalVertex[] {
  const theta = progress * Math.PI;
  const lift = Math.sin(theta);
  const curlRadius = 0.22 * lift;
  const vertices: LocalVertex[] = [];

  // This is the Phase 1 curl unchanged, expressed in normalized local page
  // coordinates. Perspective is deliberately not involved at this stage.
  for (let column = 0; column <= MESH_SEGMENTS; column += 1) {
    const u = column / MESH_SEGMENTS;
    const curlProfile = Math.sin(Math.PI * u);
    const projectedX = u * Math.cos(theta) + curlRadius * curlProfile;
    const depth = u * Math.sin(theta) - curlRadius * curlProfile * Math.cos(theta);
    const perspectiveShiftY = (-depth * 0.105) / pageAspectRatio;
    const heightScale = 1 - depth * 0.045;
    const paperBow = (lift * curlProfile * 3.2) / (405 * pageAspectRatio);
    const top = 0.5 - heightScale / 2 - paperBow + perspectiveShiftY;
    const bottom = 0.5 + heightScale / 2 + paperBow + perspectiveShiftY;

    vertices.push({ x: projectedX, y: top }, { x: projectedX, y: bottom });
  }

  return vertices;
}

function makeLocalCurlGrid(progress: number, pageAspectRatio: number): LocalVertex[] {
  const edgeVertices = makeLocalCurlVertices(progress, pageAspectRatio);
  const grid: LocalVertex[] = [];

  for (let column = 0; column <= MESH_SEGMENTS; column += 1) {
    const top = edgeVertices[column * 2];
    const bottom = edgeVertices[column * 2 + 1];
    for (let row = 0; row <= MESH_VERTICAL_SEGMENTS; row += 1) {
      const amount = row / MESH_VERTICAL_SEGMENTS;
      grid.push({ x: top.x, y: lerp(top.y, bottom.y, amount) });
    }
  }

  return grid;
}

function makePerspectivePageMesh(
  progress: number,
  rightPageRest: PageRegistration,
  leftPageRest: PageRegistration,
): PageMesh {
  const averagePageWidth =
    (distance(rightPageRest.topEdge[0], rightPageRest.topEdge.at(-1)!) +
      distance(rightPageRest.bottomEdge[0], rightPageRest.bottomEdge.at(-1)!)) /
    2;
  const averagePageHeight =
    (distance(rightPageRest.topEdge[0], rightPageRest.bottomEdge[0]) +
      distance(rightPageRest.topEdge.at(-1)!, rightPageRest.bottomEdge.at(-1)!)) /
    2;
  const localVertices = makeLocalCurlGrid(
    progress,
    averagePageHeight / averagePageWidth,
  );
  const artworkScale = averagePageWidth / 405;
  const lift = Math.sin(progress * Math.PI);
  const vertices = localVertices.map((localVertex) => {
    const point = projectLocalVertex(localVertex, rightPageRest, leftPageRest);
    return vec(point.x, point.y);
  });
  const shadowDistance = (2 + lift * 7) * artworkScale;
  const shadowDirection = -2 * Math.cos(progress * Math.PI) * artworkScale;
  const shadowVertices = vertices.map((point) =>
    vec(point.x + shadowDirection, point.y + shadowDistance),
  );

  return { vertices, shadowVertices };
}

function makeRegistrationOutline(page: PageRegistration) {
  const path = Skia.Path.Make();
  const reversedBottom = [...page.bottomEdge].reverse();
  const points = [
    ...page.topEdge,
    ...page.outerEdge.slice(1),
    ...reversedBottom.slice(1),
  ];
  path.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => path.lineTo(point.x, point.y));
  path.close();
  return path;
}

function makeMovingOutline(vertices: SkPoint[]) {
  const path = Skia.Path.Make();
  const rowSize = MESH_VERTICAL_SEGMENTS + 1;
  const top = Array.from(
    { length: MESH_SEGMENTS + 1 },
    (_, column) => vertices[column * rowSize],
  );
  const outer = Array.from(
    { length: MESH_VERTICAL_SEGMENTS },
    (_, row) => vertices[MESH_SEGMENTS * rowSize + row + 1],
  );
  const bottom = Array.from(
    { length: MESH_SEGMENTS },
    (_, index) => vertices[(MESH_SEGMENTS - index - 1) * rowSize + MESH_VERTICAL_SEGMENTS],
  );
  const spine = Array.from(
    { length: MESH_VERTICAL_SEGMENTS - 1 },
    (_, index) => vertices[MESH_VERTICAL_SEGMENTS - index - 1],
  );
  const points = [...top, ...outer, ...bottom, ...spine];
  path.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => path.lineTo(point.x, point.y));
  path.close();
  return path;
}

export function PageCurlProofScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const sceneBackground = useImage(SCENE_BACKGROUND);
  const bookBody = useImage(BOOK_BODY);
  const leftRestingPage = useImage(LEFT_RESTING_PAGE);
  const rightUnderPage = useImage(RIGHT_UNDER_PAGE);
  const rightPageTexture = useImage(MOVING_TOP_PAGE);
  const [progress, setProgress] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [registrationDebug, setRegistrationDebug] = useState(false);
  const [registrationSide, setRegistrationSide] = useState<RegistrationSide>("right");
  const [pageVisible, setPageVisible] = useState(true);
  const [rightCorners, setRightCorners] = useState<RegistrationCorners>(() =>
    getRegistrationCorners(SOURCE_RIGHT_PAGE),
  );
  const [leftCorners, setLeftCorners] = useState<RegistrationCorners>(() =>
    getRegistrationCorners(SOURCE_LEFT_PAGE),
  );
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");
  const animationFrame = useRef<number | null>(null);
  const restCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyStateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeAnchor = useRef<RegistrationCornerName | null>(null);
  const rightCornersRef = useRef(rightCorners);
  const leftCornersRef = useRef(leftCorners);

  const coverScale = Math.max(width / ARTWORK_WIDTH, height / ARTWORK_HEIGHT);
  const calibrationScale = Math.min(
    Math.max(1, width - CALIBRATION_SCENE_PADDING * 2) / ARTWORK_WIDTH,
    Math.max(1, height - CALIBRATION_SCENE_PADDING * 2) / ARTWORK_HEIGHT,
  );
  const sceneScale = registrationDebug ? calibrationScale : coverScale;
  const renderedWidth = ARTWORK_WIDTH * sceneScale;
  const renderedHeight = ARTWORK_HEIGHT * sceneScale;
  const sceneOffsetX = (width - renderedWidth) / 2;
  const sceneOffsetY = (height - renderedHeight) / 2;

  useEffect(() => {
    rightCornersRef.current = rightCorners;
  }, [rightCorners]);

  useEffect(() => {
    leftCornersRef.current = leftCorners;
  }, [leftCorners]);

  useEffect(() => {
    let mounted = true;
    void kvStore.getItem(REGISTRATION_STORAGE_KEY).then((stored) => {
      if (!mounted || !stored) return;
      try {
        const parsed: unknown = JSON.parse(stored);
        const calibration = parseRegistrationCalibration(parsed);
        if (calibration) {
          setRightCorners(calibration.rightPage);
          setLeftCorners(calibration.leftPage);
        }
      } catch {
        // A malformed Developer Lab value must never block the proof screen.
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const rightPageRest = useMemo(
    () => applyRegistrationCorners(SOURCE_RIGHT_PAGE, rightCorners),
    [rightCorners],
  );
  const leftPageRest = useMemo(
    () => applyRegistrationCorners(SOURCE_LEFT_PAGE, leftCorners),
    [leftCorners],
  );
  const indices = useMemo(
    () => makeIndices(MESH_SEGMENTS, MESH_VERTICAL_SEGMENTS),
    [],
  );
  const shadowIndices = useMemo(
    () => makeIndices(SHADOW_SEGMENTS, MESH_VERTICAL_SEGMENTS),
    [],
  );
  const rightTextureCoordinates = useMemo(
    () => makeTextureCoordinates(rightPageRest),
    [rightPageRest],
  );
  const leftTextureCoordinates = useMemo(
    () => makeTextureCoordinates(leftPageRest),
    [leftPageRest],
  );
  const movingPageTexture = progress < 0.5 ? rightPageTexture : leftRestingPage;
  const movingTextureCoordinates =
    progress < 0.5 ? rightTextureCoordinates : leftTextureCoordinates;
  const mesh = useMemo(
    () => makePerspectivePageMesh(progress, rightPageRest, leftPageRest),
    [leftPageRest, progress, rightPageRest],
  );
  const targetOutline = useMemo(
    () => makeRegistrationOutline(progress < 0.5 ? rightPageRest : leftPageRest),
    [leftPageRest, progress, rightPageRest],
  );
  const movingOutline = useMemo(() => makeMovingOutline(mesh.vertices), [mesh.vertices]);
  const shadowColors = useMemo(
    () =>
      Array.from(
        { length: (MESH_SEGMENTS + 1) * (MESH_VERTICAL_SEGMENTS + 1) },
        () => "rgba(0,0,0,0.34)",
      ),
    [],
  );
  const visibleCorners = progress < 0.5 ? rightCorners : leftCorners;

  const stopPlayback = useCallback(() => {
    if (animationFrame.current !== null) {
      cancelAnimationFrame(animationFrame.current);
      animationFrame.current = null;
    }
    setPlaying(false);
  }, []);

  useEffect(() => stopPlayback, [stopPlayback]);

  useEffect(
    () => () => {
      if (restCheckTimer.current !== null) clearTimeout(restCheckTimer.current);
      if (copyStateTimer.current !== null) clearTimeout(copyStateTimer.current);
    },
    [],
  );

  const setManualProgress = useCallback(
    (nextProgress: number) => {
      stopPlayback();
      setProgress(clamp01(nextProgress));
    },
    [stopPlayback],
  );

  const updateFromSliderX = useCallback(
    (x: number) => setManualProgress(x / sliderWidth),
    [setManualProgress, sliderWidth],
  );

  const sliderGesture = useMemo(
    () =>
      Gesture.Race(
        Gesture.Pan()
          .runOnJS(true)
          .onBegin((event) => updateFromSliderX(event.x))
          .onUpdate((event) => updateFromSliderX(event.x)),
        Gesture.Tap()
          .runOnJS(true)
          .onEnd((event) => updateFromSliderX(event.x)),
      ),
    [updateFromSliderX],
  );

  const handleSliderLayout = useCallback((event: LayoutChangeEvent) => {
    setSliderWidth(Math.max(1, event.nativeEvent.layout.width));
  }, []);

  const viewportToSource = useCallback(
    (point: Point): Point => ({
      x: (point.x - sceneOffsetX) / sceneScale,
      y: (point.y - sceneOffsetY) / sceneScale,
    }),
    [sceneOffsetX, sceneOffsetY, sceneScale],
  );

  const registrationGesture = useMemo(
    () =>
      Gesture.Pan()
        .runOnJS(true)
        .onBegin((event) => {
          const atRegistrationRest =
            (registrationSide === "right" && progress <= 0.01) ||
            (registrationSide === "left" && progress >= 0.99);
          if (!registrationDebug || !atRegistrationRest) return;
          const sourcePoint = viewportToSource({ x: event.x, y: event.y });
          const maxDistance = 52 / sceneScale;
          const editableCorners =
            registrationSide === "right" ? rightCornersRef.current : leftCornersRef.current;
          activeAnchor.current =
            (Object.entries(editableCorners) as [RegistrationCornerName, Point][])
              .map(([name, point]) => ({ name, distance: distance(point, sourcePoint) }))
              .filter((candidate) => candidate.distance <= maxDistance)
              .sort((a, b) => a.distance - b.distance)[0]?.name ?? null;
        })
        .onUpdate((event) => {
          const name = activeAnchor.current;
          if (!name) return;
          const sourcePoint = viewportToSource({ x: event.x, y: event.y });
          const updateCorners = (current: RegistrationCorners) => {
            const next = {
              ...current,
              [name]: {
                x: Math.max(0, Math.min(ARTWORK_WIDTH, sourcePoint.x)),
                y: Math.max(0, Math.min(ARTWORK_HEIGHT, sourcePoint.y)),
              },
            };
            return next;
          };
          if (registrationSide === "right") {
            setRightCorners((current) => {
              const next = updateCorners(current);
              rightCornersRef.current = next;
              return next;
            });
          } else {
            setLeftCorners((current) => {
              const next = updateCorners(current);
              leftCornersRef.current = next;
              return next;
            });
          }
        })
        .onFinalize(() => {
          activeAnchor.current = null;
          void kvStore.setItem(
            REGISTRATION_STORAGE_KEY,
            JSON.stringify(
              makeCalibration(rightCornersRef.current, leftCornersRef.current),
            ),
          );
        }),
    [progress, registrationDebug, registrationSide, sceneScale, viewportToSource],
  );

  const handleRegistrationSide = useCallback(
    (side: RegistrationSide) => {
      setRegistrationDebug(true);
      setRegistrationSide(side);
      setManualProgress(side === "right" ? 0 : 1);
    },
    [setManualProgress],
  );

  const handleCopyJson = useCallback(() => {
    const calibration = makeCalibration(rightCornersRef.current, leftCornersRef.current);
    Clipboard.setString(JSON.stringify(calibration, null, 2));
    setCopyState("copied");
    if (copyStateTimer.current !== null) clearTimeout(copyStateTimer.current);
    copyStateTimer.current = setTimeout(() => {
      setCopyState("idle");
      copyStateTimer.current = null;
    }, 1400);
  }, []);

  const handleRestCheck = useCallback(() => {
    stopPlayback();
    if (restCheckTimer.current !== null) clearTimeout(restCheckTimer.current);
    setPageVisible(true);
    setProgress(0);
    restCheckTimer.current = setTimeout(() => {
      setProgress(1);
      restCheckTimer.current = null;
    }, 1100);
  }, [stopPlayback]);

  const handlePlay = useCallback(() => {
    stopPlayback();
    const initialProgress = progress >= 0.999 ? 0 : progress;
    const duration = Math.max(500, 1600 * (1 - initialProgress));
    const startedAt = Date.now();
    setProgress(initialProgress);
    setPlaying(true);

    const tick = () => {
      const elapsed = clamp01((Date.now() - startedAt) / duration);
      const eased = elapsed * elapsed * (3 - 2 * elapsed);
      setProgress(lerp(initialProgress, 1, eased));

      if (elapsed < 1) {
        animationFrame.current = requestAnimationFrame(tick);
      } else {
        animationFrame.current = null;
        setPlaying(false);
      }
    };

    animationFrame.current = requestAnimationFrame(tick);
  }, [progress, stopPlayback]);

  const shadowOpacity = Math.sin(progress * Math.PI) * 0.42;
  const shadowBlur = 4 + Math.sin(progress * Math.PI) * 5;
  const backsideProgress = clamp01((progress - 0.48) / 0.52);
  const curlShade = Math.sin(progress * Math.PI) * 0.09;
  const shadeAmount = curlShade + backsideProgress * 0.08;
  const pageColorMatrix = [
    1 - shadeAmount,
    0,
    0,
    0,
    0,
    0,
    1 - shadeAmount * 1.02,
    0,
    0,
    0,
    0,
    0,
    1 - shadeAmount * 1.08,
    0,
    0,
    0,
    0,
    0,
    1,
    0,
  ];
  const editableCorners = registrationSide === "right" ? rightCorners : leftCorners;
  const registrationGestureEnabled =
    registrationDebug &&
    ((registrationSide === "right" && progress <= 0.01) ||
      (registrationSide === "left" && progress >= 0.99));

  return (
    <View style={styles.screen}>
      <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Group
          transform={[
            { translateX: sceneOffsetX },
            { translateY: sceneOffsetY },
            { scale: sceneScale },
          ]}
        >
          <SkiaImage
            image={sceneBackground}
            x={0}
            y={0}
            width={ARTWORK_WIDTH}
            height={ARTWORK_HEIGHT}
            fit="fill"
          />
          <SkiaImage
            image={bookBody}
            x={0}
            y={0}
            width={ARTWORK_WIDTH}
            height={ARTWORK_HEIGHT}
            fit="fill"
          />
          <SkiaImage
            image={leftRestingPage}
            x={0}
            y={0}
            width={ARTWORK_WIDTH}
            height={ARTWORK_HEIGHT}
            fit="fill"
          />
          <SkiaImage
            image={rightUnderPage}
            x={0}
            y={0}
            width={ARTWORK_WIDTH}
            height={ARTWORK_HEIGHT}
            fit="fill"
          />

          {pageVisible ? (
            <Vertices
              vertices={mesh.shadowVertices}
              colors={shadowColors}
              indices={shadowIndices}
              mode="triangles"
              blendMode="srcOver"
              opacity={shadowOpacity}
            >
              <BlurMask blur={shadowBlur} style="normal" />
            </Vertices>
          ) : null}

          {pageVisible ? (
            <Vertices
              vertices={mesh.vertices}
              textures={movingTextureCoordinates}
              indices={indices}
              mode="triangles"
            >
              <ImageShader
                image={movingPageTexture}
                fit="fill"
                rect={{ x: 0, y: 0, width: ARTWORK_WIDTH, height: ARTWORK_HEIGHT }}
                tx="clamp"
                ty="clamp"
              />
              <ColorMatrix matrix={pageColorMatrix} />
            </Vertices>
          ) : null}

          {registrationDebug ? (
            <>
            <Path
              path={targetOutline}
              style="stroke"
              strokeWidth={2 / sceneScale}
              color="rgba(74,255,137,0.95)"
            />
            <Path
              path={movingOutline}
              style="stroke"
              strokeWidth={2 / sceneScale}
              color="rgba(255,67,67,0.95)"
            />
              {(Object.entries(visibleCorners) as [RegistrationCornerName, Point][]).map(
                ([name, point]) => (
                  <Circle
                    key={name}
                    cx={point.x}
                    cy={point.y}
                    r={10 / sceneScale}
                    color={progress < 0.5 ? "#ffcf33" : "#5ee7ff"}
                  />
                ),
              )}
            </>
          ) : null}
        </Group>
      </Canvas>

      {registrationGestureEnabled ? (
        <GestureDetector gesture={registrationGesture}>
          <View style={StyleSheet.absoluteFill} />
        </GestureDetector>
      ) : null}

      <SafeAreaView
        pointerEvents="box-none"
        style={[styles.safeArea, registrationDebug && styles.safeAreaCalibrating]}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Назад"
            hitSlop={10}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>DEVELOPER LAB</Text>
            <Text style={styles.title}>PAGE CURL · BOOK PERSPECTIVE</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        {registrationDebug ? (
          <View style={styles.calibrationHud}>
            <View style={styles.calibrationActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Редактировать регистрацию правой страницы"
                onPress={() => handleRegistrationSide("right")}
                style={({ pressed }) => [
                  styles.calibrationSideButton,
                  registrationSide === "right" && styles.registrationButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.registrationButtonText}>REG RIGHT · 0</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Редактировать регистрацию левой страницы"
                onPress={() => handleRegistrationSide("left")}
                style={({ pressed }) => [
                  styles.calibrationSideButton,
                  registrationSide === "left" && styles.registrationButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.registrationButtonText}>REG LEFT · 1</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Закрыть режим регистрации"
                onPress={() => setRegistrationDebug(false)}
                style={({ pressed }) => [styles.calibrationDoneButton, pressed && styles.pressed]}
              >
                <Text style={styles.calibrationDoneText}>DONE</Text>
              </Pressable>
            </View>

            <View style={styles.calibrationMetaRow}>
              <View pointerEvents="none" style={styles.calibrationCoordinates}>
                <Text selectable style={styles.registrationReadoutTitle}>
                  {registrationSide.toUpperCase()} · SOURCE PX
                </Text>
                <Text selectable style={styles.calibrationCoordinatesText}>
                  ST {editableCorners.spineTop.x.toFixed(1)},{" "}
                  {editableCorners.spineTop.y.toFixed(1)} · OT{" "}
                  {editableCorners.outerTop.x.toFixed(1)},{" "}
                  {editableCorners.outerTop.y.toFixed(1)}
                </Text>
                <Text selectable style={styles.calibrationCoordinatesText}>
                  OU {editableCorners.outerUpper.x.toFixed(1)},{" "}
                  {editableCorners.outerUpper.y.toFixed(1)} · OM{" "}
                  {editableCorners.outerMid.x.toFixed(1)},{" "}
                  {editableCorners.outerMid.y.toFixed(1)} · OL{" "}
                  {editableCorners.outerLower.x.toFixed(1)},{" "}
                  {editableCorners.outerLower.y.toFixed(1)}
                </Text>
                <Text selectable style={styles.calibrationCoordinatesText}>
                  OB {editableCorners.outerBottom.x.toFixed(1)},{" "}
                  {editableCorners.outerBottom.y.toFixed(1)} · SB{" "}
                  {editableCorners.spineBottom.x.toFixed(1)},{" "}
                  {editableCorners.spineBottom.y.toFixed(1)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Показать или скрыть moving page"
                onPress={() => setPageVisible((current) => !current)}
                style={({ pressed }) => [
                  styles.calibrationUtilityButton,
                  pageVisible && styles.debugButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.registrationButtonText}>PAGE</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Скопировать JSON регистрации"
                onPress={handleCopyJson}
                style={({ pressed }) => [styles.calibrationCopyButton, pressed && styles.pressed]}
              >
                <Text style={styles.copyButtonText}>
                  {copyState === "copied" ? "COPIED" : "COPY JSON"}
                </Text>
              </Pressable>
            </View>
            <Text pointerEvents="none" style={styles.calibrationHint}>
              DRAG POINTS ON THE BOOK · ALL TOUCHES USE 941×1671 SOURCE SPACE
            </Text>
          </View>
        ) : (
          <View style={styles.controlsWrap}>
          <View pointerEvents="none" style={styles.meshBadge}>
            <Text style={styles.meshBadgeText}>
              {MESH_SEGMENTS}×{MESH_VERTICAL_SEGMENTS} MESH · ONE 941×1671 SKIA SCENE
            </Text>
          </View>

          <View style={styles.controls}>
            <View style={styles.progressRow}>
              <View>
                <Text style={styles.controlLabel}>TURN PROGRESS</Text>
                <Text style={styles.progressValue}>{progress.toFixed(2)}</Text>
              </View>
              <View style={styles.controlButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Показать или скрыть moving page"
                  onPress={() => setPageVisible((current) => !current)}
                  style={({ pressed }) => [
                    styles.debugButton,
                    pageVisible && styles.debugButtonActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.debugButtonText}>PAGE</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={playing ? "Остановить" : "Запустить перелистывание"}
                  onPress={playing ? stopPlayback : handlePlay}
                  style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
                >
                  <Text style={styles.playButtonText}>{playing ? "PAUSE" : "PLAY"}</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.registrationActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Редактировать регистрацию правой страницы"
                onPress={() => handleRegistrationSide("right")}
                style={({ pressed }) => [
                  styles.registrationButton,
                  registrationDebug &&
                    registrationSide === "right" &&
                    styles.registrationButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.registrationButtonText}>REG RIGHT · 0</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Редактировать регистрацию левой страницы"
                onPress={() => handleRegistrationSide("left")}
                style={({ pressed }) => [
                  styles.registrationButton,
                  registrationDebug &&
                    registrationSide === "left" &&
                    styles.registrationButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.registrationButtonText}>REG LEFT · 1</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Скопировать JSON регистрации"
                onPress={handleCopyJson}
                style={({ pressed }) => [styles.copyButton, pressed && styles.pressed]}
              >
                <Text style={styles.copyButtonText}>
                  {copyState === "copied" ? "COPIED" : "COPY JSON"}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Автоматически проверить посадку страницы в начале и конце"
                onPress={handleRestCheck}
                style={({ pressed }) => [styles.restButton, pressed && styles.pressed]}
              >
                <Text style={styles.registrationButtonText}>0→1</Text>
              </Pressable>
            </View>

            {registrationDebug ? (
              <View style={styles.registrationReadout}>
                <Text selectable style={styles.registrationReadoutTitle}>
                  {registrationSide.toUpperCase()} · SOURCE COORDINATES
                </Text>
                {(Object.entries(editableCorners) as [RegistrationCornerName, Point][]).map(
                  ([name, point]) => (
                    <Text selectable key={name} style={styles.registrationReadoutText}>
                      {name}: {point.x.toFixed(1)}, {point.y.toFixed(1)}
                    </Text>
                  ),
                )}
              </View>
            ) : null}

            <GestureDetector gesture={sliderGesture}>
              <View
                accessibilityRole="adjustable"
                accessibilityLabel="Прогресс перелистывания страницы"
                accessibilityValue={{ min: 0, max: 1, now: progress }}
                onLayout={handleSliderLayout}
                style={styles.sliderTouchArea}
              >
                <View style={styles.sliderTrack}>
                  <View style={[styles.sliderFill, { width: `${progress * 100}%` }]} />
                </View>
                <View
                  style={[
                    styles.sliderThumb,
                    { left: Math.max(0, Math.min(sliderWidth - 22, progress * sliderWidth - 11)) },
                  ]}
                />
              </View>
            </GestureDetector>

            <View style={styles.checkpoints}>
              {CHECKPOINTS.map((checkpoint) => {
                const selected = Math.abs(progress - checkpoint) < 0.006;
                return (
                  <Pressable
                    key={checkpoint}
                    accessibilityRole="button"
                    accessibilityLabel={`Установить прогресс ${checkpoint}`}
                    onPress={() => setManualProgress(checkpoint)}
                    style={[styles.checkpoint, selected && styles.checkpointSelected]}
                  >
                    <Text style={[styles.checkpointText, selected && styles.checkpointTextSelected]}>
                      {checkpoint.toFixed(2)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
          <FortuneBookContentPanel />
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden", backgroundColor: palette.ink },
  safeArea: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "space-between",
  },
  safeAreaCalibrating: { justifyContent: "flex-start" },
  header: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    backgroundColor: "rgba(3,5,7,0.68)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(210,176,118,0.18)",
  },
  roundButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(226,205,166,0.25)",
    backgroundColor: "rgba(4,7,9,0.54)",
  },
  pressed: { opacity: 0.62 },
  backText: { color: "#e3d2ae", fontSize: 34, lineHeight: 36, marginTop: -3 },
  headerCopy: { flex: 1, alignItems: "center", gap: 3 },
  eyebrow: { color: "rgba(210,177,116,0.72)", fontSize: 8, letterSpacing: 2 },
  title: { color: "#e6dbc3", fontSize: 12, letterSpacing: 1, fontWeight: "600" },
  headerSpacer: { width: 42 },
  calibrationHud: {
    marginHorizontal: 10,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 7,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(110,255,157,0.34)",
    backgroundColor: "rgba(3,5,7,0.9)",
  },
  calibrationActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  calibrationSideButton: {
    flex: 1,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(110,232,151,0.24)",
    backgroundColor: "rgba(15,65,39,0.24)",
  },
  calibrationDoneButton: {
    width: 58,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(235,207,151,0.45)",
    backgroundColor: "rgba(126,82,39,0.34)",
  },
  calibrationDoneText: {
    color: "#edd7aa",
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: "700",
  },
  calibrationMetaRow: { flexDirection: "row", alignItems: "stretch", gap: 6 },
  calibrationCoordinates: { flex: 1, justifyContent: "center", gap: 1 },
  calibrationCoordinatesText: {
    color: "rgba(216,235,205,0.74)",
    fontSize: 7,
    fontVariant: ["tabular-nums"],
  },
  calibrationUtilityButton: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(110,232,151,0.25)",
    backgroundColor: "rgba(15,65,39,0.24)",
  },
  calibrationCopyButton: {
    width: 70,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(221,190,132,0.42)",
    backgroundColor: "rgba(126,82,39,0.36)",
  },
  calibrationHint: {
    color: "rgba(210,225,199,0.48)",
    fontSize: 6,
    letterSpacing: 0.7,
    textAlign: "center",
  },
  controlsWrap: { paddingHorizontal: 12, paddingBottom: 8, gap: 8 },
  meshBadge: {
    alignSelf: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "rgba(3,5,7,0.7)",
    borderWidth: 1,
    borderColor: "rgba(213,182,126,0.2)",
  },
  meshBadgeText: { color: "rgba(231,215,183,0.72)", fontSize: 8, letterSpacing: 1 },
  controls: {
    paddingHorizontal: 15,
    paddingTop: 12,
    paddingBottom: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(210,176,118,0.2)",
    backgroundColor: "rgba(3,5,7,0.86)",
  },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  controlLabel: { color: "rgba(222,205,171,0.64)", fontSize: 8, letterSpacing: 1.5 },
  progressValue: {
    color: "#ebd7ab",
    fontSize: 16,
    lineHeight: 20,
    fontVariant: ["tabular-nums"],
  },
  controlButtons: { flexDirection: "row", alignItems: "center", gap: 7 },
  registrationActions: {
    paddingTop: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  registrationButton: {
    flex: 1,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(110,232,151,0.24)",
    backgroundColor: "rgba(15,65,39,0.24)",
  },
  registrationButtonActive: {
    borderColor: "rgba(110,255,157,0.78)",
    backgroundColor: "rgba(18,95,51,0.64)",
  },
  registrationButtonText: {
    color: "#a5efbd",
    fontSize: 7,
    letterSpacing: 0.7,
    fontWeight: "700",
  },
  copyButton: {
    minWidth: 68,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(221,190,132,0.42)",
    backgroundColor: "rgba(126,82,39,0.36)",
  },
  copyButtonText: {
    color: "#edd7aa",
    fontSize: 7,
    letterSpacing: 0.8,
    fontWeight: "700",
  },
  restButton: {
    width: 38,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(110,232,151,0.24)",
  },
  registrationReadout: {
    marginTop: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 2,
  },
  registrationReadoutTitle: {
    width: "100%",
    color: "rgba(110,255,157,0.86)",
    fontSize: 7,
    letterSpacing: 1,
  },
  registrationReadoutText: {
    color: "rgba(216,235,205,0.7)",
    fontSize: 7,
    fontVariant: ["tabular-nums"],
  },
  debugButton: {
    width: 42,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(110,232,151,0.28)",
    backgroundColor: "rgba(15,65,39,0.3)",
  },
  debugButtonActive: {
    borderColor: "rgba(110,255,157,0.75)",
    backgroundColor: "rgba(18,95,51,0.6)",
  },
  debugButtonText: { color: "#a5efbd", fontSize: 8, letterSpacing: 1.2, fontWeight: "700" },
  playButton: {
    minWidth: 76,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(221,190,132,0.4)",
    backgroundColor: "rgba(126,82,39,0.36)",
  },
  playButtonText: { color: "#edd7aa", fontSize: 9, letterSpacing: 1.7, fontWeight: "700" },
  sliderTouchArea: { height: 44, justifyContent: "center" },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: "rgba(224,207,173,0.17)",
  },
  sliderFill: { height: "100%", borderRadius: 2, backgroundColor: "#b98949" },
  sliderThumb: {
    position: "absolute",
    top: 11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#d9bd82",
    borderWidth: 4,
    borderColor: "#3a291b",
  },
  checkpoints: { flexDirection: "row", justifyContent: "space-between", gap: 5 },
  checkpoint: {
    flex: 1,
    height: 27,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(215,195,159,0.13)",
  },
  checkpointSelected: {
    borderColor: "rgba(221,190,132,0.52)",
    backgroundColor: "rgba(126,82,39,0.38)",
  },
  checkpointText: {
    color: "rgba(218,203,175,0.54)",
    fontSize: 9,
    fontVariant: ["tabular-nums"],
  },
  checkpointTextSelected: { color: "#ead4aa" },
});
