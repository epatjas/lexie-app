import React from 'react';
import Svg, { Path } from 'react-native-svg';

// Play icon
export const CustomPlayIcon = ({ size = 24, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      d="M8 5v14l11-7z" 
      fill={color}
    />
  </Svg>
);

// Pause icon
export const CustomPauseIcon = ({ size = 24, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path 
      d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" 
      fill={color}
    />
  </Svg>
);

// Skip backward 15s icon
export const CustomBackward15Icon = ({ size = 24, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 5V1L7 6l5 5V7c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8zm-1.1 11h-.8v-3.6H9v-.9h1.9v4.5zm6.1-1c0 .8-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5.7-1.5 1.5-1.5 1.5.7 1.5 1.5zm-1.5-3c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2s2-.9 2-2v-2c0-1.1-.9-2-2-2zm.5 4c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-2c0-.3.2-.5.5-.5s.5.2.5.5v2z"
      fill={color}
    />
  </Svg>
);

// Skip forward 15s icon
export const CustomForward15Icon = ({ size = 24, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M18 13c0 3.3-2.7 6-6 6s-6-2.7-6-6 2.7-6 6-6v4l5-5-5-5v4c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8h-2zm-7.7 2h-.8v-3.6H8.4v-.9h1.9v4.5zm3.6-3c-.4 0-.7.4-.7.8v2.4c0 .4.3.8.7.8s.7-.4.7-.8v-2.4c0-.4-.3-.8-.7-.8zm0 3.6c-.1 0-.2-.1-.2-.2v-2.4c0-.1.1-.2.2-.2s.2.1.2.2v2.4c0 .1-.1.2-.2.2z"
      fill={color}
    />
  </Svg>
);

// Close/cancel icon
export const CustomCloseIcon = ({ size = 24, color = 'white' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      fill={color}
    />
  </Svg>
); 