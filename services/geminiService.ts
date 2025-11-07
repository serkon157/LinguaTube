
import { GoogleGenAI, Type } from '@google/genai';
import type { Lesson, Language, Level, VideoChapter } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const chaptersSchema = {
    type: Type.ARRAY,
    description: "A list of logical chapters or topics found in the video transcript.",
    items: {
        type: Type.OBJECT,
        properties: {
            timestamp: { type: Type.STRING, description: "The start time of the chapter, formatted as MM:SS. Infer from the transcript if not explicit." },
            title: { type: Type.STRING, description: "A concise title for the chapter, written in the target language." },
            summary: { type: Type.STRING, description: "A brief summary of what is discussed in this chapter. For 'Beginner' level, this should be in the native language. For 'Advanced' level, it should be in the target language." },
        },
        required: ["timestamp", "title", "summary"],
    }
};

export const getVideoChapters = async (
  youtubeUrl: string,
  transcript: string,
  nativeLanguage: Language,
  targetLanguage: Language,
  level: Level
): Promise<VideoChapter[]> => {
    const prompt = `
    You are an AI assistant that analyzes video transcripts for language learners. Your task is to break down the provided transcript into logical chapters based on its content.

    YouTube Video URL: ${youtubeUrl} (for context)
    Target Language: ${targetLanguage.name}
    Student's Native Language: ${nativeLanguage.name}
    Proficiency Level: ${level}

    Video Transcript:
    ---
    ${transcript}
    ---

    Instructions:
    1. Read and understand the provided video transcript.
    2. Divide the video's content into at least 3 logical chapters or thematic sections based on the transcript. If the video is short, create sensible segments.
    3. For each chapter, provide:
       a. A start timestamp (e.g., "00:00", "02:15"). You must infer this from the flow of the transcript.
       b. A concise title in ${targetLanguage.name}.
       c. A brief summary of the chapter's content. This summary should be in ${nativeLanguage.name} for 'Beginner' level students, and in ${targetLanguage.name} for 'Advanced' level students.
    4. The output must be a JSON array that strictly follows the provided schema.
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: chaptersSchema,
          },
        });
        const jsonText = response.text.trim();
        const chaptersData = JSON.parse(jsonText);
        if (Array.isArray(chaptersData)) {
            return chaptersData as VideoChapter[];
        } else {
            throw new Error("Generated chapters have an invalid structure.");
        }
    } catch (error) {
        console.error("Error getting video chapters from Gemini:", error);
        throw new Error("Failed to analyze the video. The AI may be experiencing issues or the transcript is invalid.");
    }
};


const lessonSchema = {
  type: Type.OBJECT,
  properties: {
    title: { 
      type: Type.STRING,
      description: "An engaging title for the lesson in the target language."
    },
    vocabulary: {
      type: Type.OBJECT,
      properties: {
        general: {
          type: Type.ARRAY,
          description: "A list of 5-7 general vocabulary words from the video transcript relevant to the chapter.",
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The word in the target language." },
              transcription: { type: Type.STRING, description: "Phonetic transcription of the word." },
              meaning: { type: Type.STRING, description: "Translation to the native language for 'Beginner', or a definition in the target language for 'Advanced'." },
            },
            required: ["word", "transcription", "meaning"],
          },
        },
        specialized: {
          type: Type.ARRAY,
          description: "A list of 3-5 specialized terms from the video transcript related to the chapter's topic.",
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "The specialized term in the target language." },
              transcription: { type: Type.STRING, description: "Phonetic transcription of the term." },
              meaning: { type: Type.STRING, description: "Translation to the native language for 'Beginner', or a definition in the target language for 'Advanced'." },
            },
            required: ["word", "transcription", "meaning"],
          },
        },
      },
      required: ["general", "specialized"],
    },
    exercises: {
      type: Type.ARRAY,
      description: "A list of three different exercises.",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ["fill-in-the-blank", "multiple-choice", "open-question"] },
          instruction: { type: Type.STRING, description: "Instruction for the exercise in the target language." },
          instruction_translated: { type: Type.STRING, description: "Instruction translated to the native language (only for 'Beginner' level)." },
          question: { type: Type.STRING, description: "The exercise question." },
          question_translated: { type: Type.STRING, description: "Question translated to the native language (only for 'Beginner' level)." },
          options: { type: Type.ARRAY, description: "An array of options for multiple-choice questions.", items: { type: Type.STRING } },
          answer: { type: Type.STRING, description: "The correct answer for fill-in-the-blank and multiple-choice questions." },
        },
        required: ["type", "instruction", "question"],
      },
    },
  },
  required: ["title", "vocabulary", "exercises"],
};

export const generateLesson = async (
  youtubeUrl: string,
  transcript: string,
  nativeLanguage: Language,
  targetLanguage: Language,
  level: Level,
  chapter: VideoChapter
): Promise<Lesson> => {
  const prompt = `
    You are an expert language tutor AI. Your task is to create a language lesson based on a specific chapter of a YouTube video, using its transcript.

    YouTube Video URL: ${youtubeUrl} (for context)
    Target Language: ${targetLanguage.name}
    Student's Native Language: ${nativeLanguage.name}
    Proficiency Level: ${level}

    Video Transcript:
    ---
    ${transcript}
    ---

    The lesson should focus exclusively on the following chapter which was derived from the transcript:
    - Chapter Title: "${chapter.title}"
    - Chapter Summary: "${chapter.summary}"

    Based on the transcript and the chapter's context, generate a complete lesson in a structured JSON format.

    Instructions:
    1.  Create an engaging lesson title in ${targetLanguage.name} based on the chapter's content.
    2.  Identify a list of 5-7 key general vocabulary words and 3-5 specialized terms specifically from the provided transcript that are relevant to this chapter.
    3.  For the "${level}" level:
        - If "Beginner", provide each vocabulary word in ${targetLanguage.name}, its phonetic transcription, and its translation in ${nativeLanguage.name}.
        - If "Advanced", provide each vocabulary word in ${targetLanguage.name}, its phonetic transcription, and a clear definition in ${targetLanguage.name}.
    4.  Create three different exercises: one "fill-in-the-blank", one "multiple-choice", and one "open-question". These exercises must be directly related to the chapter's topic and should incorporate the vocabulary words listed above, using sentences and concepts from the transcript.
    5.  For the "${level}" level:
        - If "Beginner", all exercise instructions and questions should be in ${targetLanguage.name}, with a translation in ${nativeLanguage.name} provided alongside. The answers should be in ${targetLanguage.name}.
        - If "Advanced", the entire lesson (instructions, questions, etc.) must be exclusively in ${targetLanguage.name}.
    6.  The JSON output must strictly follow the provided schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: lessonSchema,
      },
    });

    const jsonText = response.text.trim();
    const lessonData = JSON.parse(jsonText);

    // Basic validation to ensure the structure matches the Lesson type
    if (lessonData && lessonData.title && lessonData.vocabulary && lessonData.exercises) {
        return lessonData as Lesson;
    } else {
        throw new Error("Generated lesson has an invalid structure.");
    }

  } catch (error) {
    console.error("Error generating lesson from Gemini:", error);
    throw new Error("Failed to generate lesson. The AI may be experiencing issues or the request was invalid.");
  }
};
