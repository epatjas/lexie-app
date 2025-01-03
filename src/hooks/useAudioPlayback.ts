import { useState, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import { API_URL } from '../services/api';
import * as FileSystem from 'expo-file-system';

interface UseAudioPlaybackProps {
  text: string;
}

interface UseAudioPlaybackReturn {
  isPlaying: boolean;
  currentTime: number;
  togglePlayback: () => Promise<void>;
  error: string | null;
  isLoading: boolean;
  progress: number;
  isLoadingFull: boolean;
}

export const useAudioPlayback = ({ text }: UseAudioPlaybackProps): UseAudioPlaybackReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const audioUriRef = useRef<string | null>(null);

  // Pre-fetch audio when component mounts
  useEffect(() => {
    let isMounted = true;

    const prefetchAudio = async () => {
      try {
        const response = await fetch(`${API_URL}/tts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: text.slice(0, 4096) }),
        });

        if (!response.ok || !isMounted) return;

        const arrayBuffer = await response.arrayBuffer();
        const base64Data = arrayBufferToBase64(arrayBuffer);
        const fileUri = `${FileSystem.cacheDirectory}temp_audio_${Date.now()}.mp3`;
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (isMounted) {
          audioUriRef.current = fileUri;
          console.log('[Audio] Pre-fetched and ready');
        }
      } catch (error) {
        console.error('[Audio] Pre-fetch error:', error);
      }
    };

    prefetchAudio();
    return () => { isMounted = false; };
  }, [text]);

  const startTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(async () => {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if ('isLoaded' in status && status.isLoaded) {
          setCurrentTime(Math.floor(status.positionMillis / 1000));
        }
      }
    }, 1000);
  };

  const loadFullAudio = async (fileUri: string) => {
    try {
      // Get the full text audio
      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: text.slice(0, 4096),
          type: 'full'
        }),
      });

      if (!response.ok) return;

      const audioBlob = await response.blob();
      const base64Data = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          }
        };
        reader.readAsDataURL(audioBlob);
      });

      // Save full audio to a new file
      const fullAudioUri = `${FileSystem.cacheDirectory}temp_audio_full_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(fullAudioUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Get current playback position
      let currentPosition = 0;
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if ('isLoaded' in status && status.isLoaded) {
          currentPosition = status.positionMillis;
          await soundRef.current.unloadAsync();
        }
      }

      // Create new sound with full audio
      const { sound } = await Audio.Sound.createAsync(
        { uri: fullAudioUri },
        { shouldPlay: true, positionMillis: currentPosition },
        (status) => {
          if ('isLoaded' in status && status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        }
      );

      soundRef.current = sound;
      setIsLoadingFull(false);
      console.log('[Audio] Switched to full version');

    } catch (error) {
      console.error('[Audio] Full audio load error:', error);
      setIsLoadingFull(false);
    }
  };

  const togglePlayback = async () => {
    try {
      setError(null);
      
      if (isPlaying && soundRef.current) {
        await soundRef.current.pauseAsync();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsPlaying(false);
        return;
      }

      setIsLoading(true);

      // If we have pre-fetched audio, use it
      if (audioUriRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUriRef.current },
          { shouldPlay: true },
          (status) => {
            if ('isLoaded' in status && status.isLoaded && status.didJustFinish) {
              setIsPlaying(false);
              setCurrentTime(0);
            }
          }
        );

        soundRef.current = sound;
        startTimeTracking();
        setIsPlaying(true);
        setIsLoading(false);
        return;
      }

      const startTime = Date.now();
      console.log('[Audio] Starting audio request...');
      setIsLoading(true);
      setProgress(0);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const fileUri = `${FileSystem.cacheDirectory}temp_audio_${Date.now()}.mp3`;
      
      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.slice(0, 4096) }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }

      // Get the audio data directly as an array buffer
      const arrayBuffer = await response.arrayBuffer();
      console.log(`[Audio] Received ${arrayBuffer.byteLength} bytes`);
      setProgress(50);

      // Convert to base64 and save to file
      const base64Data = arrayBufferToBase64(arrayBuffer);
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log(`[Audio] File saved after ${Date.now() - startTime}ms`);
      setProgress(75);

      // Create and play sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
        (status) => {
          if ('isLoaded' in status && status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setCurrentTime(0);
          }
        }
      );

      soundRef.current = sound;
      startTimeTracking();
      setIsPlaying(true);
      setIsLoading(false);
      setProgress(100);
      console.log(`[Audio] Total time: ${Date.now() - startTime}ms`);

    } catch (error) {
      console.error('[Audio] Playback error:', error);
      setError(error instanceof Error ? error.message : 'Failed to play audio');
      setIsLoading(false);
      setProgress(0);
    }
  };

  // Helper function to convert ArrayBuffer to base64
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  return {
    isPlaying,
    currentTime,
    togglePlayback,
    error,
    isLoading,
    progress,
    isLoadingFull,
  };
}; 