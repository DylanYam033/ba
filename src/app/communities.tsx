import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CommunityRow } from '@/components/community-cards';
import { BackButton, TopBar } from '@/components/top-bar';
import { EmptyState, ErrorState, GradientButton, LoadingState, SearchField } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useQuery } from '@/hooks/use-query';
import { communitiesApi } from '@/lib/endpoints';

/** Discover communities by name (biggest first) and jump into creating one. */
export default function Communities() {
  const { colors } = useAppTheme();
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim());
  const list = useQuery(() => communitiesApi.list(q), [q]);
  const rows = list.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Comunidades" left={<BackButton />} right={<View />} />
      <View style={styles.header}>
        <SearchField value={search} onChangeText={setSearch} placeholder="Buscar comunidades..." />
      </View>
      {list.loading ? (
        <LoadingState />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.refresh} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} tintColor={colors.secondary} />}>
          {rows.length === 0 ? (
            <EmptyState
              icon="community"
              title={q ? 'Sin resultados' : 'Aún no hay comunidades'}
              message={q ? `Ninguna comunidad se llama “${q}”. ¿Por qué no la creas tú?` : 'Sé el primero en crear una.'}
              action="Crear comunidad"
              onAction={() => router.push('/community/new')}
            />
          ) : (
            rows.map((c) => <CommunityRow key={c.id} community={c} />)
          )}
          {rows.length > 0 && (
            <GradientButton title="Crear una comunidad" icon="add" onPress={() => router.push('/community/new')} style={{ marginTop: Spacing.three }} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.four, paddingTop: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  content: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
});
