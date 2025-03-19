const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.assetExts.push('png');
defaultConfig.resolver.sourceExts = [...defaultConfig.resolver.sourceExts, 'jsx', 'js', 'ts', 'tsx', 'json', 'svg'];

module.exports = {
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: true,
      },
    }),
  },
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json', 'svg'],
  },
}; 