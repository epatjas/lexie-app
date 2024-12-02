import axios from 'axios';
import { StudyMaterials } from '../types/types';

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

export const analyzeImage = async (base64Images: string[]): Promise<StudyMaterials> => {
  try {
    console.log('Sending images to server...');
    const response = await axios.post(`${API_URL}/analyze`, {
      images: base64Images
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 120000
    });
    
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
    console.error('API Error:', error);
    if (axios.isAxiosError(error)) {
      console.error('Detailed API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
    throw error;
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
