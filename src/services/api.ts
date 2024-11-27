import axios from 'axios';
import { StudyMaterials, Flashcard, QuizQuestion } from '../types/types';

const API_URL = 'http://192.168.1.103:3000'; 

interface ApiResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  created: number;
  id: string;
  model: string;
  object: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface StudyMaterialsResponse {
  title: string;
  text_content: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
}

export const analyzeImage = async (base64Image: string): Promise<StudyMaterials> => {
  try {
    console.log('Sending image to server...');
    const response = await axios.post<ApiResponse>(`${API_URL}/analyze`, {
      image: base64Image
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000
    });
    
    const content = response.data.choices[0].message.content;
    const jsonString = content.replace(/```json\n|\n```/g, '');
    const studyMaterials: StudyMaterialsResponse = JSON.parse(jsonString);
    
    console.log('Raw flashcards from API:', studyMaterials.flashcards);
    
    // Ensure flashcards are properly structured
    const mappedMaterials: StudyMaterials = {
      title: studyMaterials.title,
      text_content: studyMaterials.text_content,
      flashcards: studyMaterials.flashcards.map(card => ({
        front: card.front,
        back: card.back
      })),
      quiz: studyMaterials.quiz
    };
    
    console.log('Mapped flashcards:', mappedMaterials.flashcards);
    return mappedMaterials;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Detailed API error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
    } else {
      console.error('Error parsing response:', error);
    }
    throw error;
  }
};
