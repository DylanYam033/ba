/** Google Maps "night mode" tuned to the Neon Pulse surfaces (Android). */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#131318' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a8291' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0e0e13' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a292f' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#35343a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4f4352' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1d24' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#1b1b20' }] },
];
