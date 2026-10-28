import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Extends app.json with values that must not be committed.
 * GOOGLE_MAPS_API_KEY is required for the map in Android release builds
 * (Expo Go ships its own key, so development works without it).
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  plugins: [
    ...(config.plugins ?? []),
    ['react-native-maps', { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY }],
  ],
});
