import { MaterialIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from './theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

export function Icon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: ColorValue }) {
  // ColorValue may be null; the icon font only needs a string.
  return <MaterialIcons name={name} size={size} color={(color ?? undefined) as string | undefined} accessible={false} />;
}
