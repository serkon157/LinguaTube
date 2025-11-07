import React, { useState } from 'react';
import type { Lesson, Exercise, VocabularyItem } from '../types';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { PencilIcon } from './icons/PencilIcon';
import { VoiceChat } from './VoiceChat';
import { ChatBubbleIcon } from './icons/ChatBubbleIcon';

const VocabularySection: React.FC<{ title: string; items: VocabularyItem[] }> = ({ title, items }) => (
  <div>
    <h4 className="text-lg font-semibold text-indigo-400 mb-2">{title}</h4>
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={index} className="p-3 bg-gray-900 rounded-md border border-gray-700">
          <p className="font-bold text-gray-100">{item.word} <span className="text-sm font-normal text-gray-400 ml-2">/{item.transcription}/</span></p>
          <p className="text-gray-300">{item.meaning}</p>
        </li>
      ))}
    </ul>
  </div>
);

const ExerciseCard: React.FC<{ exercise: Exercise; index: number }> = ({ exercise, index }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

  const handleCheckAnswer = () => {
    setIsAnswered(true);
  };

  const getOptionClass = (option: string) => {
    if (!isAnswered) return 'hover:bg-gray-700';
    if (option === exercise.answer) return 'bg-green-800/50 border-green-600';
    if (selectedOption === option && option !== exercise.answer) return 'bg-red-800/50 border-red-600';
    return 'border-gray-600';
  };

  return (
    <div className="bg-gray-800 p-5 rounded-xl border border-gray-700">
      <h4 className="font-bold text-lg text-gray-200">Exercise {index + 1}: {exercise.instruction}</h4>
      {exercise.instruction_translated && <p className="text-sm text-gray-400 italic mb-3">({exercise.instruction_translated})</p>}
      
      <p className="mt-2 text-gray-300">{exercise.question}</p>
      {exercise.question_translated && <p className="text-sm text-gray-400 italic mb-4">({exercise.question_translated})</p>}

      {exercise.type === 'multiple-choice' && exercise.options && (
        <div className="mt-4 space-y-2">
          {exercise.options.map((option, i) => (
            <button
              key={i}
              onClick={() => !isAnswered && setSelectedOption(option)}
              disabled={isAnswered}
              className={`w-full text-left p-3 rounded-md border transition-colors duration-200 disabled:cursor-not-allowed ${getOptionClass(option)}`}
            >
              {option}
            </button>
          ))}
          <button onClick={handleCheckAnswer} disabled={isAnswered || !selectedOption} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-semibold hover:bg-indigo-700 disabled:bg-gray-600">Check Answer</button>
        </div>
      )}

      {exercise.type === 'fill-in-the-blank' && (
        <div className="mt-4">
          <input type="text" className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" />
           <div className="group mt-2">
              <button className="text-sm text-indigo-400 group-hover:underline">Show Answer</button>
              <p className="hidden group-focus-within:block group-hover:block mt-1 text-green-400 bg-gray-900 p-2 rounded-md">{exercise.answer}</p>
            </div>
        </div>
      )}
      
      {exercise.type === 'open-question' && (
        <div className="mt-4">
          <textarea rows={3} className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500" placeholder="Type your answer here..."></textarea>
        </div>
      )}
    </div>
  );
};


export const LessonDisplay: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400">{lesson.title}</h2>
      
      {/* Vocabulary Section */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <BookOpenIcon className="h-7 w-7 text-indigo-400"/>
          <h3 className="text-2xl font-bold">Vocabulary</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <VocabularySection title="General" items={lesson.vocabulary.general} />
          <VocabularySection title="Specialized" items={lesson.vocabulary.specialized} />
        </div>
      </div>

      {/* Exercises Section */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <PencilIcon className="h-7 w-7 text-indigo-400"/>
          <h3 className="text-2xl font-bold">Exercises</h3>
        </div>
        <div className="space-y-6">
          {lesson.exercises.map((exercise, index) => (
            <ExerciseCard key={index} exercise={exercise} index={index} />
          ))}
        </div>
      </div>
      
      {/* Voice Practice Section */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <ChatBubbleIcon className="h-7 w-7 text-indigo-400"/>
          <h3 className="text-2xl font-bold">Voice Practice</h3>
        </div>
        <VoiceChat lesson={lesson} />
      </div>

    </div>
  );
};