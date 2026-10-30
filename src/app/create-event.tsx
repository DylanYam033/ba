import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFormik } from 'formik';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { EventMap } from '@/components/map/event-map';
import { TimeField } from '@/components/time-field';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, Chip, glow, GradientButton, hexToRgba, Pill, TextField } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { FALLBACK_COORDS, useUserLocation } from '@/hooks/use-user-location';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import { eventsApi } from '@/lib/endpoints';
import {
  EVENT_STEP_FIELDS,
  EVENT_STEP_SCHEMAS,
  eventStart,
  initialEventForm,
  type EventFormValues,
} from '@/lib/event-form';

const STEPS = ['Detalles', 'Ubicación', 'Fecha y entradas'] as const;
const DURATIONS = [2, 3, 4, 6, 8];

function nextDays(count: number) {
  return [...Array(count)].map((_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + i);
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
    return { date: d, label };
  });
}

export default function CreateEvent() {
  const { colors } = useAppTheme();
  const user = useCurrentUser();
  const insets = useSafeAreaInsets();
  const { coords, locate } = useUserLocation();
  const days = nextDays(14);
  const [step, setStep] = useState(0);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const publish = async (v: EventFormValues) => {
    setSubmitError(null);
    try {
      const start = eventStart(v);
      const end = new Date(start.getTime() + v.durationHours * 60 * 60 * 1000);
      const created = await eventsApi.create({
        title: v.title.trim(),
        description: v.description.trim() || undefined,
        category: v.category!,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        organizerType: user.accountType === 'business' ? 'business' : 'user',
        isFree: v.isFree,
        price: v.isFree ? undefined : Number(v.price),
        currency: v.isFree ? undefined : 'COP',
        maxCapacity: v.capacity ? Number(v.capacity) : undefined,
        tags: v.tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
        location: {
          name: v.venueName.trim(),
          address: v.venueAddress.trim() || undefined,
          city: v.venueCity.trim() || undefined,
          latitude: v.picked!.lat,
          longitude: v.picked!.lng,
        },
      });
      // The API creates events as drafts; publish so they show on the map and feeds.
      await eventsApi.update(created.id, { status: 'published' });
      router.replace({ pathname: '/event/[id]', params: { id: created.id } });
    } catch (e) {
      setSubmitError((e as Error).message);
    }
  };

  const form = useFormik<EventFormValues>({
    initialValues: initialEventForm(),
    // Only the current step's fields are validated; earlier steps already passed.
    validationSchema: EVENT_STEP_SCHEMAS[step],
    onSubmit: publish,
  });
  const { values, setFieldValue } = form;
  /** A field's error, shown once the user left it or tried to continue. */
  const errorOf = (field: keyof EventFormValues) => (form.touched[field] ? (form.errors[field] as string | undefined) : undefined);
  const textProps = (field: 'title' | 'description' | 'venueName' | 'venueAddress' | 'venueCity' | 'price' | 'capacity' | 'tags') => ({
    value: values[field],
    onChangeText: form.handleChange(field),
    onBlur: form.handleBlur(field),
    error: errorOf(field),
  });

  const mapCenter = values.picked ?? coords ?? FALLBACK_COORDS;

  const next = async () => {
    const fields = EVENT_STEP_FIELDS[step];
    await form.setTouched({ ...form.touched, ...Object.fromEntries(fields.map((f) => [f, true])) }, false);
    const errors = await form.validateForm();
    if (fields.some((f) => errors[f])) return;
    if (step < STEPS.length - 1) setStep(step + 1);
    else await form.submitForm();
  };

  const back = () => (step > 0 ? (setSubmitError(null), setStep(step - 1)) : router.back());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar left={<BackButton icon="close" />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={{ gap: Spacing.two }}>
            <View style={styles.between}>
              <AppText variant="label" color={colors.primary}>
                Paso {String(step + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </AppText>
              <AppText variant="label">{STEPS[step]}</AppText>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceHighest }]}>
              <LinearGradient
                colors={[colors.primary, colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progress, { width: `${((step + 1) / STEPS.length) * 100}%` }, glow(colors.primary, 0.6, 12)]}
              />
            </View>
          </View>

          {step === 0 && (
            <>
              <TextField
                label="Nombre del evento"
                placeholder="Midnight Rooftop Sessions"
                maxLength={200}
                style={{ fontSize: 20 }}
                {...textProps('title')}
              />
              <View style={{ gap: Spacing.three }}>
                <AppText variant="label">Categoría</AppText>
                <View style={styles.categoryGrid}>
                  {CATEGORY_KEYS.map((key) => {
                    const meta = CATEGORIES[key];
                    const active = values.category === key;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => setFieldValue('category', key)}
                        style={[styles.category, { opacity: !values.category || active ? 1 : 0.55 }]}>
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
                <FieldError message={errorOf('category')} />
              </View>
              <TextField
                label="Descripción"
                placeholder="¿Qué va a pasar? Line-up, dress code, sorpresas…"
                multiline
                maxLength={2000}
                style={{ minHeight: 110, textAlignVertical: 'top' }}
                {...textProps('description')}
              />
            </>
          )}

          {step === 1 && (
            <>
              <View style={{ gap: Spacing.three }}>
                <View style={styles.between}>
                  <AppText variant="label">Ubicación</AppText>
                  <AppText variant="label" color={colors.secondary}>Toca para fijar el pin</AppText>
                </View>
                <View style={styles.mapBox}>
                  <EventMap center={mapCenter} onPick={(c) => setFieldValue('picked', c)} picked={values.picked} radiusKm={3} />
                  <Pressable
                    onPress={async () => setFieldValue('picked', await locate())}
                    style={[styles.useLocation, { backgroundColor: colors.glass }]}>
                    <Icon name="nearMe" size={18} color={colors.secondary} />
                    <AppText variant="caption" color={colors.text}>
                      {values.picked ? `${values.picked.lat.toFixed(4)}, ${values.picked.lng.toFixed(4)}` : 'Usar mi ubicación'}
                    </AppText>
                  </Pressable>
                </View>
                <FieldError message={errorOf('picked')} />
              </View>
              <TextField label="Nombre del lugar" placeholder="The Quantum Lounge" {...textProps('venueName')} />
              <TextField label="Dirección" placeholder="Cra 13 #85-24" {...textProps('venueAddress')} />
              <TextField label="Ciudad" placeholder="Bogotá" {...textProps('venueCity')} />
            </>
          )}

          {step === 2 && (
            <>
              <View style={{ gap: Spacing.three }}>
                <AppText variant="label">Fecha</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
                  {days.map((d, i) => (
                    <Chip key={i} label={d.label} active={i === values.dayIndex} onPress={() => setFieldValue('dayIndex', i)} />
                  ))}
                </ScrollView>
              </View>
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
                    {DURATIONS.map((h) => (
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
              <TextField label="Etiquetas (separadas por coma)" autoCapitalize="none" placeholder="techno, rooftop" {...textProps('tags')} />
              <Pill style={{ alignSelf: 'flex-start' }}>
                <Icon name="calendar" size={14} color={colors.secondary} />
                <AppText variant="caption" color={colors.text}>
                  {days[values.dayIndex].label} ·{' '}
                  {values.time.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })} – {values.durationHours} h
                </AppText>
              </Pill>
            </>
          )}

          <FieldError message={submitError} />
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three, backgroundColor: colors.overlay }]}>
        {step > 0 && (
          <Pressable onPress={back} style={[styles.backStep, { backgroundColor: colors.surfaceHighest }]} accessibilityLabel="Paso anterior">
            <Icon name="back" color={colors.text} />
          </Pressable>
        )}
        <GradientButton
          title={step === STEPS.length - 1 ? 'Publicar evento' : 'Siguiente'}
          icon={step === STEPS.length - 1 ? 'check' : 'forward'}
          loading={form.isSubmitting}
          onPress={next}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function FieldError({ message }: { message?: string | null }) {
  const { colors } = useAppTheme();
  if (!message) return null;
  return (
    <AppText variant="caption" color={colors.error} style={{ paddingHorizontal: Spacing.one }}>
      {message}
    </AppText>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingBottom: 140, gap: Spacing.five, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 3 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: Spacing.three },
  category: { width: '25%', alignItems: 'center', gap: Spacing.two },
  categoryCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mapBox: { height: 260, borderRadius: Radius.md, overflow: 'hidden' },
  useLocation: { position: 'absolute', left: 12, right: 12, bottom: 12, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: 12, borderRadius: Radius.sm },
  twoCols: { flexDirection: 'row', gap: Spacing.three },
  durations: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  duration: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.full },
  toggleRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: Radius.md, gap: Spacing.three },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.four, paddingTop: Spacing.three },
  backStep: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
