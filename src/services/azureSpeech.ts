import * as speechSDK from 'microsoft-cognitiveservices-speech-sdk';

const AZURE_SPEECH_KEY = 'Av9Jk2p9TabRh9JgNtxMx0tWAoIphR7Q1M0EchLIJMDeO6VMxcm0JQQJ99AKACi5YpzXJ3w3AAAYACOGKBEj';
const AZURE_SPEECH_REGION = 'northeurope';

export const synthesizeSpeech = async (text: string): Promise<void> => {
  try {
    const speechConfig = speechSDK.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
    speechConfig.speechSynthesisVoiceName = "fi-FI-SelmaNeural";

    const audioConfig = speechSDK.AudioConfig.fromDefaultSpeakerOutput();
    const synthesizer = new speechSDK.SpeechSynthesizer(speechConfig, audioConfig);

    return new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (result: speechSDK.SpeechSynthesisResult) => {
          synthesizer.close();
          resolve();
        },
        (error: string) => {
          synthesizer.close();
          reject(error);
        }
      );
    });
  } catch (error) {
    console.error('Speech synthesis error:', error);
    throw error;
  }
}; 