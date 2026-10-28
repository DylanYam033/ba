import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/ctx/theme';
import { CATEGORIES } from '@/lib/categories';
import type { EventCategory } from '@/lib/types';

import { hexToRgba } from './ui';

/**
 * Event artwork. The API has no image upload yet, so events without a coverUrl
 * get a category-tinted neon gradient with the category emoji.
 */
export function EventCover({
  uri,
  category,
  style,
  fade = true,
  emojiSize = 56,
}: {
  uri: string | null;
  category: EventCategory;
  style?: StyleProp<ViewStyle>;
  fade?: boolean;
  emojiSize?: number;
}) {
  const { colors } = useAppTheme();
  const meta = CATEGORIES[category] ?? CATEGORIES.other;

  return (
    <View style={[styles.base, { backgroundColor: colors.surfaceHigh }, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <LinearGradient
          colors={[hexToRgba(meta.color, 0.55), hexToRgba(colors.primaryContainer, 0.25), colors.surfaceLow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Text style={{ fontSize: emojiSize }}>{meta.emoji}</Text>
        </LinearGradient>
      )}
      {fade && (
        <LinearGradient
          colors={['transparent', hexToRgba(colors.background, 0.85)]}
          style={[StyleSheet.absoluteFill, { top: '45%' }]}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
