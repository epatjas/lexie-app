export const detectContentType = (content: any): 'study-set' | 'homework-help' => {
  // If the content already has a contentType, trust it
  if (content.contentType) {
    return content.contentType;
  }
  
  // Check for homework help signatures
  if (content.homeworkHelp || 
      (content.title && content.title.includes('?')) ||
      (content.text_content && 
       content.text_content.raw_text && 
       (content.text_content.raw_text.includes('?') ||
        content.text_content.raw_text.includes('Mikä on') ||
        content.text_content.raw_text.includes('Laske')))
  ) {
    return 'homework-help';
  }
  
  // Default to study-set
  return 'study-set';
}; 