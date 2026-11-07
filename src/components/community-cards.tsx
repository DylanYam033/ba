import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { mediaSource } from '@/lib/api';
import { compactNumber } from '@/lib/format';
import type { Community, CommunityRef } from '@/lib/types';

import { Icon } from './icon';
import { AppText } from './ui';

const openCommunity = (id: string) => router.push({ pathname: '/community/[id]', params: { id } });

/** Initials of the first two words: "Runners de Cali" → "RD". */
function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
}

/** Rounded-square picture; without one, the brand gradient with the community's initials. */
export function CommunityAvatar({ community, size = 56 }: { community: CommunityRef; size?: number }) {
  const { colors } = useAppTheme();
  const radius = Math.round(size * 0.22);
  if (community.avatarUrl) {
    return (
      <Image
        source={mediaSource(community.avatarUrl)}
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: colors.surfaceHighest }}
        contentFit="cover"
      />
    );
  }
  return (
    <LinearGradient
      colors={[colors.brandStart, colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: radius, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: Fonts.headline, fontSize: size * 0.34, color: '#fff' }}>{initials(community.name)}</Text>
    </LinearGradient>
  );
}

/** Home grid item ("Tus comunidades"): picture + name, two lines max. */
export function CommunityTile({ community, width }: { community: Community; width: number }) {
  return (
    <Pressable
      onPress={() => openCommunity(community.id)}
      accessibilityRole="button"
      accessibilityLabel={community.name}
      style={({ pressed }) => [styles.tile, { width, opacity: pressed ? 0.8 : 1 }]}>
      <CommunityAvatar community={community} size={56} />
      <AppText variant="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
        {community.name}
      </AppText>
    </Pressable>
  );
}

/** List row (discover, profile): picture, name, members count. */
export function CommunityRow({ community }: { community: Community }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={() => openCommunity(community.id)}
      style={({ pressed }) => [styles.row, { backgroundColor: colors.surfaceContainer, opacity: pressed ? 0.85 : 1 }]}>
      <CommunityAvatar community={community} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {community.name}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {compactNumber(community.membersCount)} {community.membersCount === 1 ? 'miembro' : 'miembros'}
          {community.description ? ` · ${community.description}` : ''}
        </AppText>
      </View>
      <Icon name="chevronRight" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three, borderRadius: Radius.md },
});
