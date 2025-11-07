import type { SavedLessonData, VideoChapter, Lesson } from '../types';

const STORAGE_KEY = 'linguaTubeLessons';

export const getSavedLessons = (): Record<string, SavedLessonData> => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : {};
  } catch (error) {
    console.error("Failed to retrieve saved lessons from localStorage:", error);
    return {};
  }
};

export const saveVideoAnalysis = (url: string, transcript: string, chapters: VideoChapter[]): void => {
  try {
    const allData = getSavedLessons();
    const existingData = allData[url] || { url, transcript, chapters: [], lessons: {} };
    
    allData[url] = {
      ...existingData,
      url,
      transcript,
      chapters,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
  } catch (error) {
    console.error("Failed to save video analysis to localStorage:", error);
  }
};

export const saveLessonForVideo = (url: string, chapter: VideoChapter, lesson: Lesson): void => {
  try {
    const allData = getSavedLessons();
    if (allData[url]) {
      allData[url].lessons[chapter.title] = lesson;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
    } else {
        // This case should ideally not happen if analysis is always saved first
        console.warn(`Attempted to save a lesson for a video that hasn't been analyzed: ${url}`);
    }
  } catch (error) {
    console.error("Failed to save lesson to localStorage:", error);
  }
};

export const clearAllSavedData = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear saved data from localStorage:", error);
    }
}
