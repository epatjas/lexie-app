import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

const LexieLoadingIndicator = () => {
  const scale = new Animated.Value(0.5);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.5,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    Animated.loop(animation).start();

    return () => animation.stop();
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.dot, 
          { transform: [{ scale }] }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'transparent',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  }
});

export default LexieLoadingIndicator; 