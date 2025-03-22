import { StudyMaterials, StudySet, HomeworkHelp } from '../types/types';

/**
 * Type guard to check if content is a StudySet
 */
export function isStudySet(content: StudyMaterials): content is StudySet {
  return content && content.contentType === 'study-set';
}

/**
 * Type guard to check if content is HomeworkHelp
 */
export function isHomeworkHelp(content: StudyMaterials): content is HomeworkHelp {
  return content && content.contentType === 'homework-help';
}

/**
 * Safely get flashcards count for any content
 */
export function getFlashcardsCount(content: StudyMaterials | null): number {
  if (content && isStudySet(content)) {
    return content.flashcards?.length || 0;
  }
  return 0;
}

/**
 * Safely get concept cards count for any content
 */
export function getConceptCardsCount(content: StudyMaterials | null): number {
  if (content && isHomeworkHelp(content)) {
    return content.homeworkHelp?.concept_cards?.length || 0;
  }
  return 0;
}

/**
 * Get appropriate card count text based on content type
 */
export function getCardCountText(content: StudyMaterials | null): string {
  if (!content) return 'No cards';
  
  if (isStudySet(content)) {
    const count = content.flashcards?.length || 0;
    return count > 0 ? `${count} cards` : 'No cards';
  } else if (isHomeworkHelp(content)) {
    const count = content.homeworkHelp?.concept_cards?.length || 0;
    return count > 0 ? `${count} cards` : 'No cards';
  }
  
  return 'No cards';
}

/**
 * Gets introduction text for any content type
 */
export function getIntroduction(content: StudyMaterials | null): string {
  if (!content) return '';
  
  // Both content types should have introduction now
  return content.introduction || "I analyzed your content. Here's some material to help you master this subject.";
}

/**
 * Safely get summary text for any content type
 */
export function getSummary(content: StudyMaterials | null): string {
  if (!content) return '';
  
  // Both content types should have summary now
  return content.summary || '';
}

/**
 * Safely checks if content has a valid summary
 */
export function hasSummary(content: StudyMaterials | null): boolean {
  return !!content && !!content.summary;
} 