import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { X, Play, Pause, Rewind, FastForward } from 'lucide-react-native';
import { useAudio } from '../hooks/useAudio';
import { StudyMaterials } from '../types/types';
import theme from '../styles/theme';
import { useTranslation } from '../i18n/LanguageContext';

interface AudioPlayerProps {
  content: StudyMaterials;
  selectedTab: string;
  onClose: () => void;
  isPlaying: boolean;
  onPlayPause: () => Promise<void>;
  onSeek: (millis: number) => Promise<void>;
  currentTime: number;
  duration: number;
  formattedPosition: string;
  formattedDuration: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ content, selectedTab, onClose }) => {
  const { t } = useTranslation();
  const { 
    playAudio, 
    pauseAudio, 
    resumeAudio, 
    isPlaying, 
    isLoading,
    formattedPosition,
    formattedDuration
  } = useAudio();

  // Start playing when component mounts
  React.useEffect(() => {
    const startAudio = async () => {
      try {
        await playAudio(content, selectedTab);
      } catch (error) {
        console.error('Failed to play audio:', error);
      }
    };
    
    startAudio();
    
    // Clean up when component unmounts
    return () => {
      // Don't call any audio functions here, useAudio has its own cleanup
    };
  }, []);

  // Toggle play/pause with the same audio instance
  const handlePlayPause = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      resumeAudio();
    }
  };

  // Skip functionality
  const skipBackward = () => {
    // Implement the skip backward functionality
    console.log('Skip backward not implemented');
  };

  const skipForward = () => {
    // Implement the skip forward functionality
    console.log('Skip forward not implemented');
  };

  return (
    <View style={styles.audioPlayerOverlay}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#FFFFFF" size="small" />
          <Text style={styles.loadingText}>Generating audio...</Text>
        </View>
      ) : (
        <>
          <View style={styles.audioPlayerControls}>
            <TouchableOpacity 
              style={styles.playButton}
              onPress={handlePlayPause}
            >
              {isPlaying ? (
                <Pause color="#FFF" size={24} />
              ) : (
                <Play color="#FFF" size={24} />
              )}
            </TouchableOpacity>
            <Text style={styles.audioTimer}>
              {formattedPosition}
            </Text>
          </View>
          
          <View style={styles.audioRightControls}>
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={skipBackward}
            >
              <Rewind color="#FFF" size={16} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.skipButton} 
              onPress={skipForward}
            >
              <FastForward color="#FFF" size={16} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={onClose}
            >
              <X color="#FFF" size={24} />
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

// Styles with adjusted timer style
const styles = StyleSheet.create({
  audioPlayerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 9999,
    backgroundColor: '#1A1A1A',
    borderRadius: 30,
    margin: 10,
    marginTop: Platform.OS === 'ios' ? 50 : 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  audioPlayerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioTimer: {
    color: '#FFF',
    fontSize: 14, // Slightly larger now that it's only showing one time
    fontFamily: theme.fonts.regular,
    marginLeft: 8,
    minWidth: 45, // Add minimum width to prevent layout shifts
  },
  audioRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skipButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#FFF",
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#FFF',
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    marginLeft: 12,
  }
});

export default AudioPlayer; 