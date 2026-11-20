import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, font, radius, type } from './theme';

type Props = TextInputProps & {
  invalid?: boolean;
  // A unit shown in a small chip at the right edge, such as "h" for hours.
  suffix?: string;
};

export function Input({ invalid, suffix, multiline, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[styles.box, focused && styles.focused, invalid && styles.invalid]}>
      <TextInput
        multiline={multiline}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, multiline && styles.multiline, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {suffix ? (
        <View style={styles.suffix}>
          <Text style={styles.suffixText}>{suffix}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    backgroundColor: colors.fieldBg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
  },
  focused: { backgroundColor: colors.surface, borderColor: colors.accent },
  invalid: { borderColor: colors.required },
  input: {
    flex: 1,
    minHeight: 52,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 10,
    fontSize: 18,
    fontFamily: font.medium,
    color: colors.ink,
  },
  multiline: { minHeight: 96, fontSize: type.body, fontFamily: font.regular, textAlignVertical: 'top' },
  suffix: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.line },
  suffixText: { fontSize: type.label, fontFamily: font.medium, color: colors.ink },
});
