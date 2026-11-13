import { router, useLocalSearchParams } from 'expo-router';
import { useFormik } from 'formik';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoverPicker } from '@/components/cover-picker';
import { Icon } from '@/components/icon';
import { TimeField } from '@/components/time-field';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, Chip, ErrorState, glow, GradientButton, hexToRgba, LoadingState, Pill, TextField } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { useQuery } from '@/hooks/use-query';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import { eventsApi } from '@/lib/endpoints';
import {
  DURATIONS,
  EDIT_EVENT_SCHEMA,
  editEventForm,
  eventStart,
  nextDays,
  startChanged,
  type EditEventValues,
} from '@/lib/event-form';
import { canChangeTime, formatLongRange } from '@/lib/format';
import type { EventDetail } from '@/lib/types';

const HOUR_MS = 60 * 60 * 1000;

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const query = useQuery(() => eventsApi.get(id), [id]);

  // Keep the loaded copy: refetching on focus must not reset what the organizer is typing.
  const [event, setEvent] = useState<EventDetail>();
  if (!event && query.data) setEvent(query.data);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar left={<BackButton icon="close" />} />
      {!event ? (
        query.error ? <ErrorState error={query.error} onRetry={query.refresh} /> : <LoadingState />
      ) : event.organizerId !== user.id ? (
        <ErrorState error={new Error('Solo quien creó el evento puede editarlo.')} />
      ) : (
        <EditForm event={event} />
      )}
    </View>
  );
}

