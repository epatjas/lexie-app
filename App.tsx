import React, { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { closeDatabase, initDatabase, clearDatabase } from './src/services/Database';
import { RootStackParamList } from './src/types/navigation';
import HomeScreen from './src/screens/HomeScreen';
import StudySetScreen from './src/screens/StudySetScreen';
import FlashcardsScreen from './src/screens/FlashcardsScreen';
import QuizScreen from './src/screens/QuizScreen';
import QuizCompleteScreen from './src/screens/QuizComplete';
import PreviewScreen from './src/screens/PreviewScreen';
import ScanPageScreen from './src/screens/ScanPageScreen';
import FolderScreen from './src/screens/FolderScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    initDatabase().catch(console.error);

    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        closeDatabase().catch(console.error);
      }
    });

    return () => {
      subscription.remove();
      closeDatabase().catch(console.error);
    };
  }, []);

  if (__DEV__) {
    // @ts-ignore
    global.clearDatabase = clearDatabase;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Home"
        screenOptions={{ 
          headerShown: false 
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="StudySet" component={StudySetScreen} />
        <Stack.Screen name="Flashcards" component={FlashcardsScreen} />
        <Stack.Screen name="Quiz" component={QuizScreen} />
        <Stack.Screen name="QuizComplete" component={QuizCompleteScreen} />
        <Stack.Screen name="Preview" component={PreviewScreen} />
        <Stack.Screen name="ScanPage" component={ScanPageScreen} />
        <Stack.Screen name="Folder" component={FolderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

