import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, View, StyleSheet, LogBox } from 'react-native';
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
import theme from './src/styles/theme';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { checkFirstTimeUser, getUserProfiles } from './src/utils/storage';
import NameInputScreen from './src/screens/NameInputScreen';
import ProfileImageScreen from './src/screens/ProfileImageScreen';
import ProfileSelectionScreen from './src/screens/ProfileSelectionScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

LogBox.ignoreLogs([
  "It looks like you might be using shared value's .value inside reanimated inline style"
]);

export default function App() {
  const [isFirstTime, setIsFirstTime] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initDatabase();
        const profiles = await getUserProfiles();
        setIsFirstTime(!profiles.length);
      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initApp();

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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={isFirstTime ? "Welcome" : "ProfileSelection"}
          screenOptions={{
            headerShown: false,
            gestureEnabled: false
          }}
        >
          <Stack.Screen 
            name="Welcome" 
            component={WelcomeScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="NameInput" 
            component={NameInputScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="ProfileImage"
            component={ProfileImageScreen}
            options={{ gestureEnabled: false }}
          />
          <Stack.Screen 
            name="ProfileSelection"
            component={ProfileSelectionScreen}
            options={{ gestureEnabled: false }}
          />
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
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

