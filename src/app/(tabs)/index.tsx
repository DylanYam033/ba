import { StyleSheet, View } from 'react-native';

import { TopBar } from '@/components/top-bar';
import { AppText } from '@/components/ui';
import { MaxContentWidth, Spacing, TabBarHeight } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';

/** Landing tab. Basic for now: greeting + welcome; highlights will live here later. */
export default function Home() {
  const { colors } = useAppTheme();
  const user = useCurrentUser();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar />
      <View style={styles.content}>
        <AppText variant="display">Hola, {user.username}</AppText>
        <AppText variant="body" color={colors.textSecondary}>
          Bienvenido a BIBING. Muy pronto verás aquí lo más destacado de tu ciudad.
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    paddingBottom: TabBarHeight + Spacing.five,
    gap: Spacing.two,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
