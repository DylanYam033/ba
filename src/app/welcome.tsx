import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type ScrollViewInstance,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { AppText, BrandMark, glow, GradientButton, hexToRgba } from '@/components/ui';
import { Fonts, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { CATEGORIES } from '@/lib/categories';

const SLIDES = [
  {
    title: ['Descubre eventos ', 'cerca de ti', ' en tiempo real'],
    body: 'Explora el pulso de tu ciudad con un mapa interactivo en vivo.',
    art: 'map' as const,
  },
  {
    title: ['Nunca te pierdas lo que ', 'está pasando', ' a tu alrededor'],
    body: 'Recibe alertas de conciertos, fiestas en terrazas y planes de último minuto.',
    art: 'live' as const,
  },
  {
    title: ['Comparte momentos, ', 'conecta', ' con personas'],
    body: 'Únete a la comunidad y mira quién va antes de llegar.',
    art: 'social' as const,
  },
];

export default function Welcome() {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollViewInstance>(null);
  const [page, setPage] = useState(0);
  const slideWidth = Math.min(width, MaxContentWidth);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / slideWidth));

  const next = () => {
    if (page < SLIDES.length - 1) scroller.current?.scrollTo({ x: (page + 1) * slideWidth, animated: true });
    else router.push('/sign-up');
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.brand, { paddingTop: insets.top + Spacing.three }]}>
        <BrandMark size={22} />
      </View>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        onScroll={onScroll}
        scrollEventThrottle={32}
        style={{ alignSelf: 'center', width: slideWidth }}>
        {SLIDES.map((s, i) => (
          <View key={i} style={[styles.slide, { width: slideWidth }]}>
            <View style={styles.art}>
              <SlideArt kind={s.art} />
            </View>
            <View style={styles.copy}>
              <Text style={[styles.title, { color: colors.text }]}>
                {s.title[0]}
                <Text style={{ color: i === 1 ? colors.tertiary : colors.primary }}>{s.title[1]}</Text>
                {s.title[2]}
              </Text>
              <AppText variant="body" color={colors.textSecondary} style={{ fontSize: 17, lineHeight: 25 }}>
                {s.body}
              </AppText>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.four, backgroundColor: colors.glass }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === page
                  ? [{ width: 24, backgroundColor: colors.primary }, glow(colors.primary, 0.8, 8)]
                  : { backgroundColor: colors.surfaceHighest },
              ]}
            />
          ))}
        </View>
        <GradientButton title={page === SLIDES.length - 1 ? 'Comenzar' : 'Siguiente'} onPress={next} />
        <Pressable onPress={() => router.push('/sign-in')} hitSlop={8} style={{ alignSelf: 'center' }}>
          <AppText variant="label">
            ¿Ya tienes cuenta? <AppText variant="label" color={colors.secondary}>Inicia sesión</AppText>
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

/** Illustrations built from the design tokens instead of stock photos. */
function SlideArt({ kind }: { kind: 'map' | 'live' | 'social' }) {
  const { colors } = useAppTheme();

  if (kind === 'map') {
    const pins = [
      { top: '18%', left: '20%', c: CATEGORIES.nightlife, n: 542 },
      { top: '42%', left: '62%', c: CATEGORIES.music, n: 128 },
      { top: '64%', left: '30%', c: CATEGORIES.food, n: 64 },
    ] as const;
    return (
      <LinearGradient colors={[hexToRgba(colors.primaryContainer, 0.25), colors.background]} style={styles.artFill}>
        {[...Array(6)].map((_, i) => (
          <View key={i} style={[styles.gridLine, { top: `${15 + i * 15}%`, backgroundColor: hexToRgba(colors.secondary, 0.08) }]} />
        ))}
        {pins.map((p, i) => (
          <View key={i} style={[styles.pinWrap, { top: p.top, left: p.left }]}>
            <View style={[styles.pin, { backgroundColor: p.c.color }, glow(p.c.color, 0.8, 24)]}>
              <Icon name={p.c.icon} size={22} color="#fff" />
            </View>
            <View style={[styles.pinCount, { backgroundColor: colors.primary }]}>
              <AppText variant="label" color={colors.onPrimary} style={{ fontSize: 10 }}>
                {p.n} van
              </AppText>
            </View>
          </View>
        ))}
      </LinearGradient>
    );
  }

  if (kind === 'live') {
    return (
      <LinearGradient
        colors={[hexToRgba(colors.tertiary, 0.3), hexToRgba(colors.primaryContainer, 0.2), colors.background]}
        style={[styles.artFill, { alignItems: 'center', justifyContent: 'center' }]}>
        {[220, 160, 100].map((size, i) => (
          <View
            key={size}
            style={[
              styles.ring,
              { width: size, height: size, borderRadius: size / 2, borderColor: hexToRgba(colors.live, 0.25 + i * 0.25) },
            ]}
          />
        ))}
        <View style={[styles.liveCore, { backgroundColor: colors.live }, glow(colors.live, 0.9, 32)]}>
          <Text style={{ fontSize: 34 }}>🎵</Text>
        </View>
      </LinearGradient>
    );
  }

  const tiles = ['🪩', '🎨', '🍕', '⚽'];
  return (
    <View style={[styles.artFill, styles.bento]}>
      {tiles.map((emoji, i) => (
        <LinearGradient
          key={emoji}
          colors={[hexToRgba(i % 2 ? colors.secondary : colors.primary, 0.35), colors.surfaceContainer]}
          style={[styles.tile, { height: i === 1 ? 180 : 130 }]}>
          <Text style={{ fontSize: 44 }}>{emoji}</Text>
        </LinearGradient>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  brand: { alignItems: 'center', paddingBottom: Spacing.two },
  slide: { flex: 1 },
  art: { flex: 1, minHeight: 260 },
  artFill: { flex: 1, overflow: 'hidden' },
  copy: { paddingHorizontal: Spacing.five, paddingBottom: 220, gap: Spacing.three },
  title: { fontFamily: Fonts.headlineBlack, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.four,
    gap: Spacing.four,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  dots: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'center' },
  dot: { height: 6, width: 6, borderRadius: 3 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1 },
  pinWrap: { position: 'absolute', alignItems: 'center' },
  pin: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  pinCount: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  ring: { position: 'absolute', borderWidth: 2 },
  liveCore: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  bento: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, padding: Spacing.five, alignContent: 'center' },
  tile: { width: '46%', borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
