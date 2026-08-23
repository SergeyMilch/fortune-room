import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { palette } from "@/theme/palette";

import type { RitualId } from "./ritual-access";

const ritualCopy: Record<RitualId, { title: string; action: string }> = {
  crystalBall: { title: "Спросить шар снова", action: "ещё один вопрос шару" },
  fortuneBook: { title: "Открыть книгу снова", action: "ещё одно обращение к книге" },
  fortuneCookie: { title: "Ещё одно печенье", action: "ещё одно предсказание" },
  runes: { title: "Сделать новый расклад", action: "ещё один расклад" },
  coin: { title: "Подбросить монету снова", action: "ещё один бросок" },
};

type RewardedAccessModalProps = {
  visible: boolean;
  ritualId: RitualId;
  showingAd: boolean;
  errorMessage: string | null;
  onWatchAd(): void;
  onDismiss(): void;
};

export function RewardedAccessModal({
  visible,
  ritualId,
  showingAd,
  errorMessage,
  onWatchAd,
  onDismiss,
}: RewardedAccessModalProps) {
  const copy = ritualCopy[ritualId];
  return (
    <Modal
      animationType="fade"
      transparent
      statusBarTranslucent
      visible={visible}
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View accessibilityViewIsModal style={styles.card}>
          <Text selectable style={styles.eyebrow}>ЕЩЁ ОДНО ГАДАНИЕ</Text>
          <Text selectable style={styles.title}>{copy.title}</Text>
          <Text selectable style={styles.freeNote}>
            Каждый ритуал можно пройти без просмотра рекламы два раза в час.
          </Text>
          <Text selectable style={styles.body}>
            Если хотите обратиться к фортуне сейчас — посмотрите короткий ролик.
          </Text>
          {errorMessage ? <Text selectable style={styles.error}>{errorMessage}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Смотреть рекламу и получить дополнительное гадание"
            disabled={showingAd}
            onPress={onWatchAd}
            style={({ pressed }) => [
              styles.watchButton,
              pressed && !showingAd && styles.pressed,
              showingAd && styles.disabled,
            ]}
          >
            <Text style={styles.watchText}>
              {showingAd ? "ОТКРЫВАЕМ РЕКЛАМУ…" : "СМОТРЕТЬ РЕКЛАМУ"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={showingAd}
            onPress={onDismiss}
            hitSlop={10}
            style={({ pressed }) => [styles.laterButton, pressed && styles.pressed]}
          >
            <Text style={styles.laterText}>НЕ СЕЙЧАС</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(1,3,5,0.82)",
  },
  card: {
    width: "100%",
    maxWidth: 390,
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 24,
    paddingVertical: 27,
    borderRadius: 24,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.42)",
    backgroundColor: "#0A0D10",
    boxShadow: "0 18px 50px rgba(0,0,0,0.58)",
  },
  eyebrow: {
    color: "rgba(199,146,74,0.88)",
    fontSize: 9,
    letterSpacing: 2.1,
    fontWeight: "700",
  },
  title: {
    color: palette.parchment,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
    fontFamily: "serif",
  },
  body: {
    color: "rgba(231,217,190,0.74)",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  freeNote: {
    color: "rgba(199,146,74,0.82)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  error: {
    color: "rgba(230,184,128,0.94)",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  watchButton: {
    width: "100%",
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "rgba(216,164,90,0.62)",
    backgroundColor: "rgba(122,90,50,0.48)",
  },
  watchText: {
    color: "#F2E3C7",
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
  laterButton: { paddingHorizontal: 18, paddingVertical: 8 },
  laterText: {
    color: "rgba(231,217,190,0.56)",
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "600",
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.55 },
});
