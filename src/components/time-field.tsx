import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Fonts, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/ctx/theme';

import { Icon } from './icon';
import { AppText } from './ui';

/**
 * Hour + minute picker styled like TextField. Android opens the Material clock dialog on tap;
 * iOS has no dialog mode, so it shows the compact inline picker inside the field.
 * Only the hours and minutes of `value` matter.
 */
export function TimeField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: Date;
  onChange: (time: Date) => void;
  error?: string | null;
}) {
  const { colors, scheme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const formatted = value.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={{ gap: Spacing.two }}>
      <AppText variant="label" style={{ paddingHorizontal: Spacing.one }}>
        {label}
      </AppText>
      {Platform.OS === 'ios' ? (
        <View style={[styles.field, { backgroundColor: colors.surfaceHighest }]}>
          <DateTimePicker
            value={value}
            mode="time"
            display="compact"
            // es_CO formats time as 12 h with a. m./p. m., matching the Android dial.
            locale="es_CO"
            accentColor={colors.primary}
            themeVariant={scheme}
            onValueChange={(_, date) => onChange(date)}
          />
        </View>
      ) : (
        <Pressable
          onPress={() => setOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${formatted}. Toca para cambiarla`}
          style={({ pressed }) => [styles.field, { backgroundColor: colors.surfaceHighest, opacity: pressed ? 0.8 : 1 }]}>
          <AppText style={[styles.value, { color: colors.text }]}>{formatted}</AppText>
          <Icon name="clock" size={20} color={colors.secondary} />
        </Pressable>
      )}
      {/* Dialog presentation opens on mount; unmount it once the user confirms or cancels. */}
      {open && Platform.OS !== 'ios' && (
        <DateTimePicker
          value={value}
          mode="time"
          presentation="dialog"
          // 12 h dial (one ring of numbers) + AM/PM toggle, whatever the phone's 24 h setting.
          is24Hour={false}
          accentColor={colors.primary}
          themeVariant={scheme}
          positiveButton={{ label: 'Aceptar' }}
          negativeButton={{ label: 'Cancelar' }}
          onValueChange={(_, date) => {
            setOpen(false);
            onChange(date);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
      {error ? (
        <AppText variant="caption" color={colors.error} style={{ paddingHorizontal: Spacing.one }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: Radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    minHeight: 56,
  },
  value: { fontFamily: Fonts.body, fontSize: 16 },
});
