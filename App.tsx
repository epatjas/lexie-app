import 'react-native/Libraries/Image/AssetRegistry';
import React, { useEffect, useState } from 'react';
import { AppState, AppStateStatus, View, StyleSheet, LogBox, Text, Alert, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ProfileProvider } from './src/contexts/ProfileContext';
import AppNavigator from './src/navigation/AppNavigator';
import { navigationRef, processNavigationQueue } from './src/navigation/NavigationService';
import { closeDatabase, initDatabase, clearDatabase } from './src/services/Database';
import { RootStackParamList } from './src/types/navigation';
import HomeScreen from './src/screens/HomeScreen';
import StudySetScreen from './src/screens/StudySetScreen';
import FlashcardsScreen from './src/screens/FlashcardsScreen';
import FlashcardResultsScreen from './src/screens/FlashcardResultsScreen';
import QuizScreen from './src/screens/QuizScreen';
import QuizCompleteScreen from './src/screens/QuizComplete';
import PreviewScreen from './src/screens/PreviewScreen';
import ScanPageScreen from './src/screens/ScanPageScreen';
import FolderScreen from './src/screens/FolderScreen';
import theme from './src/styles/theme';
import WelcomeScreen from './src/screens/WelcomeScreen';
import { checkFirstTimeUser, getUserProfiles } from './src/utils/storage';
import NameInputScreen from './src/screens/NameInputScreen';
import ProfileImageScreen from './src/screens/ProfileImageScreen';
import ProfileSelectionScreen from './src/screens/ProfileSelectionScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import LessonHistoryScreen from './src/screens/LessonHistoryScreen';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { cacheAssets } from './src/utils/asset';
import ProfileSettingsScreen from './src/screens/ProfileSettingsScreen';
import { 
  AtkinsonHyperlegible_400Regular, 
} from '@expo-google-fonts/atkinson-hyperlegible';
import {
  IBMPlexMono_400Regular
} from '@expo-google-fonts/ibm-plex-mono';
import { LanguageProvider } from './src/i18n/LanguageContext';

LogBox.ignoreLogs([
  "It looks like you might be using shared value's .value inside reanimated inline style"
]);

// Keep splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceReady, setForceReady] = useState(false);
  
  useEffect(() => {
    async function prepare() {
      try {
        console.log("Starting app preparation...");
        
        // Cache assets first
        await cacheAssets();
        
        // Then load font
        try {
          await Font.loadAsync({
            'Geist': require('./assets/fonts/Geist-VariableFont_wght.ttf'),
            'OpenDyslexic': require('./assets/fonts/OpenDyslexic-Regular.otf'),
            'OpenDyslexic-Bold': require('./assets/fonts/OpenDyslexic-Bold.otf'),
            'OpenDyslexic-Italic': require('./assets/fonts/OpenDyslexic-Italic.otf'),
            'AtkinsonHyperlegible': AtkinsonHyperlegible_400Regular,
            'IBMPlexMono': IBMPlexMono_400Regular,
          });
          console.log("Fonts loaded successfully");
          setFontsLoaded(true);
        } catch (fontError) {
          console.error("Font loading error details:", fontError);
          setFontsLoaded(true); // Still mark as loaded even if it fails
        }
        
        // Initialize database
        await initDatabase();
        console.log("Database initialized");
        
        const profiles = await getUserProfiles();
        console.log("Profiles loaded:", profiles.length);
        setIsFirstTime(!profiles.length);
        setAppIsReady(true);
      } catch (error: any) {
        console.warn('Error preparing app:', error);
        setError(error?.message || 'Unknown error');
      }
    }

    prepare();
  }, []);

  useEffect(() => {
    async function hideSplash() {
      if (fontsLoaded && appIsReady) {
        console.log("App is ready, hiding splash screen");
        try {
          await SplashScreen.hideAsync();
          console.log("Splash screen hidden successfully");
        } catch (e) {
          console.log("Error hiding splash screen:", e);
          // Continue anyway
        }
      }
    }
    
    hideSplash();
  }, [fontsLoaded, appIsReady]);

  // Force app to proceed after 5 seconds if it's still loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!fontsLoaded || !appIsReady) {
        console.log("Force proceeding after timeout");
        setFontsLoaded(true);
        setAppIsReady(true);
        setForceReady(true);
      }
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [fontsLoaded, appIsReady]);

  // Database close logic on app state change
  useEffect(() => {
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

  // Add a fallback UI for troubleshooting
  if ((!fontsLoaded || !appIsReady) && !forceReady) {
    console.log("Still loading - fonts loaded:", fontsLoaded, "app ready:", appIsReady);
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <Text>Loading app resources...</Text>
        <Text style={{marginTop: 10, fontSize: 12}}>
          Fonts: {fontsLoaded ? "✓" : "..."} | App: {appIsReady ? "✓" : "..."}
        </Text>
      </View>
    );
  }

  const resetApp = async () => {
    try {
      console.log("Resetting app state...");
      await closeDatabase();
      await clearDatabase();
      console.log("Database closed and cleared");
      
      // Force reload
      Alert.alert(
        "App Reset",
        "App has been reset. Please restart the app.",
        [{ text: "OK" }]
      );
    } catch (error: any) {
      console.error("Error during reset:", error);
    }
  };

  if (error) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <Text style={{color: 'red', marginBottom: 20}}>Error loading app:</Text>
        <Text>{error}</Text>
        <View style={{marginTop: 20}}>
          <Button title="Reset App" onPress={resetApp} />
        </View>
      </View>
    );
  }

  console.log("Rendering main navigation, isFirstTime:", isFirstTime);
  
  return (
    <LanguageProvider>
      <ProfileProvider>
        <View style={{ flex: 1 }}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer 
              ref={navigationRef}
              onReady={() => {
                console.log('[App] NavigationContainer READY');
                processNavigationQueue();
              }}
              onStateChange={(state) => {
                console.log('[App] Navigation state changed:', 
                  state?.routes?.map(r => r.name) || 'No routes');
              }}
            >
              <AppNavigator initialRouteName={isFirstTime ? "Welcome" : "ProfileSelection"} />
            </NavigationContainer>
          </GestureHandlerRootView>
        </View>
      </ProfileProvider>
    </LanguageProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});

