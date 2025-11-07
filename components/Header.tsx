
import React from 'react';
import { BookOpenIcon } from './icons/BookOpenIcon';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <div className="flex justify-center items-center gap-4 mb-2">
        <BookOpenIcon className="h-10 w-10 text-indigo-400" />
        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
          LinguaTube
        </h1>
      </div>
      <p className="text-lg text-gray-400">
        Generate personalized language lessons from any YouTube video.
      </p>
    </header>
  );
};