function EditForm({ event }: { event: EventDetail }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const initial = editEventForm(event);
  // Locked 15 min after the configured start, so a finished event can't be rescheduled.
  const timeEditable = canChangeTime(event);
  const days = nextDays(Math.max(14, initial.dayIndex + 1));
  // Keep the event's own duration selectable when it isn't one of the presets.
  const durations = DURATIONS.includes(initial.durationHours)
    ? DURATIONS
    : [...DURATIONS, initial.durationHours].sort((a, b) => a - b);

  const save = async (v: EditEventValues) => {
    setSubmitError(null);
    try {
      const timeChanged = startChanged(v) || v.durationHours !== initial.durationHours;
      const start = eventStart(v);
      await eventsApi.update(event.id, {
        title: v.title.trim(),
        description: v.description.trim(),
        category: v.category!,
        isFree: v.isFree,
        price: v.isFree ? null : Number(v.price),
        maxCapacity: v.capacity ? Number(v.capacity) : null,
        ...(timeEditable && timeChanged
          ? { startAt: start.toISOString(), endAt: new Date(start.getTime() + v.durationHours * HOUR_MS).toISOString() }
          : {}),
      });
      if (v.cover) {
        try {
          await eventsApi.uploadCover(event.id, v.cover);
        } catch {
          Alert.alert('Cambios guardados sin portada', 'No pudimos subir la nueva imagen de portada.');
        }
      }
      router.back();
    } catch (e) {
      setSubmitError((e as Error).message === 'The event time can no longer be changed' ? 'La hora ya no se puede cambiar.' : (e as Error).message);
    }
  };

  const form = useFormik<EditEventValues>({ initialValues: initial, validationSchema: EDIT_EVENT_SCHEMA, onSubmit: save });
  const { values, setFieldValue } = form;
  const errorOf = (field: keyof EditEventValues) => (form.touched[field] ? (form.errors[field] as string | undefined) : undefined);
  const textProps = (field: 'title' | 'description' | 'price' | 'capacity') => ({
    value: values[field],
    onChangeText: form.handleChange(field),
    onBlur: form.handleBlur(field),
    error: errorOf(field),
  });

  return (
    <>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="display">Editar evento</AppText>

          <CoverPicker value={values.cover} currentUrl={event.coverUrl} onChange={(file) => setFieldValue('cover', file)} />
          <TextField label="Nombre del evento" maxLength={200} style={{ fontSize: 20 }} {...textProps('title')} />

          <View style={{ gap: Spacing.three }}>
            <AppText variant="label">Categoría</AppText>
            <View style={styles.categoryGrid}>
              {CATEGORY_KEYS.map((key) => {
                const meta = CATEGORIES[key];
                const active = values.category === key;
                return (
                  <Pressable key={key} onPress={() => setFieldValue('category', key)} style={[styles.category, { opacity: active ? 1 : 0.55 }]}>
                    <View
                      style={[
                        styles.categoryCircle,
                        active
                          ? [{ backgroundColor: hexToRgba(colors.primaryContainer, 0.25), borderColor: colors.primary }, glow(colors.primary, 0.45, 16)]
                          : { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
                      ]}>
                      <Icon name={meta.icon} size={28} color={active ? colors.primary : meta.color} />
                    </View>
                    <AppText variant="label" color={active ? colors.primary : colors.textSecondary} style={{ fontSize: 9, textAlign: 'center' }}>
                      {meta.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextField
            label="Descripción"
            multiline
            maxLength={2000}
            style={{ minHeight: 110, textAlignVertical: 'top' }}
            {...textProps('description')}
          />

          {/* Date & time */}
          <View style={{ gap: Spacing.three }}>
            <AppText variant="label">Fecha y hora</AppText>
            {timeEditable ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
                  {days.map((d, i) => (
                    <Chip key={i} label={d.label} active={i === values.dayIndex} onPress={() => setFieldValue('dayIndex', i)} />
                  ))}
                </ScrollView>
                <View style={styles.twoCols}>
                  <View style={{ flex: 1 }}>
                    <TimeField
                      label="Hora de inicio"
                      value={values.time}
                      onChange={(t) => {
                        setFieldValue('time', t);
                        form.setFieldTouched('time', true, false);
                      }}
                      error={errorOf('time')}
                    />
                  </View>
                  <View style={{ flex: 1, gap: Spacing.two }}>
                    <AppText variant="label" style={{ paddingHorizontal: Spacing.one }}>Duración</AppText>
                    <View style={styles.durations}>
                      {durations.map((h) => (
                        <Pressable
                          key={h}
                          onPress={() => setFieldValue('durationHours', h)}
                          style={[styles.duration, { backgroundColor: values.durationHours === h ? colors.primaryContainer : colors.surfaceHighest }]}>
                          <AppText variant="label" color={values.durationHours === h ? colors.onPrimaryContainer : colors.text}>
                            {h}h
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>
                <AppText variant="caption">Puedes cambiar la hora hasta 15 minutos después del inicio programado.</AppText>
              </>
            ) : (
              <>
                <Pill style={{ alignSelf: 'flex-start' }}>
                  <Icon name="calendar" size={14} color={colors.secondary} />
                  <AppText variant="caption" color={colors.text}>
                    {formatLongRange(event.startAt, event.endAt)}
                  </AppText>
                </Pill>
                <AppText variant="caption">La hora ya no se puede cambiar: pasaron más de 15 minutos desde el inicio programado.</AppText>
              </>
            )}
          </View>

          <View style={[styles.toggleRow, { backgroundColor: colors.surfaceContainer }]}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Entrada gratuita</AppText>
              <AppText variant="caption">Desactívalo para fijar un precio (COP).</AppText>
            </View>
            <Switch
              value={values.isFree}
              onValueChange={(v) => {
                setFieldValue('isFree', v);
              }}
              trackColor={{ true: colors.primaryContainer, false: colors.surfaceHighest }}
              thumbColor={values.isFree ? colors.primary : colors.outline}
            />
          </View>
          {!values.isFree && <TextField label="Precio (COP)" keyboardType="numeric" placeholder="25000" {...textProps('price')} />}
          <TextField label="Cupo máximo (opcional)" keyboardType="numeric" placeholder="Sin límite" {...textProps('capacity')} />

          {submitError && (
            <AppText variant="caption" color={colors.error} style={{ paddingHorizontal: Spacing.one }}>
              {submitError}
            </AppText>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three, backgroundColor: colors.overlay }]}>
        <GradientButton title="Guardar cambios" icon="check" loading={form.isSubmitting} onPress={() => form.handleSubmit()} style={{ flex: 1 }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingBottom: 140, gap: Spacing.five, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  category: { width: '25%', alignItems: 'center', gap: Spacing.two },
  categoryCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  twoCols: { flexDirection: 'row', gap: Spacing.three },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  duration: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.full },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.three },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
});
