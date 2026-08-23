import { useEffect } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/theme/palette";
import { RewardedAccessModal } from "@/ads/rewarded-access-modal";
import { useRitualRewardedAccess } from "@/ads/use-ritual-rewarded-access";

import { getFortuneBookGeometry } from "./fortune-book-geometry";
import { FortuneBookScene } from "./fortune-book-scene";
import { useFortuneBookRitual } from "./use-fortune-book-ritual";

export function FortuneBookScreen() {
  const { width, height } = useWindowDimensions();
  const geometry = getFortuneBookGeometry(width, height);
  const ritual = useFortuneBookRitual();
  const access = useRitualRewardedAccess("fortuneBook");

  useEffect(() => {
    if (ritual.phase === "result") access.recordResult();
  }, [access.recordResult, ritual.phase]);

  const instruction =
    ritual.phase === "closed"
      ? "Задай вопрос мысленно"
      : ritual.phase === "opening"
        ? "Книга пробуждается"
        : ritual.phase === "flipping" || ritual.phase === "stopping"
          ? "Следи за страницами"
          : ritual.phase === "pageReady"
            ? "Выбери одну строку"
            : ritual.phase === "result"
              ? "Ответ открыт"
              : "Прислушайся к выбранным словам";

  return (
    <View style={styles.screen}>
      <FortuneBookScene
        geometry={geometry}
        phase={ritual.phase}
        entries={ritual.entries}
        selectedId={ritual.selectedId}
        onSelect={ritual.selectLine}
        openProgress={ritual.openProgress}
        pageTurn={ritual.pageTurn}
        linesProgress={ritual.linesProgress}
        selectionProgress={ritual.selectionProgress}
        revealProgress={ritual.revealProgress}
        settle={ritual.settle}
      />

      {ritual.phase === "closed" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Книга судьбы"
          accessibilityHint="Коснитесь, чтобы открыть книгу"
          hitSlop={8}
          onPress={() => access.beginAttempt(ritual.startRitual)}
          style={{
            position: "absolute",
            left: geometry.closedBook.left,
            top: geometry.closedBook.top,
            width: geometry.closedBook.width,
            height: geometry.closedBook.height,
            borderRadius: geometry.closedBook.borderRadius,
          }}
        />
      ) : null}

      <SafeAreaView pointerEvents="box-none" style={styles.safeArea}>
        <View pointerEvents="none" style={styles.heading}>
          <Text selectable style={styles.instruction}>{instruction}</Text>
        </View>

        <View style={styles.footer}>
          {ritual.phase === "closed" ? (
            <Text selectable style={styles.footerHint}>КОСНИСЬ КНИГИ</Text>
          ) : null}

          {ritual.phase === "flipping" && ritual.stopAvailable ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Остановить перелистывание"
              onPress={ritual.stopFlipping}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionText}>ОСТАНОВИТЬ</Text>
            </Pressable>
          ) : null}

          {ritual.phase === "pageReady" ? (
            <Text selectable style={styles.footerHint}>КОСНИСЬ ОДНОЙ СТРОКИ</Text>
          ) : null}

          {ritual.phase === "result" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Спросить снова"
              onPress={() => access.beginAttempt(ritual.resetRitual)}
              style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
            >
              <Text style={styles.actionText}>СПРОСИТЬ СНОВА</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
      <RewardedAccessModal {...access.prompt} />
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
    paddingHorizontal: 18,
  },
  heading: { alignItems: "center", paddingTop: 18 },
  instruction: {
    color: "rgba(234,219,193,0.9)",
    fontSize: 18,
    lineHeight: 25,
    fontFamily: "serif",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.96)",
    textShadowRadius: 10,
  },
  footer: { minHeight: 68, alignItems: "center", justifyContent: "center", paddingBottom: 12 },
  footerHint: {
    color: "rgba(234,219,193,0.72)",
    fontSize: 9,
    letterSpacing: 2.2,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.96)",
    textShadowRadius: 8,
  },
  actionButton: {
    minWidth: 182,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.36)",
    backgroundColor: "rgba(7,9,10,0.8)",
  },
  actionPressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  actionText: {
    color: "rgba(239,225,200,0.94)",
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "600",
  },
});
