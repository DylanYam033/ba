import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { EventMap } from '@/components/map/event-map';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, Chip, glow, GradientButton, hexToRgba, Pill, TextField } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useCurrentUser } from '@/ctx/auth';
import { useAppTheme } from '@/ctx/theme';
import { FALLBACK_COORDS, useUserLocation } from '@/hooks/use-user-location';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import { eventsApi, type Coords } from '@/lib/endpoints';
import { isInPast } from '@/lib/format';
import type { EventCategory } from '@/lib/types';

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
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory | null>(null);
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<Coords | null>(null);
  const [venue, setVenue] = useState({ name: '', address: '', city: '' });
  const [dayIndex, setDayIndex] = useState(0);
  const [time, setTime] = useState('20:00');
  const [duration, setDuration] = useState(4);
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mapCenter = picked ?? coords ?? FALLBACK_COORDS;

  const startDate = () => {
    const [h, m] = time.split(':').map(Number);
    const d = new Date(days[dayIndex].date);
    d.setHours(h, m, 0, 0);
    return d;
  };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (title.trim().length < 3) return 'Ponle un nombre de al menos 3 caracteres.';
      if (!category) return 'Elige una categoría.';
    }
    if (step === 1) {
      if (!picked) return 'Toca el mapa (o usa tu ubicación) para fijar el pin.';
      if (venue.name.trim().length < 2) return 'Escribe el nombre del lugar.';
    }
    if (step === 2) {
      if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(time)) return 'La hora debe tener formato HH:MM (24h).';
      if (isInPast(startDate(), 60 * 60 * 1000)) return 'La fecha de inicio ya pasó.';
      if (!isFree && !(Number(price) > 0)) return 'Ingresa un precio mayor a 0.';
      if (capacity && !(Number(capacity) >= 1)) return 'El cupo debe ser un número mayor a 0.';
    }
    return null;
  };

  const next = async () => {
    const problem = validateStep();
    setError(problem);
    if (problem) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }

    setSubmitting(true);
    try {
      const start = startDate();
      const end = new Date(start.getTime() + duration * 60 * 60 * 1000);
      const created = await eventsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category: category!,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        organizerType: user.accountType === 'business' ? 'business' : 'user',
        isFree,
        price: isFree ? undefined : Number(price),
        currency: isFree ? undefined : 'COP',
        maxCapacity: capacity ? Number(capacity) : undefined,
        tags: tags.split(',').map((t) => t.trim().replace(/^#/, '')).filter(Boolean),
        location: {
          name: venue.name.trim(),
          address: venue.address.trim() || undefined,
          city: venue.city.trim() || undefined,
          latitude: picked!.lat,
          longitude: picked!.lng,
        },
      });
      // The API creates events as drafts; publish so they show on the map and feeds.
      await eventsApi.update(created.id, { status: 'published' });
      router.replace({ pathname: '/event/[id]', params: { id: created.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const back = () => (step > 0 ? (setError(null), setStep(step - 1)) : router.back());

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
                value={title}
                onChangeText={setTitle}
                maxLength={200}
                style={{ fontSize: 20 }}
              />
              <View style={{ gap: Spacing.three }}>
                <AppText variant="label">Categoría</AppText>
                <View style={styles.categoryGrid}>
                  {CATEGORY_KEYS.map((key) => {
                    const meta = CATEGORIES[key];
                    const active = category === key;
                    return (
                      <Pressable key={key} onPress={() => setCategory(key)} style={[styles.category, { opacity: !category || active ? 1 : 0.55 }]}>
                        <View
                          style={[
                            styles.categoryCircle,
                            active
                              ? [{ backgroundColor: hexToRgba(colors.primaryContainer, 0.25), borderColor: colors.primary }, glow(colors.primary, 0.45, 16)]
                              : { backgroundColor: colors.surfaceContainer, borderColor: colors.outlineVariant },
                          ]}>
                          <Text style={{ fontSize: 26 }}>{meta.emoji}</Text>
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
                placeholder="¿Qué va a pasar? Line-up, dress code, sorpresas…"
                value={description}
                onChangeText={setDescription}
                multiline
                style={{ minHeight: 110, textAlignVertical: 'top' }}
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
                  <EventMap center={mapCenter} onPick={setPicked} picked={picked} radiusKm={3} />
                  <Pressable
                    onPress={async () => setPicked(await locate())}
                    style={[styles.useLocation, { backgroundColor: colors.glass }]}>
                    <Icon name="nearMe" size={18} color={colors.secondary} />
                    <AppText variant="caption" color={colors.text}>
                      {picked ? `${picked.lat.toFixed(4)}, ${picked.lng.toFixed(4)}` : 'Usar mi ubicación'}
                    </AppText>
                  </Pressable>
                </View>
              </View>
              <TextField label="Nombre del lugar" placeholder="The Quantum Lounge" value={venue.name} onChangeText={(name) => setVenue((v) => ({ ...v, name }))} />
              <TextField label="Dirección" placeholder="Cra 13 #85-24" value={venue.address} onChangeText={(address) => setVenue((v) => ({ ...v, address }))} />
              <TextField label="Ciudad" placeholder="Bogotá" value={venue.city} onChangeText={(city) => setVenue((v) => ({ ...v, city }))} />
            </>
          )}

          {step === 2 && (
            <>
              <View style={{ gap: Spacing.three }}>
                <AppText variant="label">Fecha</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
                  {days.map((d, i) => (
                    <Chip key={i} label={d.label} active={i === dayIndex} onPress={() => setDayIndex(i)} />
                  ))}
                </ScrollView>
              </View>
              <View style={styles.twoCols}>
                <View style={{ flex: 1 }}>
                  <TextField label="Hora de inicio" value={time} onChangeText={setTime} placeholder="20:00" keyboardType="numbers-and-punctuation" maxLength={5} />
                </View>
                <View style={{ flex: 1, gap: Spacing.two }}>
                  <AppText variant="label" style={{ paddingHorizontal: Spacing.one }}>Duración</AppText>
                  <View style={styles.durations}>
                    {DURATIONS.map((h) => (
                      <Pressable
                        key={h}
                        onPress={() => setDuration(h)}
                        style={[styles.duration, { backgroundColor: duration === h ? colors.primaryContainer : colors.surfaceHighest }]}>
                        <AppText variant="label" color={duration === h ? colors.onPrimaryContainer : colors.text}>
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
                <Switch value={isFree} onValueChange={setIsFree} trackColor={{ true: colors.primaryContainer, false: colors.surfaceHighest }} thumbColor={isFree ? colors.primary : colors.outline} />
              </View>
              {!isFree && <TextField label="Precio (COP)" value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="25000" />}
              <TextField label="Cupo máximo (opcional)" value={capacity} onChangeText={setCapacity} keyboardType="numeric" placeholder="Sin límite" />
              <TextField label="Etiquetas (separadas por coma)" value={tags} onChangeText={setTags} autoCapitalize="none" placeholder="techno, rooftop" />
              <Pill style={{ alignSelf: 'flex-start' }}>
                <Icon name="calendar" size={14} color={colors.secondary} />
                <AppText variant="caption" color={colors.text}>
                  {days[dayIndex].label} · {time} – {duration} h
                </AppText>
              </Pill>
            </>
          )}

          {error && (
            <AppText variant="caption" color={colors.error}>
              {error}
            </AppText>
          )}
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
          loading={submitting}
          onPress={next}
          style={{ flex: 1 }}
        />
      </View>
    </View>
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
