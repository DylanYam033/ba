import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';

import { BackButton } from './top-bar';
import { AppText, BrandMark, hexToRgba } from './ui';

/** Nebula background + glass card shared by sign-in and sign-up. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={[hexToRgba(colors.primaryContainer, 0.22), 'transparent', hexToRgba(colors.secondary, 0.12)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.five }]}>
          <View style={styles.header}>
            <BackButton />
            <BrandMark size={28} />
            <View style={{ width: 40 }} />
          </View>
          <View style={[styles.card, { backgroundColor: hexToRgba(colors.surfaceContainer, 0.7) }]}>
            <View style={{ gap: Spacing.two, alignItems: 'center' }}>
              <AppText variant="title" style={{ fontSize: 32, lineHeight: 36, textAlign: 'center' }}>
                {title}
              </AppText>
              <AppText variant="body" color={colors.textSecondary} style={{ textAlign: 'center', fontSize: 17 }}>
                {subtitle}
              </AppText>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, paddingHorizontal: Spacing.three, gap: Spacing.five, width: '100%', maxWidth: 480, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { borderRadius: Radius.lg, padding: Spacing.five - 4, gap: Spacing.four },
});
