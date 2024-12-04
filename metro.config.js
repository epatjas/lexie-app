const { getDefaultConfig } = require('@expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

defaultConfig.resolver.assetExts.push('png');
defaultConfig.resolver.sourceExts = [...defaultConfig.resolver.sourceExts];

module.exports = defaultConfig; 