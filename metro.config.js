const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Add both png and ttf to ensure all assets are properly handled
defaultConfig.resolver.assetExts.push('png', 'ttf');

module.exports = defaultConfig; 