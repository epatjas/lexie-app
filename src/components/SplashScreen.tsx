import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withTiming,
  Easing 
} from 'react-native-reanimated';
import theme from '../styles/theme';

const { width } = Dimensions.get('window');
const circleRadius = width * 0.3;

export default function SplashScreen() {
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 4000,
        easing: Easing.linear,
      }),
      -1, // Infinite repetition
      false // Don't reverse the animation
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.circleContainer}>
        <Animated.View style={[styles.textCircle, animatedStyle]}>
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