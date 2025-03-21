import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { ProfileProvider } from './contexts/ProfileContext';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <ProfileProvider>
      <View style={{ flex: 1 }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <AppNavigator />
          </NavigationContainer>
        </GestureHandlerRootView>
      </View>
    </ProfileProvider>
  );
} 