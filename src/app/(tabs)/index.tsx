import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HeaderActions } from '@/components/top-bar';
import { AppText } from '@/components/ui';
import { MaxContentWidth, Spacing, TabBarHeight } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';

/** Landing tab. Basic for now: greeting + welcome; highlights will live here later. */
export default function Home() {
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.three }]}>
        <View style={styles.titleRow}>
          <AppText variant="display" style={{ flex: 1 }}>
            Hola, {user.username}
          </AppText>
          <HeaderActions showAvatar />
        </View>
        <AppText variant="body" color={colors.textSecondary}>
          Bienvenido a BIBING. Muy pronto verás aquí lo más destacado de tu ciudad.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: TabBarHeight + Spacing.five,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
});
