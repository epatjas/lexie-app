import React, { useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

import HomeScreen from './src/screens/HomeScreen';
import ScanPageScreen from './src/screens/ScanPageScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import StudySetScreen from './src/screens/StudySetScreen';
import QuizScreen from './src/screens/QuizScreen';
import QuizCompleteScreen from './src/screens/QuizComplete';
import { RootStackParamList } from './src/types/navigation';
import theme from './src/styles/theme';
import { testDatabaseConnection, initDatabase } from './src/services/Database';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Keep splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

export default function App() {
  console.log('App is rendering');
  
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  console.log('Fonts loaded:', fontsLoaded);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDatabase();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };

    setupDatabase();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <NavigationContainer onReady={onLayoutRootView}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ScanPage" component={ScanPageScreen} />
        <Stack.Screen name="Preview" component={PreviewScreen} />
        <Stack.Screen name="StudySet" component={StudySetScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="QuizComplete" component={QuizCompleteScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

