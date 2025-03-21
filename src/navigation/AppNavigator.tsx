/**
 * Main Navigation Configuration
 * 
 * IMPORTANT: All screen registrations should ONLY be defined here.
 * If you need to add a new screen, add it to this file and nowhere else.
 * This ensures that we maintain a single source of truth for navigation.
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

// Import all screens - make sure EVERY screen is here
import HomeScreen from '../screens/HomeScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import NameInputScreen from '../screens/NameInputScreen';
import ProfileSelectionScreen from '../screens/ProfileSelectionScreen';
import ProfileSettingsScreen from '../screens/ProfileSettingsScreen';
import StudySetScreen from '../screens/StudySetScreen';
import FlashcardsScreen from '../screens/FlashcardsScreen';
import QuizScreen from '../screens/QuizScreen';
import QuizCompleteScreen from '../screens/QuizComplete';
import PreviewScreen from '../screens/PreviewScreen';
import ScanPageScreen from '../screens/ScanPageScreen';
import FolderScreen from '../screens/FolderScreen';
import ProfileImageScreen from '../screens/ProfileImageScreen';
import SettingsScreen from '../screens/SettingsScreen';
import LessonHistoryScreen from '../screens/LessonHistoryScreen';
import FlashcardResultsScreen from '../screens/FlashcardResultsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        gestureEnabled: false
      }}
    >
      {/* Core app screens */}
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ProfileSelection" component={ProfileSelectionScreen} />
      <Stack.Screen name="ProfileSettings" component={ProfileSettingsScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="NameInput" component={NameInputScreen} />
      <Stack.Screen name="ProfileImage" component={ProfileImageScreen} />
      
      {/* Study screens */}
      <Stack.Screen 
        name="StudySet" 
        component={StudySetScreen} 
        getId={({ params }) => params?.id}
      />
      <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
      <Stack.Screen name="FlashcardResults" component={FlashcardResultsScreen} />
      <Stack.Screen name="Quiz" component={QuizScreen} />
      <Stack.Screen name="QuizComplete" component={QuizCompleteScreen} />
      
      {/* Document handling */}
      <Stack.Screen name="Preview" component={PreviewScreen} />
      <Stack.Screen name="ScanPage" component={ScanPageScreen} />
      <Stack.Screen name="Folder" component={FolderScreen} />
      
      {/* Settings */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="LessonHistory" component={LessonHistoryScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator; 