import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { checkFirstTimeUser } from '../utils/storage';

// Import all screens
import HomeScreen from '../screens/HomeScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import NameInputScreen from '../screens/NameInputScreen';
import StudySetScreen from '../screens/StudySetScreen';
import FlashcardsScreen from '../screens/FlashcardsScreen';
import QuizScreen from '../screens/QuizScreen';
import QuizCompleteScreen from '../screens/QuizComplete';
import PreviewScreen from '../screens/PreviewScreen';
import ScanPageScreen from '../screens/ScanPageScreen';
import FolderScreen from '../screens/FolderScreen';
import ProfileImageScreen from '../screens/ProfileImageScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    const checkInitialRoute = async () => {
      const isFirstTime = await checkFirstTimeUser();
      setInitialRoute(isFirstTime ? 'Welcome' : 'Home');
    };
    checkInitialRoute();
  }, []);

  if (!initialRoute) return null;

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="NameInput" component={NameInputScreen} />
      <Stack.Screen name="ProfileImage" component={ProfileImageScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="StudySet" component={StudySetScreen} />
      <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="QuizComplete" component={QuizCompleteScreen} />
      <Stack.Screen name="Preview" component={PreviewScreen} />
      <Stack.Screen name="ScanPage" component={ScanPageScreen} />
      <Stack.Screen name="Folder" component={FolderScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
} 