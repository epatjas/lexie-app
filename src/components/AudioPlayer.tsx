import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { X, Play, Pause, Rewind, FastForward } from 'lucide-react-native';
import { useAudio } from '../hooks/useAudio';
import { StudyMaterials } from '../types/types';
import theme from '../styles/theme';
import { useTranslation } from '../i18n/LanguageContext';

interface AudioPlayerProps {
  content: StudyMaterials;
  selectedTab: string;
  onClose: () => void;
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

  // Skip functionality - would need to be connected to actual seek functions
  const skipBackward = () => {
    console.log('Skip backward not implemented');
  };

  const skipForward = () => {
    console.log('Skip forward not implemented');
  };

  return (
    <View style={styles.audioPlayerOverlay}>
      <View style={styles.audioPlayerControls}>
        <TouchableOpacity 
          style={styles.playButton}
          onPress={handlePlayPause}
          accessibilityLabel={isPlaying ? t('common.pause') : t('common.play')}
        >
          {isPlaying ? (
            <Pause color="#FFF" size={24} />
          ) : (
            <Play color="#FFF" size={24} />
          )}
        </TouchableOpacity>
        <Text style={styles.audioTimer}>
          {formattedPosition} / {formattedDuration}
        </Text>
      </View>
      
      <View style={styles.audioRightControls}>
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={skipBackward}
          accessibilityLabel={t('common.back')}
        >
          <Rewind color="#FFF" size={16} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.skipButton} 
          onPress={skipForward}
          accessibilityLabel={t('common.next')}
        >
          <FastForward color="#FFF" size={16} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          accessibilityLabel={t('common.close')}
        >
          <X color="#FFF" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles copied exactly from StudySetScreen.tsx to maintain original styling
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
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    marginLeft: 4,
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
});

export default AudioPlayer; 