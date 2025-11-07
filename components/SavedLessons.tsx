import React, { useState } from 'react';
import type { Lesson, SavedLessonData, VideoChapter } from '../types';
import { BookmarkIcon } from './icons/BookmarkIcon';

interface SavedLessonsProps {
  lessons: Record<string, SavedLessonData>;
  onLoad: (data: SavedLessonData, lesson: Lesson, chapter: VideoChapter) => void;
  onClear: () => void;
}

const SavedLessonItem: React.FC<{
  data: SavedLessonData;
  onLoad: (lesson: Lesson, chapter: VideoChapter) => void;
}> = ({ data, onLoad }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gray-900/70 rounded-lg border border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left"
      >
        <span className="font-semibold text-indigo-300 truncate">{data.url}</span>
        <svg
          className={`w-5 h-5 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      {isOpen && (
        <div className="p-4 border-t border-gray-700 space-y-2">
          {data.chapters.map(chapter => {
            const savedLesson = data.lessons[chapter.title];
            return (
              <div key={chapter.title} className="flex justify-between items-center p-2 rounded-md bg-gray-800">
                <div className="flex-1">
                  <p className="font-bold">{chapter.title}</p>
                  <p className="text-sm text-gray-400">{chapter.summary}</p>
                </div>
                {savedLesson ? (
                  <button
                    onClick={() => onLoad(savedLesson, chapter)}
                    className="ml-4 px-3 py-1 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 transition-colors"
                  >
                    Load
                  </button>
                ) : (
                  <span className="ml-4 text-xs text-gray-500 px-3 py-1">Not Generated</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SavedLessons: React.FC<SavedLessonsProps> = ({ lessons, onLoad, onClear }) => {
  return (
    <div className="mt-8 bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700 animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <BookmarkIcon className="h-7 w-7 text-indigo-400" />
          <h3 className="text-2xl font-bold">Saved Lessons</h3>
        </div>
        <button onClick={onClear} className="text-sm text-red-400 hover:underline">
          Clear All
        </button>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {Object.values(lessons).map(savedData => (
          <SavedLessonItem 
            key={savedData.url} 
            data={savedData} 
            onLoad={(lesson, chapter) => onLoad(savedData, lesson, chapter)}
          />
        ))}
      </div>
    </div>
  );
};
