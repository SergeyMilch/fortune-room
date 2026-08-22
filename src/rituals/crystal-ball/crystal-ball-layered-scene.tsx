import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated from "react-native-reanimated";

const layers = {
  approvedScene: require("../../../assets/crystal-ball/layers/static-layered-preview-no-flames.png"),
} as const;

type CrystalBallLayeredSceneProps = {
  sceneDimming: ReactNode;
  candleContent: ReactNode;
  orbStyle: object;
  innerContent: ReactNode;
  predictionContent: ReactNode;
  smokeContent: ReactNode;
  glassContent: ReactNode;
  frontContent: ReactNode;
};

function SceneLayer({ source }: { source: number }) {
  return (
    <Image
      pointerEvents="none"
      source={source}
      contentFit="contain"
      contentPosition="center"
      transition={0}
      style={StyleSheet.absoluteFill}
    />
  );
}

export function CrystalBallLayeredScene({
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
      <SceneLayer source={layers.approvedScene} />
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
