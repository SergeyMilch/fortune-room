import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated from "react-native-reanimated";

import type { CrystalBallGeometry } from "./crystal-ball-geometry";

const layers = {
  approvedScene: require("../../../assets/crystal-ball/layers/static-layered-preview-no-flames.png"),
} as const;

type CrystalBallLayeredSceneProps = {
  geometry: CrystalBallGeometry;
  sceneDimming: ReactNode;
  candleContent: ReactNode;
  orbStyle: object;
  innerContent: ReactNode;
  predictionContent: ReactNode;
  smokeContent: ReactNode;
  glassContent: ReactNode;
  frontContent: ReactNode;
};

function SceneLayer({
  source,
  geometry,
}: {
  source: number;
  geometry: CrystalBallGeometry;
}) {
  return (
    <Image
      pointerEvents="none"
      source={source}
      contentFit="fill"
      transition={0}
      style={[styles.artwork, geometry.artwork]}
    />
  );
}

export function CrystalBallLayeredScene({
  geometry,
  sceneDimming,
  candleContent,
  orbStyle,
  innerContent,
  predictionContent,
  smokeContent,
  glassContent,
  frontContent,
}: CrystalBallLayeredSceneProps) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <SceneLayer source={layers.approvedScene} geometry={geometry} />
      {sceneDimming}
      {candleContent}

      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, orbStyle]}>
        {innerContent}
        {predictionContent}
        {smokeContent}
        {glassContent}
        {frontContent}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: { position: "absolute" },
});
