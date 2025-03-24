import axios from 'axios';
import { StudyMaterials, StudySet, HomeworkHelp } from '../types/types';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { getDatabase } from '../services/Database';

// Server configuration
const DEV_API_URL = 'http://192.168.178.27:3000';
const PROD_API_URL = 'https://lexie-server.onrender.com';

// Determine if we're in development or production
const isDevelopment = __DEV__;

// Export the API URL based on environment
export const API_URL = isDevelopment ? DEV_API_URL : PROD_API_URL;

// Add this debug log to verify the environment
console.log('[Client] Environment:', {
  isDevelopment: __DEV__,
  apiUrl: API_URL,
  buildDate: new Date().toISOString()
});

// Helper function to calculate size of base64 string
// Used for logging compression results
const calculateBase64Size = (base64String: string): number => {
  const base64 = base64String.split('base64,').pop() || base64String;
  // Each base64 character represents 6 bits, so 4 chars = 3 bytes
  return Math.ceil(base64.length * 0.75);
};

// Add at the top with other utilities
const logImageDetails = (base64: string, label: string) => {
  const size = calculateBase64Size(base64) / (1024 * 1024);
  const dimensions = base64.length; // We could decode and get actual dimensions if needed
  console.log(`[Client] ${label}:`, {
    size: `${size.toFixed(2)}MB`,
    dataLength: dimensions
  });
};

/**
 * Compresses an image while maintaining text readability
 * Uses a two-step compression strategy if needed
 */
const compressImage = async (base64Image: string): Promise<string> => {
  try {
    // Log initial size
    const initialSize = calculateBase64Size(base64Image) / (1024 * 1024);
    console.log(`[Client] Original image size: ${initialSize.toFixed(2)}MB`);

    // First compression attempt with text-optimized settings
    const result = await manipulateAsync(
      `data:image/jpeg;base64,${base64Image}`,
      [
        { resize: { width: 1024 } },
        { rotate: 0 }
      ],
      { 
        compress: 0.5,
        format: SaveFormat.JPEG,
        base64: true
      }
    );

    if (!result.base64) {
      throw new Error('Image compression failed - no base64 output');
    }

    // Clean base64 string
    const base64Data = result.base64.replace(/^data:image\/\w+;base64,/, '');
    const compressedSize = calculateBase64Size(base64Data) / (1024 * 1024);
    
    console.log(`[Client] First compression attempt:`, {
      originalSize: `${initialSize.toFixed(2)}MB`,
      compressedSize: `${compressedSize.toFixed(2)}MB`,
      reduction: `${((1 - compressedSize / initialSize) * 100).toFixed(1)}%`
    });

    // If still too large, try more aggressive compression
    if (compressedSize > 1) {
      console.log('[Client] Attempting aggressive compression');
      const aggressiveResult = await manipulateAsync(
        result.uri, // Use the result from first compression
        [
          { resize: { width: 800 } }
        ],
        { 
          compress: 0.3,
          format: SaveFormat.JPEG,
          base64: true
        }
      );
      
      if (!aggressiveResult.base64) {
        throw new Error('Aggressive compression failed');
      }
      
      const aggressiveBase64 = aggressiveResult.base64.replace(/^data:image\/\w+;base64,/, '');
      const finalSize = calculateBase64Size(aggressiveBase64) / (1024 * 1024);
      
      console.log('[Client] Aggressive compression result:', {
        finalSize: `${finalSize.toFixed(2)}MB`,
        totalReduction: `${((1 - finalSize / initialSize) * 100).toFixed(1)}%`
      });
      
      return aggressiveBase64;
    }

    return base64Data;
  } catch (err) {
    console.error('[Client] Image compression failed:', err);
    console.error('Error details:', err instanceof Error ? err.message : err);
    throw err;
  }
};

/**
 * Public API function to analyze images
 * Returns study materials or homework help based on content
 */
