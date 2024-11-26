import axios from 'axios';
import { StudyMaterials } from '../types/types';

const API_URL = 'http://localhost:3000'; // Change this to your server URL in production

interface ApiResponse {
  title: string;
  text: string;
  flashcards: Array<{
    front: string;
    back: string;
  }>;
  quiz: Array<{
    question: string;
    options: string[];
    correctAnswer: string;
  }>;
}

export const analyzeImage = async (base64Image: string): Promise<StudyMaterials> => {
  try {
    const response = await axios.post<ApiResponse>(`${API_URL}/analyze`, {
      image: base64Image
    });
    
    return response.data;
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to analyze image');
  }
};
