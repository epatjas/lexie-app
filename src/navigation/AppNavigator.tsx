import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// Import all screens
import HomeScreen from '../screens/HomeScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import StudySetScreen from '../screens/StudySetScreen';
import FlashcardsScreen from '../screens/FlashcardsScreen';
import QuizScreen from '../screens/QuizScreen';
import QuizCompleteScreen from '../screens/QuizComplete';
import PreviewScreen from '../screens/PreviewScreen';
import ScanPageScreen from '../screens/ScanPageScreen';
import FolderScreen from '../screens/FolderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="StudySet" component={StudySetScreen} />
      <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="QuizComplete" component={QuizCompleteScreen} />
      <Stack.Screen name="Preview" component={PreviewScreen} />
      <Stack.Screen name="ScanPage" component={ScanPageScreen} />
      <Stack.Screen name="Folder" component={FolderScreen} />
    </Stack.Navigator>
  );
} 