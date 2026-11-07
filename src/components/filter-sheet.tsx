import { BottomSheetModal, BottomSheetScrollView } from '@expo/ui/community/bottom-sheet';
import { Slider } from '@expo/ui/community/slider';
import { useImperativeHandle, useRef, useState, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { RADIUS_OPTIONS, type RadiusKm } from '@/ctx/preferences';
import { useAppTheme } from '@/ctx/theme';
import {
  ATTENDANCE_OPTIONS,
  DAY_PART_OPTIONS,
  DEFAULT_FILTERS,
  PRICE_OPTIONS,
  type EventFilters,
} from '@/lib/event-filters';
import { UPCOMING_DAYS, type When } from '@/lib/format';

import { Icon } from './icon';
import { AppText, Chip, GradientButton, IconButton } from './ui';

export interface FilterSheetState {
  radiusKm: RadiusKm;
  when: When;
  filters: EventFilters;
}

export interface FilterSheetHandle {
  /** Opens the sheet with a draft copy of the current state. */
  open: () => void;
}

const WHEN_OPTIONS: { value: When; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'tomorrow', label: 'Mañana' },
  { value: 'weekend', label: 'Fin de semana' },
  { value: 'upcoming', label: `Próximos ${UPCOMING_DAYS} días` },
];

const DEFAULT_RADIUS: RadiusKm = 25;

/**
 * Event filters (map + Explore) in a native modal bottom sheet. Edits a draft; nothing changes
 * until "Aplicar filtros", and closing without applying discards the draft.
 */
export function FilterSheet({
  ref,
  value,
  onApply,
}: {
  ref: Ref<FilterSheetHandle>;
  value: FilterSheetState;
  onApply: (next: FilterSheetState) => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheet = useRef<BottomSheetModal>(null);
  const [draft, setDraft] = useState(value);

  useImperativeHandle(ref, () => ({
    open: () => {
      setDraft(value);
      sheet.current?.present();
    },
  }));

  const setFilter = <K extends keyof EventFilters>(key: K, v: EventFilters[K]) =>
    setDraft((d) => ({ ...d, filters: { ...d.filters, [key]: v } }));
  const radiusIndex = Math.max(0, RADIUS_OPTIONS.indexOf(draft.radiusKm));

  return (
    <BottomSheetModal
      ref={sheet}
      snapPoints={['88%']}
      enablePanDownToClose
      backgroundStyle={{ backgroundColor: colors.surface }}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <AppText variant="heading">Filtros</AppText>
        <View style={[styles.headerSide, { alignItems: 'flex-end' }]}>
          <IconButton icon="close" label="Cerrar filtros" size={36} onPress={() => sheet.current?.dismiss()} />
        </View>
      </View>

      <BottomSheetScrollView contentContainerStyle={styles.body}>
        <Section
          title="Distancia"
          aside={
            <AppText variant="caption" color={colors.textSecondary}>
              Hasta {draft.radiusKm} km
            </AppText>
          }>
          <Slider
            value={radiusIndex}
            minimumValue={0}
            maximumValue={RADIUS_OPTIONS.length - 1}
            step={1}
            minimumTrackTintColor={colors.primary}
            maximumTrackTintColor={colors.surfaceHighest}
            thumbTintColor={colors.primary}
            accessibilityLabel="Distancia de búsqueda"
            onValueChange={(i) => setDraft((d) => ({ ...d, radiusKm: RADIUS_OPTIONS[Math.round(i)] }))}
          />
          <View style={styles.sliderLabels}>
            {RADIUS_OPTIONS.map((km) => (
              <AppText key={km} variant="caption" color={km === draft.radiusKm ? colors.text : colors.textMuted}>
                {km}
              </AppText>
            ))}
          </View>
        </Section>

        <Section title="Fecha">
          <ChipRow>
            {WHEN_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} active={draft.when === o.value} onPress={() => setDraft((d) => ({ ...d, when: o.value }))} />
            ))}
          </ChipRow>
        </Section>

        <Section title="Hora del día">
          <ChipRow>
            {DAY_PART_OPTIONS.map((o) => (
              <Chip
                key={o.value}
                label={o.label}
                icon={o.icon}
                active={draft.filters.dayPart === o.value}
                onPress={() => setFilter('dayPart', o.value)}
              />
            ))}
          </ChipRow>
        </Section>

        <Section title="Tamaño de la asistencia">
          <ChipRow>
            {ATTENDANCE_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} active={draft.filters.attendance === o.value} onPress={() => setFilter('attendance', o.value)} />
            ))}
          </ChipRow>
        </Section>

        <Section title="Precio" last>
          <ChipRow>
            {PRICE_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} active={draft.filters.price === o.value} onPress={() => setFilter('price', o.value)} />
            ))}
          </ChipRow>
        </Section>
      </BottomSheetScrollView>

      <View style={[styles.footer, { borderTopColor: colors.outlineVariant, paddingBottom: insets.bottom + Spacing.three }]}>
        <Pressable
          onPress={() => setDraft({ radiusKm: DEFAULT_RADIUS, when: 'today', filters: DEFAULT_FILTERS })}
          hitSlop={8}
          accessibilityRole="button">
          <AppText variant="bodyStrong" color={colors.textSecondary}>
            Limpiar todo
          </AppText>
        </Pressable>
        <GradientButton
          title="Aplicar filtros"
          style={{ flex: 1 }}
          onPress={() => {
            onApply(draft);
            sheet.current?.dismiss();
          }}
        />
      </View>
    </BottomSheetModal>
  );
}

/** Filter icon for the search pill; the badge counts filters moved off their default. */
export function FilterButton({ count, onPress }: { count: number; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Filtros, ${count} activos` : 'Filtros'}
      style={({ pressed }) => [styles.filterBtn, { opacity: pressed ? 0.7 : 1 }]}>
      <Icon name="filter" size={22} color={count > 0 ? colors.primary : colors.text} />
      {count > 0 && (
        <View style={[styles.filterBadge, { backgroundColor: colors.primaryDeep, borderColor: colors.surface }]}>
          <AppText variant="label" color={colors.onPrimary} style={{ fontSize: 9, lineHeight: 12 }}>
            {count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

function Section({ title, aside, last, children }: { title: string; aside?: ReactNode; last?: boolean; children: ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.section, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant }]}>
      <View style={styles.sectionTitle}>
        <AppText variant="heading" style={{ fontSize: 17 }}>
          {title}
        </AppText>
        {aside}
      </View>
      {children}
    </View>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  headerSide: { width: 48 },
  body: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  section: { paddingVertical: Spacing.four, gap: Spacing.three },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  filterBtn: { padding: 4 },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
