import { router } from 'expo-router';
import { useFormik } from 'formik';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';

import { CommunityAvatar } from '@/components/community-cards';
import { BackButton, TopBar } from '@/components/top-bar';
import { AppText, Chip, GradientButton, TextField } from '@/components/ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';
import { CATEGORIES, CATEGORY_KEYS } from '@/lib/categories';
import { communitySchema, type CommunityFormValues } from '@/lib/community-form';
import { communitiesApi } from '@/lib/endpoints';

/** Create a community from the profile or home; the creator owns it and joins automatically. */
export default function NewCommunity() {
  const { colors } = useAppTheme();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useFormik<CommunityFormValues>({
    initialValues: { name: '', description: '', category: null },
    validationSchema: communitySchema,
    onSubmit: async (v) => {
      setSubmitError(null);
      try {
        const created = await communitiesApi.create({
          name: v.name.trim(),
          description: v.description.trim() || undefined,
          category: v.category ?? undefined,
        });
        router.replace({ pathname: '/community/[id]', params: { id: created.id } });
      } catch (e) {
        setSubmitError((e as Error).message);
      }
    },
  });
  const field = (name: 'name' | 'description') => ({
    value: form.values[name],
    onChangeText: form.handleChange(name),
    onBlur: form.handleBlur(name),
    error: form.touched[name] ? form.errors[name] : undefined,
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Nueva comunidad" left={<BackButton icon="close" />} right={<View />} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.preview}>
            <CommunityAvatar community={{ id: 'preview', name: form.values.name || 'Comunidad', avatarUrl: null }} size={88} />
            <AppText variant="caption" style={{ textAlign: 'center' }}>
              Podrás subir una foto cuando la crees.
            </AppText>
          </View>

          <TextField label="Nombre" placeholder="Runners de Cali" maxLength={100} {...field('name')} />
          <TextField
            label="Descripción (opcional)"
            placeholder="¿De qué se trata? ¿Cuándo se reúnen?"
            multiline
            maxLength={1000}
            style={{ minHeight: 110, textAlignVertical: 'top' }}
            {...field('description')}
          />

          <View style={{ gap: Spacing.three }}>
            <AppText variant="label">Tema (opcional)</AppText>
            <View style={styles.chips}>
              {CATEGORY_KEYS.map((key) => (
                <Chip
                  key={key}
                  label={CATEGORIES[key].label}
                  icon={CATEGORIES[key].icon}
                  iconColor={CATEGORIES[key].color}
                  active={form.values.category === key}
                  onPress={() => form.setFieldValue('category', form.values.category === key ? null : key)}
                />
              ))}
            </View>
          </View>

          <AppText variant="caption">
            Las comunidades son abiertas: cualquiera puede unirse. Solo tú podrás publicar eventos a su nombre.
          </AppText>
          {submitError && (
            <AppText variant="caption" color={colors.error}>
              {submitError}
            </AppText>
          )}
          <GradientButton title="Crear comunidad" icon="check" loading={form.isSubmitting} onPress={() => form.handleSubmit()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.four, width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  preview: { alignItems: 'center', gap: Spacing.two, marginVertical: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
