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

const splitIntoSentences = (text: string): string[] => {
  // Split on period followed by space or newline, question mark, or exclamation mark
  return text.match(/[^.!?]+[.!?]+[\s\n]*/g) || [];
};

const createOptimalChunks = (text: string, targetChunkSize: number = 5): string[] => {
  // First split by double newlines to get paragraphs
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentSentenceCount = 0;

  paragraphs.forEach(paragraph => {
    const sentences = splitIntoSentences(paragraph);
    
    sentences.forEach(sentence => {
      currentChunk.push(sentence);
      currentSentenceCount++;

      // Create a new chunk when we reach the target size or hit a paragraph break
      if (currentSentenceCount >= targetChunkSize) {
        chunks.push(currentChunk.join(''));
        currentChunk = [];
        currentSentenceCount = 0;
      }
    });

    // If we have sentences in the current chunk and hit a paragraph break,
    // create a new chunk to maintain natural pauses
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(''));
      currentChunk = [];
      currentSentenceCount = 0;
    }
  });

  // Add any remaining sentences
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(''));
  }

  return chunks.map(chunk => chunk.trim()).filter(chunk => chunk.length > 0);
};

export const useAudioPlayback = ({ text }: UseAudioPlaybackProps): UseAudioPlaybackReturn => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoadingFull, setIsLoadingFull] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioUriRef = useRef<string | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);
  const totalChunksRef = useRef(0);
  const pausedPositionRef = useRef<number>(0);
  const currentFileUriRef = useRef<string | null>(null);
  const totalElapsedTimeRef = useRef(0);
  const chunkStartTimeRef = useRef(0);

  // Update the text splitting logic
  useEffect(() => {
    if (!text) return;
    // Create chunks with approximately 5 sentences each
    chunksRef.current = createOptimalChunks(text, 5);
    console.log(`[Audio] Created ${chunksRef.current.length} chunks`);
  }, [text]);

  // Add preloading for the next chunk
  const nextChunkRef = useRef<string | null>(null);

  // Preload next chunk while current is playing
  const preloadNextChunk = async () => {
    const nextIndex = currentChunkRef.current + 1;
    if (nextIndex >= chunksRef.current.length) return;

    try {
      const nextUri = await loadNextChunk(nextIndex);
      if (nextUri) {
        nextChunkRef.current = nextUri;
      }
    } catch (error) {
      console.error('[Audio] Preload error:', error);
    }
  };

  // Update loadNextChunk to explicitly return string | null
  const loadNextChunk = async (index?: number): Promise<string | null> => {
    const chunkIndex = index ?? currentChunkRef.current;
    if (chunkIndex >= chunksRef.current.length) return null;
    
    try {
      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: chunksRef.current[chunkIndex],
          type: 'chunk' 
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch chunk');

      const totalChunks = response.headers.get('X-Total-Chunks');
      totalChunksRef.current = totalChunks ? parseInt(totalChunks) : chunksRef.current.length;
      
      const arrayBuffer = await response.arrayBuffer();
      const base64Data = arrayBufferToBase64(arrayBuffer);
      const fileUri = `${FileSystem.cacheDirectory}temp_audio_chunk_${chunkIndex}_${Date.now()}.mp3`;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return fileUri;
    } catch (error) {
      console.error('[Audio] Chunk load error:', error);
      return null;
    }
  };

  // Update playChunk to handle null return from loadNextChunk
  const playChunk = async (fileUri: string, startPosition: number = 0) => {
    try {
      console.log(`[Audio] Playing chunk ${currentChunkRef.current + 1}/${chunksRef.current.length}`);
      
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      currentFileUriRef.current = fileUri;
      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true, positionMillis: startPosition },
        async (status) => {
          if ('isLoaded' in status && status.isLoaded) {
            // Preload next chunk at halfway point
            if (status.isPlaying && 
                status.positionMillis > (status.durationMillis || 0) / 2 && 
                currentChunkRef.current < chunksRef.current.length - 1) {
              preloadNextChunk();
            }
            
            // Handle chunk completion
            if (status.didJustFinish) {
              console.log(`[Audio] Chunk ${currentChunkRef.current + 1} finished`);
              
              // Store the duration of the completed chunk
              if (status.durationMillis) {
                chunkStartTimeRef.current += Math.floor(status.durationMillis / 1000);
              }
              
              // Move to next chunk if not at the end
              currentChunkRef.current++;
              
              if (currentChunkRef.current < chunksRef.current.length) {
                console.log(`[Audio] Moving to chunk ${currentChunkRef.current + 1}`);
                
                try {
                  const nextUri = nextChunkRef.current || await loadNextChunk();
                  nextChunkRef.current = null;
                  
                  if (nextUri) {
                    console.log('[Audio] Starting next chunk playback');
                    await playChunk(nextUri, 0);
                  } else {
                    console.error('[Audio] Failed to get next chunk URI');
                    setIsPlaying(false);
                    setError('Failed to load next audio chunk');
                  }
                } catch (error) {
                  console.error('[Audio] Error during chunk transition:', error);
                  setIsPlaying(false);
                  setError('Failed to transition to next chunk');
                }
              } else {
                // End of all chunks
                console.log('[Audio] All chunks completed');
                setIsPlaying(false);
                setCurrentTime(0);
                currentChunkRef.current = 0;
                pausedPositionRef.current = 0;
                chunkStartTimeRef.current = 0;
              }
            }
          }
        }
      );

      soundRef.current = sound;
      startTimeTracking();

    } catch (error) {
      console.error('[Audio] Playback error:', error);
      setIsPlaying(false);
      setError('Failed to play audio chunk');
    }
  };

  const togglePlayback = async () => {
    try {
      setError(null);
      
      if (isPlaying && soundRef.current) {
        // Store current position before pausing
        const status = await soundRef.current.getStatusAsync();
        if ('isLoaded' in status && status.isLoaded) {
          pausedPositionRef.current = status.positionMillis;
        }
        
        await soundRef.current.pauseAsync();
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setIsPlaying(false);
        return;
      }

      setIsLoading(true);

      // If we have a paused position and file URI, resume from there
      if (pausedPositionRef.current > 0 && currentFileUriRef.current) {
        await playChunk(currentFileUriRef.current, pausedPositionRef.current);
        setIsPlaying(true);
      } else {
        // Start fresh from first chunk
        const firstChunkUri = await loadNextChunk();
        if (firstChunkUri) {
          await playChunk(firstChunkUri, 0);
          setIsPlaying(true);
        } else {
          throw new Error('Failed to load audio');
        }
      }

      setIsLoading(false);

    } catch (error) {
      console.error('[Audio] Toggle error:', error);
      setError(error instanceof Error ? error.message : 'Failed to play audio');
      setIsLoading(false);
    }
  };

  const startTimeTracking = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(async () => {
      if (soundRef.current) {
        const status = await soundRef.current.getStatusAsync();
        if ('isLoaded' in status && status.isLoaded) {
          const currentChunkTime = Math.floor(status.positionMillis / 1000);
          setCurrentTime(chunkStartTimeRef.current + currentChunkTime);
        }
      }
    }, 1000);
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

  // Reset all time counters when text changes
  useEffect(() => {
    pausedPositionRef.current = 0;
    currentFileUriRef.current = null;
    chunkStartTimeRef.current = 0;
    setCurrentTime(0);
  }, [text]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      setIsPlaying(false);
      setCurrentTime(0);
      currentChunkRef.current = 0;
      pausedPositionRef.current = 0;
      chunkStartTimeRef.current = 0;
    };
  }, []);

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