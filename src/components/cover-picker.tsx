import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import type { UploadFile } from '@/lib/api';
import { pickImage } from '@/lib/pick-image';

import { Icon } from './icon';
import { AppText } from './ui';

/** Covers render at 16:9 on cards and the event page, so crop to that when picking. */
const COVER_ASPECT: [number, number] = [16, 9];

/** Optional event cover: tap to pick from the gallery (cropped 16:9), with preview, change and remove. */
export function CoverPicker({ value, onChange }: { value: UploadFile | null; onChange: (file: UploadFile | null) => void }) {
  const { colors } = useAppTheme();

  const pick = async () => {
    const file = await pickImage({ aspect: COVER_ASPECT, quality: 0.8 });
    if (file) onChange(file);
  };

  if (!value) {
    return (
      <Pressable
        onPress={pick}
        accessibilityRole="button"
        accessibilityLabel="Agregar imagen de portada"
        style={({ pressed }) => [
          styles.frame,
          styles.empty,
          { borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainer, opacity: pressed ? 0.8 : 1 },
        ]}>
        <Icon name="photos" size={32} color={colors.primary} />
        <AppText variant="bodyStrong">Agregar portada</AppText>
        <AppText variant="caption">Opcional · se recorta en formato 16:9</AppText>
      </Pressable>
    );
  }

  return (
    <View style={[styles.frame, { backgroundColor: colors.surfaceHigh }]}>
      <Image source={{ uri: value.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.actions}>
        <Pressable onPress={pick} accessibilityRole="button" style={[styles.action, { backgroundColor: colors.overlay }]}>
          <Icon name="edit" size={16} color={colors.text} />
          <AppText variant="label" color={colors.text}>
            Cambiar
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel="Quitar portada"
          style={[styles.action, { backgroundColor: colors.overlay }]}>
          <Icon name="trash" size={16} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { width: '100%', aspectRatio: COVER_ASPECT[0] / COVER_ASPECT[1], borderRadius: Radius.md, overflow: 'hidden' },
  empty: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  actions: { position: 'absolute', right: Spacing.three, bottom: Spacing.three, flexDirection: 'row', gap: Spacing.two },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full },
});