export const analyzeImages = async (
  images: Array<{ uri: string; base64?: string }>
): Promise<StudyMaterials> => {
  console.log('[Client] Starting image analysis at', new Date().toISOString());
  
  try {
    console.log('[Client] Processing images:', images.length);
    
    // Input validation
    if (!images || images.length === 0) {
      throw new Error('No images provided');
    }

    // Process and compress images
    const processedImages = await Promise.all(images.map(async (image, index) => {
      if (!image.base64) {
        console.warn(`[Client] No base64 data for image ${index + 1}`);
        return null;
      }

      try {
        const compressedBase64 = await compressImage(image.base64);
        console.log(`[Client] Image ${index + 1} compressed successfully`);
        return compressedBase64;
      } catch (err) {
        console.error(`[Client] Failed to process image ${index + 1}:`, err);
        return null;
      }
    }));

    // Filter out any failed compressions
    const validImages = processedImages.filter(img => img !== null);
    
    if (validImages.length === 0) {
      throw new Error('No valid images after processing');
    }

    // Send to server for analysis
    const response = await axios.post(`${API_URL}/analyze`, {
      images: validImages
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minute timeout
      onUploadProgress: (progressEvent) => {
        console.log('[Client] Upload progress:', {
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          progress: progressEvent.total ? (progressEvent.loaded / progressEvent.total) * 100 : 0
        });
      }
    });

    console.log('[Client] Server response received, content type:', response.data.contentType);
    
    // Ensure proper type discrimination with contentType
    if (response.data.contentType === 'study-set') {
      const studyMaterials: StudySet = {
        title: response.data.title,
        text_content: response.data.text_content,
        contentType: 'study-set' as const,
        introduction: response.data.introduction || '',
        summary: response.data.summary || '',
        flashcards: response.data.flashcards || [],
        quiz: response.data.quiz || [],
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        processingId: response.data.processingId
      };
      
      return studyMaterials;
    } else if (response.data.contentType === 'homework-help') {
      const homeworkHelp: HomeworkHelp = {
        title: response.data.title,
        text_content: response.data.text_content,
        contentType: 'homework-help' as const,
        introduction: response.data.introduction || '',
        homeworkHelp: response.data.homeworkHelp,
        created_at: response.data.created_at,
        updated_at: response.data.updated_at,
        processingId: response.data.processingId
      };
      
      // Log to verify correct content type is being returned
      console.log('[Client] Returning homework help with content type:', homeworkHelp.contentType);
      
      return homeworkHelp;
    }
    
    // Default fallback
    return response.data;
  } catch (error) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error('[Client] API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('[Client] Non-Axios error:', error);
    }
    throw error;
  }
};

/**
 * Tests basic server connectivity
 * Useful for debugging connection issues
 */
export const testServerConnection = async () => {
  try {
    const response = await axios.get(`${API_URL}/ping`);
    console.log('[Client] Server test response:', response.data);
    return true;
  } catch (error) {
    console.error('[Client] Server test failed:', error);
    return false;
  }
};

export const getProcessingStatus = async (processingId: string) => {
  const response = await fetch(`${API_URL}/processing-status/${processingId}`);
  return response.json();
};

/**
 * Processes images for homework help
 * Uses the same image processing pipeline as analyzeImages
 */
