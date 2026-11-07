import { BlurView } from 'expo-blur';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { AppText, glow } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';

// Profile isn't a tab: it opens from the avatar in every top bar.
const TABS: Record<string, { label: string; icon: IconName }> = {
  index: { label: 'Inicio', icon: 'home' },
  map: { label: 'Mapa', icon: 'map' },
  explore: { label: 'Explorar', icon: 'explore' },
  events: { label: 'Eventos', icon: 'events' },
};

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="map" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="events" />
    </Tabs>
  );
}

/** Floating glass nav bar: rounded top, active tab glows in brand purple. */
function GlassTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const { colors, scheme } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, glow(colors.brandStart, 0.12, 32)]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={60} tint={scheme} style={StyleSheet.absoluteFill} />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Platform.OS === 'ios' ? colors.glass : colors.overlay },
          Platform.OS === 'web' && ({ backdropFilter: 'blur(24px)' } as object),
        ]}
      />
      <View style={[styles.row, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
        {state.routes.map((route, index) => {
          const tab = TABS[route.name];
          if (!tab) return null;
          const focused = state.index === index;
          const color = focused ? colors.primaryDeep : colors.textMuted;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={tab.label}
              onPress={() => {
                const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) navigateToTab(route.key);
              }}
              style={[styles.tab, focused && { transform: [{ scale: 1.08 }] }]}>
              <Icon name={tab.icon} size={24} color={color} />
              <AppText variant="label" color={color} style={{ fontSize: 9, marginTop: 4 }}>
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: Spacing.three - 4, paddingHorizontal: Spacing.three },
  tab: { alignItems: 'center', justifyContent: 'center', minWidth: 64, paddingVertical: 4 },
});
