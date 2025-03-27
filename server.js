// Add this validation before processing the response
if (!response.data || !response.data.summary) {
  console.error('[Server] Missing summary in response:', response.data);
  throw new Error('Missing or invalid summary in study materials response');
} 