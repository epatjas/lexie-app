import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, Dimensions } from 'react-native';
import theme from '../styles/theme';

const { width } = Dimensions.get('window');
const circleRadius = width * 0.3;

export default function SplashScreen() {
  const spinValue = new Animated.Value(0);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    
    animation.start();

    return () => animation.stop();
  }, []);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.circleContainer}>
        <Animated.View 
          style={[
            styles.textCircle,
            {
              transform: [{ rotate: spin }],
            },
          ]}
        >
          {Array(12).fill('LEXIE').map((text, index) => (
            <Animated.Text
              key={index}
              style={[
                styles.text,
                {
                  transform: [
                    { rotate: `${index * 30}deg` },
                    { translateY: -circleRadius },
                  ],
                },
              ]}
            >
              {text}
            </Animated.Text>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContainer: {
    width: circleRadius * 2,
    height: circleRadius * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCircle: {
    width: circleRadius * 2,
    height: circleRadius * 2,
    position: 'absolute',
  },
  text: {
    position: 'absolute',
    width: 100,
    textAlign: 'center',
    left: circleRadius - 50,
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: theme.fonts.bold,
  },
}); 