import axios from 'axios';
import { StudyMaterials, Flashcard, QuizQuestion, TextContent, TextSection } from '../types/types';

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
    const rawMaterials = JSON.parse(jsonString);
    
    // Parse the text content into sections
    const textLines = rawMaterials.text_content.split('\n');
    const sections: TextSection[] = [];
    let currentSection: TextSection | null = null;
    
    textLines.forEach((line: string) => {
      // Skip empty lines
      if (!line.trim()) return;
      
      // Check if it's a heading (followed by content)
      if (textLines[textLines.indexOf(line) + 1]?.trim() && !line.startsWith('-')) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          type: 'heading',
          level: 1,
          content: line.trim()
        };
      }
      // Check if it's a bullet point
      else if (line.trim().startsWith('-')) {
        if (!sections.find(s => s.type === 'list' && s.style === 'bullet')) {
          sections.push({
            type: 'list',
            style: 'bullet',
            items: []
          });
        }
        const listSection = sections.find(s => s.type === 'list' && s.style === 'bullet');
        if (listSection && listSection.items) {
          listSection.items.push(line.trim().substring(2));
        }
      }
      // Otherwise, it's paragraph content
      else if (line.trim()) {
        if (currentSection) {
          sections.push(currentSection);
          currentSection = null;
        }
        sections.push({
          type: 'paragraph',
          content: line.trim()
        });
      }
    });
    
    // Add the last section if exists
    if (currentSection) {
      sections.push(currentSection);
    }
    
    // Format the text content with markdown
    const markdownText = textLines.map((line: string) => {
      if (!line.trim()) return '';
      if (line.trim().startsWith('-')) return `• ${line.trim().substring(2)}`;
      if (textLines[textLines.indexOf(line) + 1]?.trim() && !line.startsWith('-')) {
        return `# ${line.trim()}\n`;
      }
      return line.trim();
    }).join('\n');
    
    const formattedTextContent: TextContent = {
      raw_text: markdownText,
      sections: sections
    };
    
    // Create properly structured study materials
    const studyMaterials: StudyMaterials = {
      title: rawMaterials.title,
      text_content: formattedTextContent,
      flashcards: rawMaterials.flashcards,
      quiz: rawMaterials.quiz
    };
    
    console.log('Formatted study materials:', studyMaterials);
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
