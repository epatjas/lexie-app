import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, View, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { closeDatabase, initDatabase, clearDatabase } from './src/services/Database';
import SplashScreen from './src/components/SplashScreen';
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

const Stack = createNativeStackNavigator<RootStackParamList>();

// Ignore specific warning
LogBox.ignoreLogs([
  "It looks like you might be using shared value's .value inside reanimated inline style"
]);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        await initDatabase();
        // Ensure splash screen shows for at least 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsLoading(false);
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

  if (__DEV__) {
    // @ts-ignore
    global.clearDatabase = clearDatabase;
    // @ts-ignore
    global.toggleLoading = () => setIsLoading(prev => !prev);
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SplashScreen />
      </View>
    );
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

