export interface VideoChapter {
  timestamp: string;
  title: string;
  summary: string;
}

export interface Language {
  name: string;
  code: string;
}

export type Level = 'Beginner' | 'Advanced';

export interface VocabularyItem {
  word: string;
  transcription: string;
  meaning: string;
}

export interface Vocabulary {
  general: VocabularyItem[];
  specialized: VocabularyItem[];
}

export interface Exercise {
  type: 'fill-in-the-blank' | 'multiple-choice' | 'open-question';
  instruction: string;
  instruction_translated?: string;
  question: string;
  question_translated?: string;
  options?: string[];
  answer?: string;
}

export interface Lesson {
  title: string;
  vocabulary: Vocabulary;
  exercises: Exercise[];
}

export interface SavedLessonData {
  url: string;
  transcript: string;
  chapters: VideoChapter[];
  lessons: Record<string, Lesson>; // Key is chapter.title
}
