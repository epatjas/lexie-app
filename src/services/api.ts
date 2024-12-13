import axios from 'axios';
import { StudyMaterials } from '../types/types';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const API_URL = 'http://192.168.1.103:3000'; 

// Add interface for raw section data
interface RawSection {
  type: string;
  level?: number;
  content?: string;
  style?: string;
  items?: string[];
  term?: string;
  definition?: string;
}

// Add this function before sending to server
const optimizeImage = async (base64Image: string) => {
  try {
    // First convert base64 to asset uri
    const asset = { uri: `data:image/jpeg;base64,${base64Image}` };
    
    const result = await manipulateAsync(
      asset.uri,
      [{ resize: { width: 1500 } }],
      { 
        compress: 0.8, 
        format: SaveFormat.JPEG,
        base64: true
      }
    );

    return result.base64;
  } catch (err: any) {
    console.error('[Client] Image optimization failed:', err);
    console.error('[Client] Error details:', {
      errorMessage: err.message,
      errorName: err.name,
      errorStack: err.stack
    });
    return base64Image;
  }
};

const isValidBase64 = (str: string) => {
  try {
    return btoa(atob(str)) === str;
  } catch (err) {
    return false;
  }
};

export const analyzeImage = async (base64Images: string[]): Promise<StudyMaterials> => {
  const startTime = performance.now();
  try {
    console.log(`[Client] Starting image analysis at ${new Date().toISOString()}`);
    console.log(`[Client] Sending ${base64Images.length} images to server...`);
    
    const response = await axios.post(`${API_URL}/analyze`, {
      images: base64Images
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000, // 2 minutes
    });
    
    const endTime = performance.now();
    console.log(`[Client] Total processing time: ${((endTime - startTime)/1000).toFixed(2)} seconds`);
    
    // Log the raw response for debugging
    console.log('Raw server response:', response.data);

    // Extract the content from the OpenAI response
    const rawResponse = response.data;
    
    // Validate the response structure
    if (!rawResponse || typeof rawResponse !== 'object') {
      console.error('Invalid response format (not an object):', rawResponse);
      throw new Error('Invalid response format from server');
    }

    if (!rawResponse.title || !rawResponse.text_content) {
      console.error('Missing required fields in response:', rawResponse);
      throw new Error('Missing required fields in server response');
    }

    // Convert the response to our StudyMaterials format
    const studyMaterials: StudyMaterials = {
      title: rawResponse.title,
      text_content: {
        raw_text: typeof rawResponse.text_content === 'string' 
          ? rawResponse.text_content 
          : rawResponse.text_content.raw_text || '',
        sections: Array.isArray(rawResponse.text_content.sections) 
          ? rawResponse.text_content.sections.map((section: RawSection) => ({
              ...section,
              type: validateSectionType(section.type),
              style: section.style ? validateListStyle(section.style) : undefined
            }))
          : []
      },
      flashcards: Array.isArray(rawResponse.flashcards) 
        ? rawResponse.flashcards 
        : [],
      quiz: Array.isArray(rawResponse.quiz) 
        ? rawResponse.quiz 
        : []
    };

    console.log('Parsed study materials:', studyMaterials);
    return studyMaterials;
    
  } catch (error) {
    console.error('[Client] API Error:', error);
    
    // Handle different error cases with user-friendly messages
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        throw new Error('Kuvien analysointi kesti liian kauan. Kokeile uudelleen.');
      }
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Yhteyttä palvelimeen ei saatu. Tarkista internet-yhteys ja yritä uudelleen.');
      }

      if (error.response?.status === 500) {
        throw new Error('Kuvien analysoinnissa tapahtui virhe. Yritä uudelleen tai kokeile eri kuvia.');
      }

      if (error.response?.status === 413) {
        throw new Error('Kuvat ovat liian suuria. Yritä ottaa kuvat uudelleen lähempää.');
      }
    }

    // Generic error message as fallback
    throw new Error('Jotain meni pieleen. Yritä uudelleen.');
  }
};

// Helper functions for type validation
const validateSectionType = (type: string): 'heading' | 'paragraph' | 'list' | 'quote' | 'definition' => {
  const validTypes = ['heading', 'paragraph', 'list', 'quote', 'definition'] as const;
  return validTypes.includes(type as any) ? type as any : 'paragraph';
};

const validateListStyle = (style: string): 'bullet' | 'numbered' => {
  return style === 'numbered' ? 'numbered' : 'bullet';
};

// Add this function to test basic connectivity
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
