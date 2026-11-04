import { useEffect, useRef } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, type LatLng } from 'react-native-maps';

import { useAppTheme } from '@/ctx/theme';
import type { Coords } from '@/lib/endpoints';
import type { MapPin } from '@/lib/types';

import { PinMarker } from './pin-marker';

export interface EventMapProps {
  center: Coords;
  pins?: MapPin[];
  selectedId?: string | null;
  onSelectPin?: (id: string) => void;
  /** Location-picker mode: tapping the map moves a single pin. */
  onPick?: (c: Coords) => void;
  picked?: Coords | null;
  /** Approx. visible radius; the web fallback uses it as its projection scale. */
  radiusKm?: number;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
}

const delta = (radiusKm: number) => (radiusKm / 111) * 2;

export function EventMap({ center, pins = [], selectedId, onSelectPin, onPick, picked, radiusKm = 8, interactive = true, style }: EventMapProps) {
  const { scheme } = useAppTheme();
  const map = useRef<MapView>(null);

  useEffect(() => {
    map.current?.animateToRegion(
      { latitude: center.lat, longitude: center.lng, latitudeDelta: delta(radiusKm), longitudeDelta: delta(radiusKm) },
      400,
    );
  }, [center.lat, center.lng, radiusKm]);

  const toCoords = (c: LatLng): Coords => ({ lat: c.latitude, lng: c.longitude });

  return (
    <MapView
      // Android reads userInterfaceStyle only when the map is created, so remount on theme change.
      key={scheme}
      ref={map}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: delta(radiusKm), longitudeDelta: delta(radiusKm) }}
      // Google's native light / dark map, matching the app theme.
      userInterfaceStyle={scheme}
      showsUserLocation={!onPick}
      showsMyLocationButton={false}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      onPress={onPick ? (e) => onPick(toCoords(e.nativeEvent.coordinate)) : undefined}>
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
          onPress={() => onSelectPin?.(pin.id)}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}>
          <PinMarker pin={pin} selected={pin.id === selectedId} />
        </Marker>
      ))}
      {picked && (
        <Marker
          coordinate={{ latitude: picked.lat, longitude: picked.lng }}
          draggable
          onDragEnd={(e) => onPick?.(toCoords(e.nativeEvent.coordinate))}
        />
      )}
    </MapView>
  );
}