export const getHomeworkHelp = async (
  images: Array<{ uri: string; base64?: string }>
): Promise<HomeworkHelp> => {
  console.log('[Client] Starting homework help at', new Date().toISOString());
  
  try {
    console.log('[Client] Processing images:', images.length);
    
    // Input validation
    if (!images || images.length === 0) {
      throw new Error('No images provided');
    }

    // Process each image in parallel - reuse existing compression function
    const processedImages = await Promise.all(images.map(async (image, index) => {
      console.log(`[Client] Processing image ${index + 1}/${images.length}`);
      
      if (!image.base64) {
        console.warn(`[Client] No base64 data for image ${index + 1}`);
        return null;
      }

      try {
        const compressedBase64 = await compressImage(image.base64);
        console.log(`[Client] Image ${index + 1} compressed successfully`);
        return compressedBase64;
      } catch (err) {
        console.error(`[Client] Failed to process image ${index + 1}:`, err);
        return null;
      }
    }));

    // Filter out any failed compressions
    const validImages = processedImages.filter(img => img !== null);
    
    if (validImages.length === 0) {
      throw new Error('No valid images after processing');
    }

    console.log(`[Client] Sending ${validImages.length} processed images to server for homework help`);
    
    // Send to server for homework help analysis - note the different endpoint
    const response = await axios.post(`${API_URL}/homework-help`, {
      images: validImages
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minute timeout
      onUploadProgress: (progressEvent) => {
        console.log('[Client] Upload progress:', {
          loaded: progressEvent.loaded,
          total: progressEvent.total,
          progress: progressEvent.total ? (progressEvent.loaded / progressEvent.total) * 100 : 0
        });
      }
    });

    console.log('[Client] Server response received for homework help');
    return response.data;

  } catch (error) {
    // Enhanced error logging
    if (axios.isAxiosError(error)) {
      console.error('[Client] API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('[Client] Non-Axios error:', error);
    }
    throw error;
  }
};

// Add a helper method to get the next concept card (for progressive revelation)
export const getNextConceptCard = async (homeworkHelpId: string, currentCardNumber: number) => {
  try {
    const response = await axios.get(`${API_URL}/next-concept-card/${homeworkHelpId}/${currentCardNumber}`);
    return response.data;
  } catch (error) {
    console.error('[Client] Failed to get next concept card:', error);
    throw error;
  }
};

// Add a method to request a hint for a specific concept
export const getAdditionalHint = async (homeworkHelpId: string, cardNumber: number) => {
  try {
    const response = await axios.post(`${API_URL}/additional-hint`, {
      homeworkHelpId,
      cardNumber
    });
    return response.data;
  } catch (error) {
    console.error('[Client] Failed to get additional hint:', error);
    throw error;
  }
};

// Function to get audio content - update to handle new format
export const getAudioContent = async (
  content: StudyMaterials,
  selectedTab: string = 'summary'
): Promise<ArrayBuffer> => {
  let textToSpeak = '';
  let language = 'en'; // Default language
  
  // Determine which text to speak based on content type and tab
  if (content.contentType === 'study-set') {
    // For study sets, use different text based on selected tab
    if (selectedTab === 'summary') {
      textToSpeak = content.summary || '';
      console.log('[Client] Playing summary audio');
    } else if (selectedTab === 'original') {
      textToSpeak = content.text_content.raw_text || '';
      console.log('[Client] Playing transcription audio');
    }
  } else if (content.contentType === 'homework-help') {
    // Check if content is Finnish
    const isFinnish = content.text_content.raw_text.match(/[äöåÄÖÅ]/) || 
        content.homeworkHelp?.language === 'fi' || 
        content.homeworkHelp?.subject_area?.toLowerCase().includes('suomi');
    
    if (isFinnish) {
      language = 'fi';
      console.log('[Client] Detected Finnish homework content');
      
      // Support both new and old formats
      if (content.homeworkHelp?.problem_summary) {
        // New format - using full problem summary
        textToSpeak = content.homeworkHelp.problem_summary;
        
        // Add debug log to check what's being used for TTS
        console.log('[Client] Using problem_summary for TTS, length:', 
          textToSpeak.length, 
          'First 50 chars:', 
          textToSpeak.substring(0, 50)
        );
        
        // Add concept card titles if available
        if (content.homeworkHelp.concept_cards && content.homeworkHelp.concept_cards.length > 0) {
          textToSpeak += '. Apukortit: ';
          content.homeworkHelp.concept_cards.forEach((card, index) => {
            textToSpeak += `${index + 1}. ${card.title}. `;
          });
        }
      } else {
        // Old format
        const facts = content.homeworkHelp?.assignment?.facts || [];
        const objective = content.homeworkHelp?.assignment?.objective || '';
        textToSpeak = facts.join('. ');
        if (objective) {
          textToSpeak += '. ' + objective;
        }
      }
    } else {
      // For English content
      if (content.homeworkHelp?.problem_summary) {
        // New format
        textToSpeak = content.homeworkHelp.problem_summary;
        
        // Add concept card titles if available
        if (content.homeworkHelp.concept_cards && content.homeworkHelp.concept_cards.length > 0) {
          textToSpeak += '. Concept cards: ';
          content.homeworkHelp.concept_cards.forEach((card, index) => {
            textToSpeak += `${index + 1}. ${card.title}. `;
          });
        }
      } else {
        // Old format
        const facts = content.homeworkHelp?.assignment?.facts || [];
        const objective = content.homeworkHelp?.assignment?.objective || '';
        textToSpeak = [...facts, objective].filter(Boolean).join('. ');
      }
    }
  }
  
  // Call the TTS endpoint
  try {
    const response = await axios.post(
      `${API_URL}/tts`,
      { 
        text: textToSpeak,
        language: language 
      },
      { responseType: 'arraybuffer' }
    );
    
    return response.data;
  } catch (error) {
    console.error('[Client] Failed to get audio content:', error);
    throw error;
  }
}

/**
 * Sends a chat message to the server and gets a response
 */
export const sendChatMessage = async (
  message: string,
  sessionId: string,
  contentId: string,
  contentType: 'study-set' | 'homework-help',
  contentContext: StudySet | HomeworkHelp,
  messageHistory: Array<{ role: 'user' | 'assistant', content: string }> = []
): Promise<{response: string}> => {
  try {
    console.log('[API] Sending chat message:', {
      messagePreview: message.substring(0, 50),
      contentType,
      contentId,
      hasContext: !!contentContext,
      messageCount: messageHistory.length
    });

    const response = await axios.post(`${API_URL}/chat`, {
      message,
      sessionId,
      contentId,
      contentType,
      contentContext,
      messageHistory
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('[API] Chat response received');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('[API] Chat API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
    } else {
      console.error('[API] Non-Axios error:', error);
    }
    throw error;
  }
};
