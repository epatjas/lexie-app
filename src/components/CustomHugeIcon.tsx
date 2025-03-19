import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Define a custom icon component that manually renders the SVG
export const CustomPlayIcon = ({ size = 24, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      d="M8 5v14l11-7z" 
      fill={color}
    />
  </Svg>
);

export const CustomPauseIcon = ({ size = 24, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" 
      fill={color}
    />
  </Svg>
); 