import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { palette } from "@/theme/palette";

import { FortuneRoomPrivacyPolicy } from "./fortune-room-privacy-policy";

type FortuneRoomHomeSettingsProps = {
  visible: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;
  onSoundChange: (enabled: boolean) => void;
  onHapticChange: (enabled: boolean) => void;
  onClose: () => void;
};

function SettingRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (enabled: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#3B3935", true: "#79613F" }}
        thumbColor={value ? palette.parchment : "#B6ADA0"}
      />
    </View>
  );
}

export function FortuneRoomHomeSettings(props: FortuneRoomHomeSettingsProps) {
  const [privacyVisible, setPrivacyVisible] = useState(false);

  useEffect(() => {
    if (!props.visible) setPrivacyVisible(false);
  }, [props.visible]);

  const handleClose = () => {
    if (privacyVisible) {
      setPrivacyVisible(false);
      return;
    }
    props.onClose();
  };

  return (
    <Modal
      transparent
      statusBarTranslucent
      animationType="fade"
      visible={props.visible}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalRoot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть настройки"
          onPress={handleClose}
          style={styles.backdrop}
        />
        <Animated.View
          entering={FadeInDown.duration(240)}
          style={[styles.panel, privacyVisible && styles.privacyPanel]}
        >
          {privacyVisible ? (
            <FortuneRoomPrivacyPolicy onClose={() => setPrivacyVisible(false)} />
          ) : (
            <>
              <View style={styles.handle} />
              <Text style={styles.title}>НАСТРОЙКИ</Text>
              <SettingRow
                label="Звук"
                value={props.soundEnabled}
                onValueChange={props.onSoundChange}
              />
              <View style={styles.divider} />
              <SettingRow
                label="Вибрация"
                value={props.hapticEnabled}
                onValueChange={props.onHapticChange}
              />
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => setPrivacyVisible(true)}
                style={({ pressed }) => [styles.privacyLink, pressed && styles.linkPressed]}
              >
                <Text style={styles.privacyLinkText}>Политика конфиденциальности</Text>
              </Pressable>
              <Text style={styles.version}>FORTUNE ROOM · 0.1.0</Text>
            </>
          )}
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(1,3,5,0.66)",
  },
  panel: {
    marginHorizontal: 12,
    marginBottom: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.28)",
    backgroundColor: "rgba(13,16,18,0.97)",
  },
  privacyPanel: {
    height: "88%",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    overflow: "hidden",
  },
  handle: {
    alignSelf: "center",
    width: 34,
    height: 3,
    borderRadius: 2,
    marginBottom: 16,
    backgroundColor: "rgba(231,217,190,0.28)",
  },
  title: {
    color: palette.parchment,
    fontSize: 12,
    letterSpacing: 2.5,
    fontWeight: "600",
    marginBottom: 7,
  },
  row: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLabel: { color: "rgba(245,235,215,0.92)", fontSize: 16 },
  divider: { height: 1, backgroundColor: "rgba(231,217,190,0.09)" },
  privacyLink: { alignSelf: "flex-start", paddingVertical: 8 },
  privacyLinkText: {
    color: "rgba(231,217,190,0.46)",
    fontSize: 10,
    lineHeight: 15,
    textDecorationLine: "underline",
  },
  linkPressed: { opacity: 0.62 },
  version: {
    marginTop: 3,
    color: "rgba(231,217,190,0.36)",
    fontSize: 9,
    letterSpacing: 1.5,
  },
});
