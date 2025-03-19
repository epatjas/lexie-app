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
  seek: (seconds: number) => Promise<void>;
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

  // Add new refs for request management
  const loadingChunksRef = useRef<Set<number>>(new Set());
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxRetries = 3;

  // Add rate limiting refs
  const lastRequestTimeRef = useRef<number>(0);
  const minRequestInterval = 1000; // 1 second between requests
  const maxWaitTime = 10000; // Maximum 10 seconds wait time
  const baseWaitTime = 2000; // Base wait time of 2 seconds

  // Add a cache for loaded chunks
  const loadedChunksRef = useRef<Map<number, string>>(new Map());

  // Add a ref to track active file paths
  const activeFilesRef = useRef<Set<string>>(new Set());

  // Helper function to wait for rate limit
  const waitForRateLimit = async () => {
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTimeRef.current;
    
    if (timeSinceLastRequest < minRequestInterval) {
      const waitTime = minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    lastRequestTimeRef.current = Date.now();
  };

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
    if (nextIndex >= chunksRef.current.length || 
        loadingChunksRef.current.has(nextIndex) || 
        nextChunkRef.current) return;

    try {
      const nextUri = await loadNextChunk(nextIndex);
      if (nextUri) {
        nextChunkRef.current = nextUri;
      }
    } catch (error) {
      console.error('[Audio] Preload error:', error);
    }
  };

  // Helper function to get a valid file path
  const getAudioFilePath = (chunkIndex: number): string => {
    return `${FileSystem.cacheDirectory || ''}audio_chunk_${chunkIndex}_${Date.now()}.mp3`;
  };

  // Helper function to ensure file exists
  const ensureFileExists = async (uri: string): Promise<boolean> => {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return fileInfo.exists;
    } catch (error) {
      console.error('[Audio] File check error:', error);
      return false;
    }
  };

  // Update loadNextChunk to explicitly return string | null
  const loadNextChunk = async (index?: number, retryCount: number = 0): Promise<string | null> => {
    const chunkIndex = index ?? currentChunkRef.current;
    
    if (chunkIndex >= chunksRef.current.length) return null;
    if (loadingChunksRef.current.has(chunkIndex)) return null;

    // Check if chunk is already loaded
    const cachedUri = loadedChunksRef.current.get(chunkIndex);
    if (cachedUri && await ensureFileExists(cachedUri)) {
      console.log(`[Audio] Using cached chunk ${chunkIndex + 1}`);
      return cachedUri;
    }

    try {
      console.log(`[Audio] Loading chunk ${chunkIndex + 1}, attempt ${retryCount + 1}`);
      loadingChunksRef.current.add(chunkIndex);

      const chunkText = chunksRef.current[chunkIndex];
      if (!chunkText || chunkText.trim().length === 0) {
        console.error('[Audio] Empty chunk detected');
        return null;
      }

      // Wait for rate limit before making request
      await waitForRateLimit();

      const response = await fetch(`${API_URL}/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: chunkText,
          type: 'chunk' 
        }),
      });

      if (!response.ok) {
        console.error(`[Audio] Server responded with status ${response.status}`);
        if (response.status === 429) {
          // Use a more reasonable wait time for rate limits
          const waitTime = Math.min(
            baseWaitTime * Math.pow(2, retryCount),
            maxWaitTime
          );
          console.log(`[Audio] Rate limited. Waiting ${waitTime}ms before retry`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return loadNextChunk(chunkIndex, retryCount + 1);
        } else if (retryCount < maxRetries) {
          const retryDelay = Math.min(1000 * Math.pow(2, retryCount), 5000);
          console.log(`[Audio] Retrying after ${retryDelay}ms`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return loadNextChunk(chunkIndex, retryCount + 1);
        }
        throw new Error(`Server error: ${response.status}`);
      }

      const totalChunks = response.headers.get('X-Total-Chunks');
      totalChunksRef.current = totalChunks ? parseInt(totalChunks) : chunksRef.current.length;
      
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Received empty audio data');
      }

      console.log(`[Audio] Successfully received chunk ${chunkIndex + 1} (${arrayBuffer.byteLength} bytes)`);
      
      const base64Data = arrayBufferToBase64(arrayBuffer);
      const fileUri = getAudioFilePath(chunkIndex);
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify file was written
      if (!(await ensureFileExists(fileUri))) {
        throw new Error('Failed to write audio file');
      }

      console.log(`[Audio] Saved chunk ${chunkIndex + 1} to file:`, fileUri);
      
      // Track active file
      activeFilesRef.current.add(fileUri);
      loadedChunksRef.current.set(chunkIndex, fileUri);
      
      return fileUri;
    } catch (error) {
      console.error(`[Audio] Chunk ${chunkIndex + 1} load error:`, error);
      return null;
    } finally {
      loadingChunksRef.current.delete(chunkIndex);
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
            if (status.isPlaying && 
                status.positionMillis > (status.durationMillis || 0) / 2 && 
                currentChunkRef.current < chunksRef.current.length - 1) {
              preloadNextChunk();
            }
            
            if (status.didJustFinish) {
              console.log(`[Audio] Chunk ${currentChunkRef.current + 1} finished, duration: ${status.durationMillis}ms`);
              
              if (status.durationMillis) {
                chunkStartTimeRef.current += Math.floor(status.durationMillis / 1000);
              }
              
              currentChunkRef.current++;
              console.log(`[Audio] Moving to chunk ${currentChunkRef.current + 1}/${chunksRef.current.length}`);
              
              if (currentChunkRef.current < chunksRef.current.length) {
                // Try to get next chunk with retries
                let nextUri: string | null = null;
                let retryCount = 0;
                
                while (!nextUri && retryCount < maxRetries) {
                  try {
                    nextUri = nextChunkRef.current || await loadNextChunk(undefined, retryCount);
                    nextChunkRef.current = null;
                    
                    if (nextUri) {
                      console.log('[Audio] Starting next chunk playback');
                      await playChunk(nextUri, 0);
                      break;
                    } else {
                      console.log(`[Audio] Retry ${retryCount + 1}/${maxRetries} for next chunk`);
                      retryCount++;
                      if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                      }
                    }
                  } catch (error) {
                    console.error(`[Audio] Error loading next chunk (attempt ${retryCount + 1}):`, error);
                    retryCount++;
                    if (retryCount < maxRetries) {
                      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
                    }
                  }
                }
                
                if (!nextUri) {
                  console.error('[Audio] Failed to load next chunk after all retries');
                  setIsPlaying(false);
                  setError('Failed to load next audio chunk after multiple attempts');
                }
              } else {
                console.log('[Audio] Reached end of all chunks');
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
        // Start fresh from first chunk with retries
        let firstChunkUri: string | null = null;
        let retryCount = 0;
        
        while (!firstChunkUri && retryCount < maxRetries) {
          if (retryCount > 0) {
            // Add delay between retries
            const retryDelay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
          }
          
          firstChunkUri = await loadNextChunk(0, retryCount);
          retryCount++;
        }

        if (firstChunkUri) {
          await playChunk(firstChunkUri, 0);
          setIsPlaying(true);
        } else {
          throw new Error('Failed to load initial audio chunk after multiple attempts');
        }
      }

      setIsLoading(false);

    } catch (error) {
      console.error('[Audio] Toggle error:', error);
      setError(error instanceof Error ? error.message : 'Failed to play audio');
      setIsPlaying(false);
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

  // Clean up files when component unmounts or text changes
  const cleanupFiles = async () => {
    for (const uri of activeFilesRef.current) {
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
      } catch (error) {
        console.error('[Audio] Cleanup error:', error);
      }
    }
    activeFilesRef.current.clear();
    loadedChunksRef.current.clear();
  };

  // Update cleanup effects
  useEffect(() => {
    return () => {
      cleanupFiles();
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
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      loadingChunksRef.current.clear();
      lastRequestTimeRef.current = 0;
    };
  }, []);

  useEffect(() => {
    cleanupFiles();
    // ... existing text change cleanup code ...
  }, [text]);

  const seek = async (seconds: number) => {
    try {
      if (seconds < 0) seconds = 0;
      
      // Find the appropriate chunk based on the target time
      let targetChunk = 0;
      let targetPosition = 0;
      let accumulatedTime = 0;
      
      // We need to find which chunk contains our target time
      if (soundRef.current) {
        // First get the current status to determine current chunk duration
        const status = await soundRef.current.getStatusAsync();
        
        if ('isLoaded' in status && status.isLoaded && status.durationMillis) {
          const currentChunkDuration = Math.floor(status.durationMillis / 1000);
          
          // Calculate the target time relative to the beginning of playback
          if (seconds <= chunkStartTimeRef.current + currentChunkDuration) {
            // Target is within current chunk
            targetChunk = currentChunkRef.current;
            targetPosition = (seconds - chunkStartTimeRef.current) * 1000; // Convert to milliseconds
            
            console.log(`[Audio] Seeking within current chunk to position ${targetPosition}ms`);
            
            if (isPlaying) {
              await soundRef.current.setPositionAsync(targetPosition);
              setCurrentTime(seconds);
            } else {
              // If paused, store the position for when playback resumes
              pausedPositionRef.current = targetPosition;
              setCurrentTime(seconds);
            }
          } else {
            // Need to jump to a different chunk - this is much more complex
            // For now, we'll restart playback from the beginning as a fallback
            console.log(`[Audio] Cannot seek across chunks yet - restarting from beginning`);
            
            // Reset everything
            currentChunkRef.current = 0;
            pausedPositionRef.current = 0;
            chunkStartTimeRef.current = 0;
            
            // If playing, start fresh
            if (isPlaying) {
              const firstChunkUri = await loadNextChunk(0);
              if (firstChunkUri) {
                await playChunk(firstChunkUri, 0);
              }
            } else {
              // Just reset time if paused
              setCurrentTime(0);
            }
          }
        }
      } else {
        // No sound loaded yet, just update the time
        setCurrentTime(seconds);
        console.log(`[Audio] No sound loaded, updated time only`);
      }
    } catch (error) {
      console.error('[Audio] Seek error:', error);
      setError('Failed to seek to position');
    }
  };

  return {
    isPlaying,
    currentTime,
    togglePlayback,
    error,
    isLoading,
    progress,
    isLoadingFull,
    seek,
  };
}; 