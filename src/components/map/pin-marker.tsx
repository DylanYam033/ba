import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppText, glow, hexToRgba } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { CATEGORIES } from '@/lib/categories';
import type { MapPin } from '@/lib/types';

/** Pin size grows with attendance, per the PRD ("tamaño según asistentes"). */
export function pinSize(attendees: number) {
  if (attendees >= 200) return 48;
  if (attendees >= 50) return 40;
  if (attendees >= 10) return 34;
  return 28;
}

export function PinMarker({ pin, selected }: { pin: MapPin; selected?: boolean }) {
  const { colors } = useAppTheme();
  const meta = CATEGORIES[pin.category] ?? CATEGORIES.other;
  const size = pinSize(pin.currentAttendees) + (selected ? 8 : 0);
  const live = pin.status === 'live';

  return (
    <View style={styles.wrap} pointerEvents="none">
      {live && (
        <View style={[styles.liveTag, { backgroundColor: colors.live }]}>
          <AppText variant="label" color="#fff" style={{ fontSize: 8 }}>
            EN VIVO
          </AppText>
        </View>
      )}
      <View
        style={[
          styles.halo,
          { width: size + 16, height: size + 16, borderRadius: (size + 16) / 2, backgroundColor: hexToRgba(meta.color, selected ? 0.4 : 0.22) },
        ]}>
        <View
          style={[
            styles.core,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: meta.color, borderColor: selected ? '#fff' : 'rgba(255,255,255,0.35)' },
            glow(meta.color, 0.8, 16),
          ]}>
          <Icon name={meta.icon} size={size * 0.45} color="#fff" />
        </View>
      </View>
      {pin.currentAttendees > 0 && (
        <View style={[styles.count, { backgroundColor: colors.primary }]}>
          <AppText variant="label" color={colors.onPrimary} style={{ fontSize: 9 }}>
            {pin.currentAttendees} van
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  halo: { alignItems: 'center', justifyContent: 'center' },
  core: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  liveTag: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginBottom: 2 },
  count: { marginTop: 2, paddingHorizontal: 7, paddingVertical: 1, borderRadius: Radius.full },
});
