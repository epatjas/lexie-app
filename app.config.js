// This is a simplified app.config.js that doesn't try to manage native properties
module.exports = ({ config }) => {
  const buildType = process.env.EAS_BUILD_PROFILE || 'development';
  
  console.log("Build profile:", buildType);
  
  if (buildType === 'development') {
    const newBundleId = 'com.epatjas.lexieappdev';
    console.log("Using development bundle ID:", newBundleId);
    
    return {
      ...config,
      name: "LexieLearn Dev",
      ios: {
        ...config.ios,
        bundleIdentifier: newBundleId
      },
      android: {
        ...config.android,
        package: newBundleId
      }
    };
  }
  
  return {
    ...config,
    version: "3.0.2",
    ios: {
      ...config.ios,
      bundleIdentifier: "com.epatjas.lexieapp",
      buildNumber: "6"
    },
    android: {
      ...config.android,
      package: "com.epatjas.lexieapp"
    }
  };
}; 