import { Pressable, StyleSheet, Text, View } from 'react-native';

import { monthName, shortMonthName, type MonthKey } from '@/data/month-logic';
import { colors, fonts } from '@/theme';

/** Monat wechseln: "‹ Okt"  November 2026  "Dez ›" */
export function MonthNav({ months, month, onChange }: { months: MonthKey[]; month: MonthKey; onChange(m: MonthKey): void }) {
  const i = months.indexOf(month);
  const prev = i > 0 ? months[i - 1] : null;
  const next = i >= 0 && i < months.length - 1 ? months[i + 1] : null;
  return (
    <View style={styles.row}>
      <NavButton target={prev} text={prev ? `‹ ${shortMonthName(prev)}` : '–'} label="Vorheriger Monat" onChange={onChange} />
      <Text accessibilityRole="header" style={styles.title}>
        {monthName(month)}
      </Text>
      <NavButton target={next} text={next ? `${shortMonthName(next)} ›` : '–'} label="Nächster Monat" onChange={onChange} />
    </View>
  );
}

function NavButton({ target, text, label, onChange }: { target: MonthKey | null; text: string; label: string; onChange(m: MonthKey): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={target ? `${label}: ${monthName(target)}` : `${label}: keiner`}
      aria-disabled={!target}
      disabled={!target}
      onPress={() => target && onChange(target)}
      style={({ pressed }) => [styles.button, (pressed || !target) && styles.dim]}>
      <Text style={styles.buttonText}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontFamily: fonts.extraBold, fontSize: 17, color: colors.text },
  button: { minWidth: 76, minHeight: 44, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontFamily: fonts.extraBold, fontSize: 14, color: colors.text },
  dim: { opacity: 0.5 },
});
