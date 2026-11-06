import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { CommunityAvatar } from '@/components/community-cards';
import { Avatar } from '@/components/event-cards';
import { Icon } from '@/components/icon';
import { OrganizedEvents } from '@/components/organized-events';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, ErrorState, GhostButton, GradientButton, LoadingState, Pill, SectionHeader } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { CATEGORIES } from '@/lib/categories';
import { communitiesApi } from '@/lib/endpoints';
import { compactNumber } from '@/lib/format';
import { pickImage } from '@/lib/pick-image';

const MEMBER_PREVIEW = 12;

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useQuery(async () => {
    const [community, events, members] = await Promise.all([
      communitiesApi.get(id),
      communitiesApi.events(id),
      communitiesApi.members(id),
    ]);
    return { community, events, members };
  }, [id]);

  if (query.loading) return <Shell><LoadingState /></Shell>;
  if (query.error || !query.data) {
    return <Shell><ErrorState error={query.error ?? new Error('Comunidad no encontrada')} onRetry={query.refresh} /></Shell>;
  }

  const { community, events, members } = query.data;
  const category = community.category ? CATEGORIES[community.category] : null;

  const toggleMembership = async () => {
    const joined = community.isMember;
    // Optimistic: flip the button and the counter, roll back on failure.
    const patch = (isMember: boolean, delta: number) =>
      query.setData((d) => d && { ...d, community: { ...d.community, isMember, membersCount: d.community.membersCount + delta } });
    setBusy(true);
    setActionError(null);
    patch(!joined, joined ? -1 : 1);
    try {
      await (joined ? communitiesApi.leave(id) : communitiesApi.join(id));
      query.refresh();
    } catch (e) {
      patch(joined, joined ? 1 : -1);
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const changePicture = async () => {
    const file = await pickImage({ square: true, quality: 0.7 });
    if (!file) return;
    setUploading(true);
    setActionError(null);
    try {
      const updated = await communitiesApi.uploadAvatar(id, file);
      query.setData((d) => d && { ...d, community: { ...d.community, avatarUrl: updated.avatarUrl } });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Shell>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={query.refreshing} onRefresh={query.refresh} tintColor={colors.secondary} />}>
        <View style={styles.hero}>
          <Pressable
            onPress={community.isOwner ? changePicture : undefined}
            disabled={!community.isOwner || uploading}
            accessibilityRole={community.isOwner ? 'button' : 'image'}
            accessibilityLabel={community.isOwner ? 'Cambiar foto de la comunidad' : community.name}>
            <CommunityAvatar community={community} size={104} />
            {uploading && (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            )}
            {community.isOwner && (
              <View style={[styles.cameraBadge, { backgroundColor: colors.primaryDeep, borderColor: colors.background }]}>
                <Icon name="camera" size={14} color={colors.onPrimary} />
              </View>
            )}
          </Pressable>
          <AppText variant="title" style={{ textAlign: 'center' }}>
            {community.name}
          </AppText>
          <View style={styles.metaRow}>
            <AppText variant="body" color={colors.textSecondary}>
              {compactNumber(community.membersCount)} {community.membersCount === 1 ? 'miembro' : 'miembros'} · Creada por{' '}
            </AppText>
            <Pressable onPress={() => router.push({ pathname: '/user/[id]', params: { id: community.owner.id } })} hitSlop={6}>
              <AppText variant="bodyStrong" color={colors.primary}>
                @{community.owner.username}
              </AppText>
            </Pressable>
          </View>
          {category && (
            <Pill>
              <Icon name={category.icon} size={14} color={category.color} />
              <AppText variant="caption" color={colors.text}>
                {category.label}
              </AppText>
            </Pill>
          )}
          {community.description ? (
            <AppText variant="body" color={colors.textSecondary} style={{ textAlign: 'center' }}>
              {community.description}
            </AppText>
          ) : null}
        </View>

        {community.isOwner ? (
          <GradientButton
            title="Crear evento de la comunidad"
            icon="add"
            onPress={() => router.push({ pathname: '/create-event', params: { communityId: community.id } })}
          />
        ) : community.isMember ? (
          <GhostButton title="Eres miembro · Salir" icon="check" loading={busy} onPress={toggleMembership} />
        ) : (
          <GradientButton title="Unirme" icon="personAdd" loading={busy} onPress={toggleMembership} />
        )}
        {actionError && (
          <AppText variant="caption" color={colors.error}>
            {actionError}
          </AppText>
        )}

        <View style={{ gap: Spacing.three }}>
          <SectionHeader title="Miembros" eyebrow={compactNumber(members.meta.total)} eyebrowColor={colors.primary} />
          <View style={styles.members}>
            {members.data.slice(0, MEMBER_PREVIEW).map((m) => (
              <Pressable
                key={m.id}
                onPress={() => router.push({ pathname: '/user/[id]', params: { id: m.id } })}
                accessibilityLabel={`@${m.username}`}>
                <Avatar uri={m.avatarUrl} name={m.username} size={40} />
              </Pressable>
            ))}
            {members.meta.total > MEMBER_PREVIEW && (
              <View style={[styles.more, { backgroundColor: colors.surfaceHighest }]}>
                <AppText variant="label">+{compactNumber(members.meta.total - MEMBER_PREVIEW)}</AppText>
              </View>
            )}
          </View>
        </View>

        <View style={{ gap: Spacing.three }}>
          <SectionHeader title="Eventos de la comunidad" />
          <OrganizedEvents
            events={events}
            emptyTitle="Sin eventos todavía"
            emptyMessage={
              community.isOwner
                ? 'Publica el primer evento de tu comunidad y les llegará a todos sus miembros en Inicio.'
                : 'Cuando la comunidad publique eventos, aparecerán aquí y en tu Inicio.'
            }
          />
        </View>
      </ScrollView>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar left={<BackButton />} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.five, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: Spacing.three },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  avatarOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  cameraBadge: { position: 'absolute', right: -6, bottom: -6, width: 30, height: 30, borderRadius: 15, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  more: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
