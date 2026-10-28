import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { FeaturedEventCard, RowEventCard } from '@/components/event-cards';
import { TopBar } from '@/components/top-bar';
import { AppText, EmptyState, ErrorState, glow, LoadingState } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, TabBarHeight } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { usersApi } from '@/lib/endpoints';

type Tab = 'going' | 'saved' | 'past';

const TABS: { key: Tab; label: string }[] = [
  { key: 'going', label: 'Voy' },
  { key: 'saved', label: 'Guardados' },
  { key: 'past', label: 'Pasados' },
];

const EMPTY: Record<Tab, { title: string; message: string }> = {
  going: { title: 'Sin planes todavía', message: 'Marca “Voy” en un evento y aparecerá aquí.' },
  saved: { title: 'Nada guardado aún', message: 'Explora eventos y guarda los que vayan con tu vibra.' },
  past: { title: 'Sin historial', message: 'Los eventos a los que asistas quedarán registrados aquí.' },
};

export default function MyEvents() {
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<Tab>('going');
  const events = useQuery(() => usersApi.myEvents(tab), [tab]);
  const list = events.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={events.refreshing} onRefresh={events.refresh} tintColor={colors.secondary} />}>
        <View style={{ gap: Spacing.one }}>
          <AppText variant="display">Mis eventos</AppText>
          <AppText variant="body" color={colors.textSecondary}>
            Tu pulso curado de la ciudad.
          </AppText>
        </View>

        <View style={[styles.segment, { backgroundColor: colors.surfaceLow }]}>
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Pressable
                key={t.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setTab(t.key)}
                style={[styles.segmentItem, active && [{ backgroundColor: colors.primaryContainer }, glow(colors.primary, 0.3)]]}>
                <AppText variant="label" color={active ? colors.onPrimaryContainer : colors.textSecondary} style={{ fontSize: 12 }}>
                  {t.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {events.loading ? (
          <LoadingState />
        ) : events.error ? (
          <ErrorState error={events.error} onRetry={events.refresh} />
        ) : list.length === 0 ? (
          <EmptyState icon={tab === 'saved' ? 'bookmark' : 'events'} {...EMPTY[tab]} action="Explorar" onAction={() => router.navigate('/explore')} />
        ) : (
          <View style={{ gap: Spacing.four - 4 }}>
            {/* First upcoming event gets the featured slate, as in the prototype. */}
            {tab !== 'past' && <FeaturedEventCard event={list[0]} />}
            {(tab === 'past' ? list : list.slice(1)).map((e) => (
              <RowEventCard key={e.id} event={e} dimmed={tab === 'past'} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: TabBarHeight + Spacing.five,
    gap: Spacing.five,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  segment: { flexDirection: 'row', padding: 4, borderRadius: Radius.full },
  segmentItem: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.full },
});
