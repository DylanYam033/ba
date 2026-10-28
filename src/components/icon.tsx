import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

/** Semantic icon names → SF Symbol (iOS) + Material Symbol (Android / web). */
const ICONS = {
  map: ['map', 'map'],
  explore: ['safari', 'explore'],
  events: ['calendar.badge.checkmark', 'event_available'],
  person: ['person', 'person'],
  search: ['magnifyingglass', 'search'],
  myLocation: ['location.fill', 'my_location'],
  pin: ['mappin.circle.fill', 'location_on'],
  calendar: ['calendar', 'calendar_today'],
  clock: ['clock', 'schedule'],
  bookmark: ['bookmark', 'bookmark'],
  bookmarkFill: ['bookmark.fill', 'bookmark'],
  share: ['square.and.arrow.up', 'ios_share'],
  check: ['checkmark.circle.fill', 'check_circle'],
  fire: ['flame.fill', 'local_fire_department'],
  add: ['plus', 'add'],
  back: ['chevron.left', 'arrow_back'],
  close: ['xmark', 'close'],
  darkMode: ['moon.fill', 'dark_mode'],
  lightMode: ['sun.max.fill', 'light_mode'],
  settings: ['gearshape', 'settings'],
  logout: ['rectangle.portrait.and.arrow.right', 'logout'],
  eye: ['eye', 'visibility'],
  eyeOff: ['eye.slash', 'visibility_off'],
  camera: ['camera.fill', 'photo_camera'],
  forward: ['arrow.right', 'arrow_forward'],
  ticket: ['ticket', 'confirmation_number'],
  photos: ['photo.on.rectangle', 'photo_library'],
  nearMe: ['location.north.fill', 'near_me'],
  bolt: ['bolt.fill', 'bolt'],
  refresh: ['arrow.clockwise', 'refresh'],
  mail: ['envelope', 'mail'],
  lock: ['lock', 'lock'],
  store: ['storefront', 'storefront'],
  edit: ['pencil', 'edit'],
  chevronRight: ['chevron.right', 'chevron_right'],
  // Categories
  food: ['fork.knife', 'restaurant'],
  nightlife: ['moon.stars.fill', 'nightlife'],
  music: ['music.note', 'music_note'],
  sports: ['soccerball', 'sports_soccer'],
  art: ['paintpalette.fill', 'palette'],
  festival: ['tent.fill', 'festival'],
  corporate: ['briefcase.fill', 'business_center'],
  community: ['person.3.fill', 'groups'],
  cinema: ['film.fill', 'movie'],
  wellness: ['figure.mind.and.body', 'self_improvement'],
  foodTruck: ['box.truck.fill', 'local_shipping'],
  other: ['square.grid.2x2.fill', 'category'],
} satisfies Record<string, [SFSymbol, AndroidSymbol]>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 22, color, style }: IconProps) {
  const [ios, material] = ICONS[name];
  return (
    <SymbolView
      name={{ ios, android: material, web: material }}
      size={size}
      tintColor={color}
      style={[{ width: size, height: size }, style]}
    />
  );
}
