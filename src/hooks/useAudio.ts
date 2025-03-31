import { useState, useEffect, useRef } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { getAudioContent } from '../services/api';
import { StudyMaterials } from '../types/types';

export const useAudio = () => {
  const soundRef = useRef<Audio.Sound | null>(null);
  const fullSoundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isChunkMode, setIsChunkMode] = useState(false);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const [fullAudioReady, setFullAudioReady] = useState(false);
  const [chunkFinishedWaiting, setChunkFinishedWaiting] = useState(false);
  
  // Initialize audio session on mount
  useEffect(() => {
    setupAudioSession();
    
    // Cleanup on unmount
    return () => {
      cleanupSound();
    };
  }, []);
  
  // Add this effect to handle when full audio becomes ready while chunk is waiting
  useEffect(() => {
    const handleFullAudioReady = async () => {
      if (fullAudioReady && chunkFinishedWaiting) {
        console.log('[useAudio] Full audio now ready and chunk was waiting');
        setIsLoading(false); // Clear loading state
        setChunkFinishedWaiting(false); // Reset waiting flag
        await transitionToFullAudio(); // Transition to full audio
      }
    };
    
    handleFullAudioReady();
  }, [fullAudioReady, chunkFinishedWaiting]);
  
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
        console.log('[useAudio] Unloading primary sound');
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      
      if (fullSoundRef.current) {
        console.log('[useAudio] Unloading full sound');
        await fullSoundRef.current.unloadAsync();
        fullSoundRef.current = null;
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
      
      // Reset all states
      setIsLoading(true);
      setError(null);
      setPosition(0);
      setDuration(0);
      setFullAudioReady(false);
      setIsChunkMode(true);
      setChunkFinishedWaiting(false); // Reset the waiting flag
      
      console.log('[useAudio] Getting audio chunk for immediate playback...');
      // Get the first chunk for immediate playback
      const chunkAudioData = await getAudioContent(content, selectedTab, 'chunk');
      
      // Save chunk to file
      const chunkFileUri = FileSystem.documentDirectory + 'temp_audio_chunk.mp3';
      const chunkBase64Data = arrayBufferToBase64(chunkAudioData);
      
      console.log('[useAudio] Writing chunk audio to file...');
      await FileSystem.writeAsStringAsync(
        chunkFileUri,
        chunkBase64Data,
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      console.log('[useAudio] Creating chunk sound object...');
      // Create sound object for the chunk
      const { sound: chunkSound } = await Audio.Sound.createAsync(
        { uri: chunkFileUri },
        { progressUpdateIntervalMillis: 300 },
        onChunkPlaybackStatusUpdate
      );
      
      soundRef.current = chunkSound;
      
      // Start playing the chunk immediately
      console.log('[useAudio] Playing chunk sound...');
      await chunkSound.playAsync();
      setIsPlaying(true);
      setIsLoading(false);
      
      // Now load the full audio in the background
      loadFullAudioInBackground(content, selectedTab);
      
    } catch (err) {
      console.error('[useAudio] Error playing audio chunk:', err);
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to play audio chunk');
      
      // If chunk fails, try loading full directly
      try {
        console.log('[useAudio] Chunk failed, falling back to full audio...');
        setIsLoading(true);
        await loadAndPlayFullAudio(content, selectedTab);
      } catch (fallbackErr) {
        console.error('[useAudio] Fallback to full audio also failed:', fallbackErr);
        setIsLoading(false);
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to play audio');
      }
    }
  };
  
  const loadFullAudioInBackground = async (content: StudyMaterials, selectedTab: string) => {
    try {
      setIsLoadingFull(true);
      
      console.log('[useAudio] Loading full audio in background...');
      const fullAudioData = await getAudioContent(content, selectedTab, 'full');
      
      // Save full audio to file
      const fullFileUri = FileSystem.documentDirectory + 'temp_audio_full.mp3';
      const fullBase64Data = arrayBufferToBase64(fullAudioData);
      
      console.log('[useAudio] Writing full audio to file...');
      await FileSystem.writeAsStringAsync(
        fullFileUri,
        fullBase64Data,
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      // Create a sound object for the full audio but don't play it yet
      const { sound: fullSound } = await Audio.Sound.createAsync(
        { uri: fullFileUri },
        { progressUpdateIntervalMillis: 300 },
        onFullPlaybackStatusUpdate
      );
      
      fullSoundRef.current = fullSound;
      setFullAudioReady(true);
      setIsLoadingFull(false);
      
      console.log('[useAudio] Full audio ready. Will transition at appropriate time.');
      
      // Check if the chunk has finished playing and is waiting for full audio
      if (chunkFinishedWaiting) {
        console.log('[useAudio] Chunk already finished, transitioning now');
        setIsLoading(false);
        await transitionToFullAudio();
      } 
      // Check if the chunk is already done but not explicitly waiting
      else if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded && (!status.isPlaying || status.didJustFinish)) {
          console.log('[useAudio] Chunk not playing, transitioning now');
          await transitionToFullAudio();
        }
      }
    } catch (err) {
      console.error('[useAudio] Error loading full audio in background:', err);
      setIsLoadingFull(false);
      
      // If there was an error loading full audio and the chunk has already finished,
      // we need to clear the loading state to avoid being stuck
      if (chunkFinishedWaiting) {
        console.log('[useAudio] Error loading full audio and chunk was waiting. Clearing loading state.');
        setIsLoading(false);
        setChunkFinishedWaiting(false);
      }
    }
  };
  
  const loadAndPlayFullAudio = async (content: StudyMaterials, selectedTab: string) => {
    // This is for direct full audio playback or fallback
    try {
      console.log('[useAudio] Loading full audio directly...');
      const fullAudioData = await getAudioContent(content, selectedTab, 'full');
      
      // Save to file
      const fileUri = FileSystem.documentDirectory + 'temp_audio_full.mp3';
      const base64Data = arrayBufferToBase64(fullAudioData);
      
      await FileSystem.writeAsStringAsync(
        fileUri,
        base64Data,
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { progressUpdateIntervalMillis: 300 },
        onPlaybackStatusUpdate
      );
      
      soundRef.current = newSound;
      setIsChunkMode(false);
      
      // Get initial status to set duration
      const status = await newSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setDuration(status.durationMillis);
      }
      
      await newSound.playAsync();
      setIsPlaying(true);
      setIsLoading(false);
    } catch (err) {
      console.error('[useAudio] Error in loadAndPlayFullAudio:', err);
      throw err;
    }
  };
  
  const transitionToFullAudio = async () => {
    try {
      // Clear waiting flag regardless of outcome
      setChunkFinishedWaiting(false);
      
      if (!fullSoundRef.current || !fullAudioReady) {
        console.log('[useAudio] Cannot transition: full audio not ready');
        return;
      }
      
      // Get current position from the chunk audio
      let currentPosition = 0;
      if (soundRef.current) {
        try {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded) {
            currentPosition = status.positionMillis;
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
          }
        } catch (err) {
          console.error('[useAudio] Error getting chunk status:', err);
        }
      }
      
      console.log(`[useAudio] Transitioning to full audio at position ${currentPosition}ms`);
      
      // Set the position of the full audio
      await fullSoundRef.current.setPositionAsync(currentPosition);
      
      // Start playing the full audio
      await fullSoundRef.current.playAsync();
      
      // Swap the references
      soundRef.current = fullSoundRef.current;
      fullSoundRef.current = null;
      setIsChunkMode(false);
      
      console.log('[useAudio] Transitioned to full audio successfully');
    } catch (err) {
      console.error('[useAudio] Error transitioning to full audio:', err);
      
      // Ensure we're not stuck in a loading state
      setIsLoading(false);
    }
  };
  
  const onChunkPlaybackStatusUpdate = async (status: any) => {
    if (status.isLoaded) {
      // Update state based on the chunk's status
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      if (status.durationMillis) {
        setDuration(status.durationMillis);
      }
      
      // When chunk finishes playing, transition to full audio if it's ready
      if (status.didJustFinish) {
        if (fullAudioReady) {
          console.log('[useAudio] Chunk finished, transitioning to full audio');
          await transitionToFullAudio();
        } else {
          // If chunk finished but full audio not ready yet, show loading
          console.log('[useAudio] Chunk finished, waiting for full audio...');
          setIsLoading(true);
          setChunkFinishedWaiting(true); // Set the waiting flag
        }
      }
    }
  };
  
  const onFullPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && !isChunkMode) {
      // Only update from full audio when we're in full mode
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      
      if (status.durationMillis && duration !== status.durationMillis) {
        setDuration(status.durationMillis);
      }
      
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };
  
  // Update the original callback to work with both modes
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      // Update state
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis);
      
      if (status.durationMillis && duration !== status.durationMillis) {
        setDuration(status.durationMillis);
      }
      
      if (status.didJustFinish) {
        setIsPlaying(false);
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
        
        // If we're in chunk mode and seeking past its end, switch to full if available
        if (isChunkMode && fullAudioReady) {
          const status = await soundRef.current.getStatusAsync();
          if (status.isLoaded && status.durationMillis && millis >= status.durationMillis) {
            await transitionToFullAudio();
          }
        }
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
    isLoadingFull,
    error,
    position,
    duration,
    formattedPosition: formatTime(position),
    formattedDuration: formatTime(duration),
    isChunkMode
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