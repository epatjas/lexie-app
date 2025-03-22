import { useState, useEffect, useRef } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { getAudioContent } from '../services/api';
import { StudyMaterials } from '../types/types';

export const useAudio = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Initialize audio session on mount
  useEffect(() => {
    setupAudioSession();
    
    // Cleanup on unmount
    return () => {
      cleanupSound();
    };
  }, []);
  
  const setupAudioSession = async () => {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
        playThroughEarpieceAndroid: false
      });
    } catch (err) {
      console.error('[useAudio] Failed to set audio mode:', err);
    }
  };
  
  const cleanupSound = async () => {
    try {
      if (soundRef.current) {
        console.log('[useAudio] Unloading sound');
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (err) {
      console.error('[useAudio] Error cleaning up sound:', err);
    }
  };
  
  // Setup a separate interval for position updates
  useEffect(() => {
    let positionUpdateInterval: NodeJS.Timeout | null = null;
    
    if (isPlaying && soundRef.current) {
      positionUpdateInterval = setInterval(async () => {
        try {
          if (soundRef.current) {
            const status = await soundRef.current.getStatusAsync();
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              if (status.durationMillis) {
                setDuration(status.durationMillis);
              }
            }
          }
        } catch (err) {
          console.error('[useAudio] Error getting position:', err);
        }
      }, 500);
    }
    
    return () => {
      if (positionUpdateInterval) {
        clearInterval(positionUpdateInterval);
      }
    };
  }, [isPlaying]);
  
  const playAudio = async (content: StudyMaterials, selectedTab: string = 'summary') => {
    try {
      // Cleanup any existing sound
      await cleanupSound();
      
      setIsLoading(true);
      setError(null);
      setPosition(0);
      setDuration(0);
      
      console.log('[useAudio] Getting audio content...');
      const audioData = await getAudioContent(content, selectedTab);
      
      // Save to file
      const fileUri = FileSystem.documentDirectory + 'temp_audio.mp3';
      const base64Data = arrayBufferToBase64(audioData);
      
      console.log('[useAudio] Writing audio to file...');
      await FileSystem.writeAsStringAsync(
        fileUri,
        base64Data,
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      console.log('[useAudio] Creating sound object...');
      // Create sound object without auto-playing first
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { progressUpdateIntervalMillis: 300 },
        onPlaybackStatusUpdate
      );
      
      soundRef.current = newSound;
      
      // Get initial status to set duration
      const status = await newSound.getStatusAsync();
      if (status.isLoaded) {
        console.log('[useAudio] Initial duration:', status.durationMillis);
        setDuration(status.durationMillis || 0);
      }
      
      // Now play the sound
      console.log('[useAudio] Playing sound...');
      await newSound.playAsync();
      setIsPlaying(true);
      setIsLoading(false);
      
    } catch (err) {
      console.error('[useAudio] Error playing audio:', err);
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to play audio');
    }
  };
  
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      // Update duration if available
      if (status.durationMillis && duration !== status.durationMillis) {
        setDuration(status.durationMillis);
      }
      
      // Update isPlaying state
      setIsPlaying(status.isPlaying);
      
      // Handle completion
      if (status.didJustFinish) {
        setIsPlaying(false);
        // Don't reset position at end so user can see final time
      }
    } else if (status.error) {
      console.error(`[useAudio] Playback error: ${status.error}`);
      setError(`Playback error: ${status.error}`);
    }
  };
  
  const pauseAudio = async () => {
    try {
      if (soundRef.current) {
        console.log('[useAudio] Pausing audio');
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await soundRef.current.pauseAsync();
          // Let the status update handle the state change
        }
      }
    } catch (err) {
      console.error('[useAudio] Error pausing audio:', err);
    }
  };
  
  const resumeAudio = async () => {
    try {
      if (soundRef.current) {
        console.log('[useAudio] Resuming audio');
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await soundRef.current.playAsync();
          // Let the status update handle the state change
        }
      }
    } catch (err) {
      console.error('[useAudio] Error resuming audio:', err);
    }
  };
  
  const seekAudio = async (millis: number) => {
    try {
      if (soundRef.current) {
        console.log(`[useAudio] Seeking to ${millis}ms`);
        await soundRef.current.setPositionAsync(millis);
        setPosition(millis);
      }
    } catch (err) {
      console.error('[useAudio] Error seeking audio:', err);
    }
  };
  
  const formatTime = (millis: number): string => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  return {
    playAudio,
    pauseAudio,
    resumeAudio,
    seekAudio,
    isPlaying,
    isLoading,
    error,
    position,
    duration,
    formattedPosition: formatTime(position),
    formattedDuration: formatTime(duration)
  };
};

// Helper function to convert ArrayBuffer to base64 string
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
} 