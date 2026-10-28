import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';

import { Icon } from '@/components/icon';
import { hexToRgba } from '@/components/ui';
import { useAppTheme } from '@/ctx/theme';
import type { Coords } from '@/lib/endpoints';

import type { EventMapProps } from './event-map';
import { PinMarker } from './pin-marker';

const KM_PER_DEG_LAT = 111;

/**
 * react-native-maps has no web support, so on web we draw a "radar": pins are
 * projected around the center with an equirectangular approximation, which is
 * accurate enough at city scale.
 */
export function EventMap({ center, pins = [], selectedId, onSelectPin, onPick, picked, radiusKm = 8, style }: EventMapProps) {
  const { colors } = useAppTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });

  const kmPerPx = (radiusKm * 2) / Math.max(1, Math.min(size.w, size.h));
  const lngScale = Math.cos((center.lat * Math.PI) / 180);

  const project = (c: Coords) => ({
    x: size.w / 2 + ((c.lng - center.lng) * KM_PER_DEG_LAT * lngScale) / kmPerPx,
    y: size.h / 2 - ((c.lat - center.lat) * KM_PER_DEG_LAT) / kmPerPx,
  });

  const unproject = (x: number, y: number): Coords => ({
    lat: center.lat - ((y - size.h / 2) * kmPerPx) / KM_PER_DEG_LAT,
    lng: center.lng + ((x - size.w / 2) * kmPerPx) / (KM_PER_DEG_LAT * lngScale),
  });

  const onLayout = (e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  const pickedPoint = picked ? project(picked) : null;

  return (
    <Pressable
      onLayout={onLayout}
      disabled={!onPick}
      onPress={(e) => onPick?.(unproject(e.nativeEvent.locationX, e.nativeEvent.locationY))}
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.surface, overflow: 'hidden' }, style]}>
      {/* Street-grid texture */}
      {[...Array(14)].map((_, i) => (
        <View key={`h${i}`} style={[styles.line, { top: `${i * 7.5}%`, height: 1, left: 0, right: 0, backgroundColor: hexToRgba(colors.secondary, 0.05) }]} />
      ))}
      {[...Array(14)].map((_, i) => (
        <View key={`v${i}`} style={[styles.line, { left: `${i * 7.5}%`, width: 1, top: 0, bottom: 0, backgroundColor: hexToRgba(colors.secondary, 0.05) }]} />
      ))}
      {[0.9, 0.6, 0.3].map((r) => {
        const d = Math.min(size.w, size.h) * r;
        return (
          <View
            key={r}
            style={[styles.ring, { width: d, height: d, borderRadius: d / 2, left: size.w / 2 - d / 2, top: size.h / 2 - d / 2, borderColor: hexToRgba(colors.primary, 0.12) }]}
          />
        );
      })}

      {!onPick && size.w > 0 && (
        <View style={[styles.me, { left: size.w / 2 - 9, top: size.h / 2 - 9, backgroundColor: colors.secondary, borderColor: colors.background }]} />
      )}

      {size.w > 0 &&
        pins.map((pin) => {
          const p = project({ lat: pin.latitude, lng: pin.longitude });
          if (p.x < -40 || p.y < -40 || p.x > size.w + 40 || p.y > size.h + 40) return null;
          return (
            <Pressable
              key={pin.id}
              onPress={() => onSelectPin?.(pin.id)}
              style={[styles.pin, { left: p.x, top: p.y, zIndex: pin.id === selectedId ? 2 : 1 }]}>
              <PinMarker pin={pin} selected={pin.id === selectedId} />
            </Pressable>
          );
        })}

      {pickedPoint && size.w > 0 && (
        <View pointerEvents="none" style={[styles.pin, { left: pickedPoint.x, top: pickedPoint.y - 18 }]}>
          <Icon name="pin" size={40} color={colors.primary} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { position: 'absolute' },
  ring: { position: 'absolute', borderWidth: 1 },
  me: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
  // Centers the marker on its coordinate.
  pin: { position: 'absolute', transform: [{ translateX: '-50%' }, { translateY: '-50%' }] },
});
