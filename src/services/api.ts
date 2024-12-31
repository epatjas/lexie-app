import axios from 'axios';
import { StudyMaterials } from '../types/types';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Server configuration
const API_URL = 'http://192.168.178.27:3000'; 

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
 * Main function to process and analyze images
 * Handles compression, validation, and server communication
 */
const processImages = async (images: Array<{ uri: string; base64?: string }>) => {
  try {
    console.log('[Client] Processing images:', images.length);
    
    // Input validation
    if (!images || images.length === 0) {
      throw new Error('No images provided');
    }

    // Process each image in parallel
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

    console.log(`[Client] Sending ${validImages.length} processed images to server`);
    
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

    console.log('[Client] Server response received');
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
 * Public API function to analyze images
 * Returns study materials generated from the images
 */
export const analyzeImages = async (
  images: Array<{ uri: string; base64?: string }>
): Promise<StudyMaterials> => {
  console.log('[Client] Starting image analysis at', new Date().toISOString());
  return processImages(images);
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
