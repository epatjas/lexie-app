import React, { useRef, useEffect } from "react";
import { Animated, StyleSheet, View, Text, Dimensions } from "react-native";
import theme from '../styles/theme';

const { width } = Dimensions.get('window');
const radius = width * 0.2; // Adjust this value to change the circle size

export default function SplashScreen() {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 5000,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  const rotateInterpolate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const renderText = () => {
    const texts = [];
    const totalTexts = 4; // Reduced number of texts to match the image
    
    for (let i = 0; i < totalTexts; i++) {
      const angle = (i * 360) / totalTexts;
      
      texts.push(
        <Animated.View
          key={i}
          style={[
            styles.textWrapper,
            {
              transform: [
                { rotate: `${angle}deg` },
                { translateY: -radius },
                { rotateX: "65deg" }, // This creates the tilted effect
              ],
            },
          ]}
        >
          <Text style={styles.text}>LEXIE</Text>
        </Animated.View>
      );
    }
    return texts;
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.cylinder,
          {
            transform: [
              { perspective: 1000 }, // Adds 3D perspective
              { rotateX: "-25deg" }, // Tilts the entire circle
              { rotate: rotateInterpolate },
            ],
          },
        ]}
      >
        {renderText()}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  cylinder: {
    width: radius * 2,
    height: radius * 2,
    position: "relative",
  },
  textWrapper: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 120, // Adjust based on text length
    transformOrigin: "center",
  },
  text: {
    color: theme.colors.text,
    fontSize: 24,
    fontFamily: theme.fonts.bold,
    textAlign: "center",
    transform: [{ rotate: "180deg" }], // Makes text readable from outside
  },
}); 