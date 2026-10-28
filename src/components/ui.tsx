import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';

import { Icon, type IconName } from './icon';

// ─── Typography ───────────────────────────────────────────────────────────────

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'label' | 'caption';

const variantStyle = StyleSheet.create({
  display: { fontFamily: Fonts.headlineBlack, fontSize: 36, lineHeight: 40, letterSpacing: -1 },
  title: { fontFamily: Fonts.headline, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  heading: { fontFamily: Fonts.headline, fontSize: 20, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: Fonts.body, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: Fonts.bodyBold, fontSize: 15, lineHeight: 22 },
  // Ticket-style metadata: uppercase with wide tracking.
  label: { fontFamily: Fonts.bodyExtraBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase' },
  caption: { fontFamily: Fonts.body, fontSize: 13, lineHeight: 18 },
});

export function AppText({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  const { colors } = useAppTheme();
  const fallback = variant === 'caption' || variant === 'label' ? colors.textSecondary : colors.text;
  return <Text style={[variantStyle[variant], { color: color ?? fallback }, style]} {...rest} />;
}

/** "BIBING" wordmark with the brand gradient. */
export function BrandMark({ size = 24 }: { size?: number }) {
  const { colors } = useAppTheme();
  // Gradient text needs masked views; a two-tone wordmark keeps it dependency-free.
  return (
    <Text style={{ fontFamily: Fonts.headlineBlack, fontSize: size, letterSpacing: -0.8 }}>
      <Text style={{ color: colors.brandStart }}>BIB</Text>
      <Text style={{ color: colors.brandEnd }}>ING</Text>
    </Text>
  );
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title: string;
  icon?: IconName;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Primary CTA: primary → secondary neon gradient with an outer glow. */
export function GradientButton({ title, icon, loading, disabled, style, ...rest }: ButtonProps) {
  const { colors } = useAppTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      style={({ pressed }) => [
        styles.buttonShell,
        glow(colors.primary, 0.35),
        { opacity: inactive ? 0.6 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
        style,
      ]}
      {...rest}>
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.buttonFill}>
        {loading ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <>
            {icon && <Icon name={icon} size={20} color={colors.onPrimary} />}
            <Text style={[styles.buttonText, { color: colors.onPrimary }]}>{title}</Text>
          </>
        )}
      </LinearGradient>
    </Pressable>
  );
}

export function GhostButton({ title, icon, loading, disabled, style, ...rest }: ButtonProps) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.buttonShell,
        styles.buttonFill,
        { backgroundColor: colors.surfaceHighest, opacity: pressed ? 0.8 : disabled ? 0.5 : 1 },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={colors.text} />
      ) : (
        <>
          {icon && <Icon name={icon} size={20} color={colors.secondary} />}
          <Text style={[styles.buttonText, { color: colors.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  color,
  label,
  active,
  size = 44,
}: {
  icon: IconName;
  onPress?: () => void;
  color?: string;
  label: string;
  active?: boolean;
  size?: number;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          backgroundColor: active ? colors.primaryContainer : colors.surfaceHighest,
          opacity: pressed ? 0.75 : 1,
        },
      ]}>
      <Icon name={icon} size={size * 0.48} color={color ?? (active ? colors.onPrimaryContainer : colors.text)} />
    </Pressable>
  );
}

// ─── Inputs ───────────────────────────────────────────────────────────────────

interface FieldProps extends TextInputProps {
  label: string;
  error?: string | null;
  right?: ReactNode;
}

/** Filled field whose bottom edge lights up with the neon gradient on focus. */
export function TextField({ label, error, right, style, ...rest }: FieldProps) {
  const { colors } = useAppTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: Spacing.two }}>
      <AppText variant="label" style={{ paddingHorizontal: Spacing.one }}>
        {label}
      </AppText>
      <View style={[styles.field, { backgroundColor: colors.surfaceHighest }]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.primary}
          style={[styles.input, { color: colors.text }, Platform.OS === 'web' && styles.webInput, style]}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />
        {right}
        {focused && (
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.focusLine}
          />
        )}
      </View>
      {error ? (
        <AppText variant="caption" color={colors.error} style={{ paddingHorizontal: Spacing.one }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

// ─── Chips & badges ───────────────────────────────────────────────────────────

export function Chip({
  label,
  icon,
  iconColor,
  active,
  onPress,
}: {
  label: string;
  icon?: IconName;
  iconColor?: string;
  active?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: active ? colors.primary : colors.glass, opacity: pressed ? 0.8 : 1 },
        active && glow(colors.primary, 0.4),
      ]}>
      {icon && <Icon name={icon} size={16} color={active ? colors.onPrimary : (iconColor ?? colors.text)} />}
      <AppText variant="label" color={active ? colors.onPrimary : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function LiveBadge({ small }: { small?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.live, { backgroundColor: colors.live }, small && { paddingHorizontal: 6 }]}>
      <View style={styles.liveDot} />
      <Text style={styles.liveText}>EN VIVO</Text>
    </View>
  );
}

export function Pill({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useAppTheme();
  return <View style={[styles.pill, { backgroundColor: colors.overlay }, style]}>{children}</View>;
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

export function SectionHeader({
  eyebrow,
  title,
  eyebrowColor,
  action,
  onAction,
}: {
  eyebrow?: string;
  title: string;
  eyebrowColor?: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1 }}>
        {eyebrow && (
          <AppText variant="label" color={eyebrowColor ?? colors.tertiary}>
            {eyebrow}
          </AppText>
        )}
        <AppText variant="title">{title}</AppText>
      </View>
      {action && (
        <Pressable onPress={onAction} hitSlop={8}>
          <AppText variant="bodyStrong" color={colors.secondary}>
            {action}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  message: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceContainer }, glow(colors.primary, 0.15)]}>
        <Icon name={icon} size={48} color={colors.outline} />
      </View>
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="caption" style={{ textAlign: 'center', maxWidth: 260 }}>
        {message}
      </AppText>
      {action && <GradientButton title={action} onPress={onAction} style={{ marginTop: Spacing.three, alignSelf: 'stretch' }} />}
    </View>
  );
}

export function LoadingState() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <EmptyState
      icon="refresh"
      title="Algo salió mal"
      message={error.message}
      action={onRetry ? 'Reintentar' : undefined}
      onAction={onRetry}
    />
  );
}

/** Neon "light source" in place of a drop shadow. */
export function glow(color: string, opacity = 0.3, radius = 20): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0 0 ${radius}px ${hexToRgba(color, opacity)}` },
    android: { elevation: 0 },
    default: { shadowColor: color, shadowOpacity: opacity, shadowRadius: radius / 2, shadowOffset: { width: 0, height: 0 } },
  });
}

export function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/(.)/g, '$1$1') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const styles = StyleSheet.create({
  buttonShell: { borderRadius: Radius.full, minHeight: 56 },
  buttonFill: {
    flex: 1,
    minHeight: 56,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  buttonText: { fontFamily: Fonts.headline, fontSize: 16, letterSpacing: 0.4 },
  iconButton: { borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  field: { borderRadius: Radius.sm, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontFamily: Fonts.body, fontSize: 16, paddingHorizontal: 20, paddingVertical: 16 },
  webInput: { outlineStyle: 'none' } as object,
  focusLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  live: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  liveText: { color: '#fff', fontFamily: Fonts.bodyExtraBold, fontSize: 9, letterSpacing: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.full },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.three },
  empty: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.six, paddingHorizontal: Spacing.four },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.three },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.six },
});
