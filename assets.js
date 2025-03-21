// Force asset registry to initialize properly
import { Asset } from 'expo-asset';
import * as Font from 'expo-font';

export async function loadAssetsAsync() {
  await Promise.all([
    Asset.loadAsync([
      require('react-native/Libraries/LogBox/UI/LogBoxImages/chevron-right.png'),
    ]),
  ]);
} 