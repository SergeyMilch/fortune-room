import type { ReactNode } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { palette } from "@/theme/palette";

const effectiveDate = "17 августа 2026 г.";
const privacyEmail = "sermildev@gmail.com";
const yandexPrivacyUrl = "https://yandex.ru/legal/confidential/";

function openUrl(url: string) {
  void Linking.openURL(url).catch(() => undefined);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text selectable style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: ReactNode }) {
  return <Text selectable style={styles.paragraph}>{children}</Text>;
}

export function FortuneRoomPrivacyPolicy({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headingCopy}>
          <Text selectable style={styles.title}>Политика конфиденциальности</Text>
          <Text selectable style={styles.effectiveDate}>
            Fortune Room · действует с {effectiveDate}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Вернуться к настройкам"
          hitSlop={10}
          onPress={onClose}
          style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
        >
          <Text style={styles.closeText}>НАЗАД</Text>
        </Pressable>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Section title="1. Общие положения">
          <Paragraph>
            Настоящая политика описывает, какие сведения могут обрабатываться при использовании
            развлекательного приложения Fortune Room, для чего они нужны и как пользователь может
            управлять ими. Регистрация и создание аккаунта для работы приложения не требуются.
          </Paragraph>
        </Section>

        <Section title="2. Данные приложения">
          <Paragraph>
            Настройки звука и вибрации, локальный идентификатор пользователя, а также игровые данные
            и прогресс, если соответствующие функции доступны, хранятся на устройстве пользователя.
            Разработчик не получает и не хранит эти сведения на собственном сервере.
          </Paragraph>
          <Paragraph>
            Fortune Room не записывает звук, не получает содержание мысленно заданного вопроса и не
            запрашивает доступ к контактам, фотографиям, камере или точному местоположению устройства.
          </Paragraph>
        </Section>

        <Section title="3. Возможности устройства">
          <Paragraph>
            Воспроизведение звуков и тактильная отдача используются только для оформления игровых
            ритуалов. Звук и вибрацию можно отключить в настройках приложения. Fortune Room не
            использует микрофон и не воспроизводит звук в фоновом режиме.
          </Paragraph>
        </Section>

        <Section title="4. Реклама и технические данные">
          <Paragraph>
            Версии приложения с рекламой могут использовать Yandex Mobile Ads SDK. При загрузке и
            показе рекламы Яндекс может обрабатывать технические сведения об устройстве и приложении,
            IP-адрес, рекламный идентификатор, приблизительное местоположение и данные о показах,
            нажатиях и взаимодействии с рекламой. Эти сведения могут использоваться для показа и
            оценки рекламы, ограничения повторных показов, безопасности и предотвращения
            недействительной активности.
          </Paragraph>
          <Paragraph>
            Локальные настройки, результаты ритуалов и иные игровые данные не передаются в рекламный
            SDK для подбора рекламы.
          </Paragraph>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => openUrl(yandexPrivacyUrl)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text selectable style={styles.link}>Политика конфиденциальности Яндекса</Text>
          </Pressable>
        </Section>

        <Section title="5. Сторонние сервисы">
          <Paragraph>
            Магазин приложений, операционная система и подключённые рекламные сервисы могут
            самостоятельно обрабатывать технические сведения в соответствии со своими правилами.
            Сроки хранения и порядок удаления таких сведений определяются соответствующим сервисом.
          </Paragraph>
        </Section>

        <Section title="6. Хранение и удаление">
          <Paragraph>
            Локальные данные сохраняются на устройстве, пока пользователь не очистит данные
            приложения или не удалит его. Удаление приложения обычно удаляет локальные данные, если
            операционная система или пользователь не восстановят их из резервной копии.
          </Paragraph>
        </Section>

        <Section title="7. Обращения и изменение политики">
          <Paragraph>
            По вопросам конфиденциальности можно обратиться к разработчику через страницу Fortune
            Room в RuStore или по электронной почте:
          </Paragraph>
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() => openUrl(`mailto:${privacyEmail}`)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <Text selectable style={styles.link}>{privacyEmail}</Text>
          </Pressable>
          <Paragraph>
            Поскольку основные данные находятся только на устройстве, разработчик не может
            просмотреть или удалить их удалённо. Политика может обновляться при изменении функций,
            подключённых сервисов или требований законодательства. Актуальная версия публикуется в
            приложении.
          </Paragraph>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(231,217,190,0.09)",
  },
  headingCopy: { flex: 1, gap: 5 },
  title: {
    color: palette.parchment,
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "700",
  },
  effectiveDate: { color: "rgba(231,217,190,0.48)", fontSize: 11, lineHeight: 16 },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(199,146,74,0.22)",
  },
  closeText: {
    color: "rgba(231,217,190,0.64)",
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 34, gap: 22 },
  section: { gap: 9 },
  sectionTitle: {
    color: "rgba(240,225,197,0.94)",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
  },
  paragraph: { color: "rgba(231,217,190,0.68)", fontSize: 13, lineHeight: 20 },
  link: {
    color: palette.amber,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  pressed: { opacity: 0.62 },
});
