import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import Home from './src/screens/HomeScreen';
import Add from './src/screens/AddScreen';
import Records from './src/screens/RecordsScreen';
import Reports from './src/screens/ReportsScreen';
import Budgets from './src/screens/BudgetsScreen';
import { colors, spacing } from './src/theme';

const Tab = createBottomTabNavigator();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    notification: colors.danger,
  },
};

const screenOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitleStyle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  headerTintColor: colors.text,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  tabBarIconStyle: { display: 'none' },
  tabBarLabelStyle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <NavigationContainer theme={navigationTheme}>
        <Tab.Navigator initialRouteName="Home" screenOptions={screenOptions}>
          <Tab.Screen name="Home" component={Home} />
          <Tab.Screen name="Add" component={Add} />
          <Tab.Screen name="Records" component={Records} />
          <Tab.Screen name="Reports" component={Reports} />
          <Tab.Screen name="Budgets" component={Budgets} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
