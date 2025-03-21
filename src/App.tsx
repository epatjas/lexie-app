import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View } from 'react-native';
import { ProfileProvider } from './contexts/ProfileContext';
import AppNavigator from './navigation/AppNavigator';
import FontSelectionScreen from './screens/FontSelectionScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <ProfileProvider>
      <View style={{ flex: 1 }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="FontSelection" component={FontSelectionScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </GestureHandlerRootView>
      </View>
    </ProfileProvider>
  );
} 