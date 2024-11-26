import axios from 'axios';
import { StudyMaterials } from '../types/types';

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

export const analyzeImage = async (base64Image: string): Promise<StudyMaterials> => {
  try {
    console.log('Sending image to server...');
    const response = await axios.post<ApiResponse>(`${API_URL}/analyze`, {
      image: base64Image
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });
    
    // Extract the JSON content from the response
    const content = response.data.choices[0].message.content;
    // Remove the ```json and ``` wrapper if present
    const jsonString = content.replace(/```json\n|\n```/g, '');
    // Parse the JSON string into an object
    const studyMaterials = JSON.parse(jsonString);
    
    console.log('Parsed study materials:', studyMaterials);
    return studyMaterials;
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
