import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/ctx/theme';
import { mediaSource } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import type { EventCategory } from '@/lib/types';

import { Icon } from './icon';
import { hexToRgba } from './ui';

/**
 * Event artwork. The API has no image upload yet, so events without a coverUrl
 * get the same empty-state look as the profile stat cards: a flat surface with
 * the category icon oversized and bleeding off the right edge.
 */
export function EventCover({
  uri,
  category,
  style,
  fade = true,
  iconSize = 120,
}: {
  uri: string | null;
  category: EventCategory;
  style?: StyleProp<ViewStyle>;
  fade?: boolean;
  iconSize?: number;
}) {
  const { colors } = useAppTheme();
  const meta = CATEGORIES[category] ?? CATEGORIES.other;

  return (
    <View style={[styles.base, { backgroundColor: uri ? colors.surfaceHigh : colors.surfaceContainer }, style]}>
      {uri ? (
        <Image source={mediaSource(uri)} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        // Vertically centered on the right edge: card corners hold the live badge and the attendee chip.
        <View style={{ position: 'absolute', right: -iconSize * 0.17, top: '50%', marginTop: -iconSize / 2 }}>
          <Icon name={meta.icon} size={iconSize} color={colors.surfaceHighest} />
        </View>
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
});
