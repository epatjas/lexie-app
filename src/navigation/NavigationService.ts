import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

// Queue for storing navigation actions until ref is ready
const navigationQueue: {name: keyof RootStackParamList, params: any}[] = [];

export function navigate(name: keyof RootStackParamList, params: any) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
    console.log(`[NavigationService] Navigated to ${String(name)}`);
  } else {
    // Queue the navigation for when it becomes ready
    console.log(`[NavigationService] Queuing navigation to ${String(name)}`);
    navigationQueue.push({name, params});
  }
}

// Call this when NavigationContainer is ready
export function processNavigationQueue() {
  console.log(`[NavigationService] Processing ${navigationQueue.length} queued navigation actions`);
  
  while (navigationQueue.length > 0 && navigationRef.isReady()) {
    const { name, params } = navigationQueue.shift()!;
    navigate(name, params);
  }
}

// Add other navigation methods (goBack, reset, etc.)
export function goBack() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
} 