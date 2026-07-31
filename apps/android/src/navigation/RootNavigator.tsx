import React from 'react';
import {Platform, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {
  Calendar,
  CheckSquare,
  Home,
  Settings,
  StickyNote,
  Timer,
} from 'lucide-react-native';
import {DashboardScreen} from '../screens/DashboardScreen';
import {PomodoroScreen} from '../screens/PomodoroScreen';
import {TasksScreen} from '../screens/TasksScreen';
import {PlannerScreen} from '../screens/PlannerScreen';
import {NotesScreen} from '../screens/NotesScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {colors, radii, type} from '../theme/tokens';

const Tab = createBottomTabNavigator();

function NavIcon({
  Icon,
  focused,
}: {
  Icon: typeof Home;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon
        size={22}
        color={focused ? colors.accent : colors.textMuted}
        strokeWidth={1.75}
      />
    </View>
  );
}

export function RootNavigator() {
  const {width} = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: [
            styles.tabBar,
            isTablet && styles.tabBarTablet,
            Platform.OS === 'android' && {height: 68},
          ],
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
        }}>
        <Tab.Screen
          name="Home"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({focused}) => <NavIcon Icon={Home} focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Focus"
          component={PomodoroScreen}
          options={{
            tabBarIcon: ({focused}) => <NavIcon Icon={Timer} focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Tasks"
          component={TasksScreen}
          options={{
            tabBarIcon: ({focused}) => (
              <NavIcon Icon={CheckSquare} focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Planner"
          component={PlannerScreen}
          options={{
            tabBarIcon: ({focused}) => (
              <NavIcon Icon={Calendar} focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Notes"
          component={NotesScreen}
          options={{
            tabBarIcon: ({focused}) => (
              <NavIcon Icon={StickyNote} focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({focused}) => (
              <NavIcon Icon={Settings} focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.white,
    borderTopColor: colors.border,
    paddingTop: 6,
  },
  tabBarTablet: {
    // Tablet uses the same destinations; a true nav rail can replace this later.
    height: 72,
  },
  tabLabel: {
    ...type.caption,
    fontWeight: '500',
  },
  iconWrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  iconWrapActive: {
    backgroundColor: colors.accentSoft,
  },
});
