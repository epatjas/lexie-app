import { Asset } from 'expo-asset';

// Pre-register assets explicitly
export function cacheAssets() {
  return Asset.loadAsync([
    require('../../assets/fonts/Geist-VariableFont_wght.ttf'),
    // Add any other assets that need caching here
  ]);
} 