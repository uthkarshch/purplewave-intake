import { MaterialIcons } from '@expo/vector-icons';
import { PublicSans_500Medium, PublicSans_600SemiBold } from '@expo-google-fonts/public-sans';
import { SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold, useFonts } from '@expo-google-fonts/space-grotesk';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OutboxProvider, useOutboxRecords } from '@/features/outbox';
import { outboxApi, startOutbox } from '@/features/outbox/runtime';
import { AppHeader, colors, font, Icon, TONES } from '@/ui';

const TAB_BAR_HEIGHT = 64;

function AppTabs() {
  const pending = useOutboxRecords().filter((r) => r.phase !== 'submitted').length;
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader eyebrow="Field appraisal" title="Purple Wave Intake" />,
        sceneStyle: { backgroundColor: colors.ground },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.accentSoft,
        // An explicit height replaces the navigator's inset-aware one, so the inset is added back here.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarShowLabel: true,
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: { paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'New appraisal',
          tabBarLabel: 'New appraisal',
          tabBarIcon: ({ color }) => <Icon name="add-circle" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: 'Submissions',
          tabBarLabel: 'Submissions',
          tabBarBadge: pending || undefined,
          tabBarBadgeStyle: { backgroundColor: TONES.info.bar, color: colors.onAccent, fontFamily: font.bold },
          tabBarIcon: ({ color }) => <Icon name="drive-folder-upload" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...MaterialIcons.font,
    PublicSans_500Medium,
    PublicSans_600SemiBold,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    void startOutbox();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <OutboxProvider api={outboxApi}>
      <StatusBar style="dark" />
      <AppTabs />
    </OutboxProvider>
  );
}
