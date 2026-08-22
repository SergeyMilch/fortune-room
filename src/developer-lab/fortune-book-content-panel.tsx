import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  fortuneBookContentService,
  type FortuneBookDiagnostics,
} from "@/rituals/fortune-book/content/fortune-book-content-service";

export function FortuneBookContentPanel() {
  const [diagnostics, setDiagnostics] = useState<FortuneBookDiagnostics | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setDiagnostics(await fortuneBookContentService.getDiagnostics());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [busy, refresh]);

  if (!diagnostics) return null;

  return (
    <View style={styles.panel}>
      <View style={styles.readout}>
        <Text style={styles.title}>FORTUNE BOOK CONTENT</Text>
        <Text selectable style={styles.value}>
          CYCLE {diagnostics.cycle} · CURSOR {diagnostics.cursor}/{diagnostics.total} · SPREAD {diagnostics.spread}/60
        </Text>
        <Text selectable style={styles.secondary}>
          REMAINING {diagnostics.remaining} · SELECTED {diagnostics.selected ?? "—"}
        </Text>
      </View>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void run(() => fortuneBookContentService.createNextSpread())}
          style={({ pressed }) => [styles.button, pressed && styles.pressed, busy && styles.disabled]}
        >
          <Text style={styles.buttonText}>NEXT SPREAD</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void run(() => fortuneBookContentService.resetDev())}
          style={({ pressed }) => [styles.button, styles.resetButton, pressed && styles.pressed, busy && styles.disabled]}
        >
          <Text style={styles.buttonText}>RESET SHUFFLE</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(210,176,118,0.2)",
    backgroundColor: "rgba(3,5,7,0.9)",
  },
  readout: { flex: 1, gap: 2 },
  title: { color: "rgba(222,205,171,0.64)", fontSize: 7, letterSpacing: 1.2 },
  value: { color: "#ebd7ab", fontSize: 8, fontVariant: ["tabular-nums"] },
  secondary: { color: "rgba(231,215,183,0.62)", fontSize: 7 },
  actions: { gap: 4 },
  button: {
    minWidth: 82,
    minHeight: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(110,232,151,0.25)",
    backgroundColor: "rgba(15,65,39,0.24)",
  },
  resetButton: {
    borderColor: "rgba(221,190,132,0.3)",
    backgroundColor: "rgba(126,82,39,0.24)",
  },
  buttonText: { color: "rgba(236,221,193,0.86)", fontSize: 7, letterSpacing: 0.6 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
});
