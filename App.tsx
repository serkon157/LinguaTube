import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { LessonDisplay } from './components/LessonDisplay';
import { Loader } from './components/Loader';
import { generateLesson, getVideoChapters } from './services/geminiService';
import type { Lesson, Language, Level, VideoChapter, SavedLessonData } from './types';
import { LANGUAGES } from './constants';
import { getSavedLessons, saveVideoAnalysis, saveLessonForVideo, clearAllSavedData } from './utils/storage';
import { YouTubeIcon } from './components/icons/YouTubeIcon';
import { SparklesIcon } from './components/icons/SparklesIcon';
import { FilmIcon } from './components/icons/FilmIcon';
import { TranscriptIcon } from './components/icons/TranscriptIcon';
import { SavedLessons } from './components/SavedLessons';

const App: React.FC = () => {
  const [nativeLanguage, setNativeLanguage] = useState<Language>(LANGUAGES[0]);
  const [targetLanguage, setTargetLanguage] = useState<Language>(LANGUAGES[1]);
  const [level, setLevel] = useState<Level>('Beginner');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [transcript, setTranscript] = useState('');
  
  const [chapters, setChapters] = useState<VideoChapter[] | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<VideoChapter | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [savedLessonsData, setSavedLessonsData] = useState<Record<string, SavedLessonData>>({});

  useEffect(() => {
    setSavedLessonsData(getSavedLessons());
  }, []);

  const handleAnalyzeVideo = useCallback(async () => {
    setError(null);
    if (!youtubeUrl) {
      setError('Please enter a YouTube URL.');
      return;
    }
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
    if (!youtubeRegex.test(youtubeUrl)) {
        setError('Please enter a valid YouTube URL.');
        return;
    }
    if (!transcript.trim()) {
        setError('Please paste the video transcript.');
        return;
    }

    setIsAnalyzing(true);
    setLesson(null);
    setChapters(null);
    setSelectedChapter(null);

    try {
      const videoChapters = await getVideoChapters(youtubeUrl, transcript, nativeLanguage, targetLanguage, level);
      setChapters(videoChapters);
      saveVideoAnalysis(youtubeUrl, transcript, videoChapters);
      setSavedLessonsData(getSavedLessons());
    } catch (err) {
      console.error(err);
      setError('Failed to analyze the video. Please check the transcript and try again.');
    } finally {
      setIsAnalyzing(false);
    }
  }, [youtubeUrl, transcript, nativeLanguage, targetLanguage, level]);

  const handleGenerateLesson = useCallback(async (chapter: VideoChapter) => {
    setSelectedChapter(chapter);
    setIsGenerating(true);
    setError(null);
    setLesson(null);

    try {
      const generatedLesson = await generateLesson(youtubeUrl, transcript, nativeLanguage, targetLanguage, level, chapter);
      setLesson(generatedLesson);
      saveLessonForVideo(youtubeUrl, chapter, generatedLesson);
      setSavedLessonsData(getSavedLessons());
    } catch (err) {
      console.error(err);
      setError('Failed to generate the lesson for this chapter.');
    } finally {
      setIsGenerating(false);
    }
  }, [youtubeUrl, transcript, nativeLanguage, targetLanguage, level]);
  
  const handleLoadLesson = useCallback((data: SavedLessonData, lessonToLoad: Lesson, chapterForLesson: VideoChapter) => {
    setYoutubeUrl(data.url);
    setTranscript(data.transcript);
    setChapters(data.chapters);
    setSelectedChapter(chapterForLesson);
    setLesson(lessonToLoad);
    setError(null);
    
    // Scroll to the top of the lesson display for better UX
    const lessonElement = document.getElementById('lesson-display');
    if (lessonElement) {
      lessonElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  
  const handleClearSaved = () => {
    clearAllSavedData();
    setSavedLessonsData({});
  };

  const swapLanguages = () => {
    setNativeLanguage(targetLanguage);
    setTargetLanguage(nativeLanguage);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <Header />

        <main className="mt-8">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700">
            <h2 className="text-xl font-bold text-indigo-400 mb-4">Lesson Configuration</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Language Selectors */}
              <div className="flex items-center gap-4">
                <div className="w-full">
                  <label htmlFor="native-lang" className="block text-sm font-medium text-gray-400 mb-2">Your Language</label>
                  <select
                    id="native-lang"
                    value={nativeLanguage.code}
                    onChange={(e) => setNativeLanguage(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[0])}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  >
                    {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                  </select>
                </div>
                <button onClick={swapLanguages} className="mt-7 p-2 rounded-full bg-gray-700 hover:bg-indigo-600 transition-colors duration-200" aria-label="Swap languages">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v1.168l1.793-1.793a1 1 0 111.414 1.414l-3.5 3.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414L9 5.168V4a1 1 0 011-1zM3.207 7.207a1 1 0 010-1.414l3.5-3.5a1 1 0 011.414 0l3.5 3.5a1 1 0 01-1.414 1.414L9 5.828V16a1 1 0 11-2 0V5.828L5.343 7.485a1 1 0 01-1.414 0zM16.793 12.793a1 1 0 010 1.414l-3.5 3.5a1 1 0 01-1.414 0l-3.5-3.5a1 1 0 111.414-1.414L11 14.172V4a1 1 0 112 0v10.172l1.657-1.657a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <div className="w-full">
                  <label htmlFor="target-lang" className="block text-sm font-medium text-gray-400 mb-2">Language to Learn</label>
                  <select
                    id="target-lang"
                    value={targetLanguage.code}
                    onChange={(e) => setTargetLanguage(LANGUAGES.find(l => l.code === e.target.value) || LANGUAGES[1])}
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  >
                    {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Level Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Proficiency Level</label>
                <div className="flex bg-gray-900 border border-gray-600 rounded-lg p-1">
                  {(['Beginner', 'Advanced'] as Level[]).map(l => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${level === l ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="mt-6 space-y-6">
              {/* URL Input */}
              <div>
                <label htmlFor="youtube-url" className="block text-sm font-medium text-gray-400 mb-2">YouTube Video URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <YouTubeIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <input
                    type="text"
                    id="youtube-url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Transcript Input */}
              <div>
                <label htmlFor="transcript" className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-2">
                  <TranscriptIcon className="h-5 w-5" />
                  Video Transcript (Required)
                </label>
                <textarea
                  id="transcript"
                  rows={6}
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste the full video transcript here. On YouTube, click '...' then 'Show transcript' to get this."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                ></textarea>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6">
              <button
                onClick={handleAnalyzeVideo}
                disabled={isAnalyzing}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 shadow-lg shadow-indigo-600/20"
              >
                {isAnalyzing ? (
                  <>
                    <Loader />
                    Analyzing Transcript...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5"/>
                    Analyze & Create Chapters
                  </>
                )}
              </button>
            </div>
          </div>
          
          {error && <div className="mt-6 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">{error}</div>}

          {Object.keys(savedLessonsData).length > 0 && (
             <SavedLessons 
                lessons={savedLessonsData}
                onLoad={handleLoadLesson}
                onClear={handleClearSaved}
              />
          )}

          <div className="mt-8">
            {isAnalyzing && (
              <div className="text-center py-10">
                <Loader />
                <p className="mt-4 text-lg text-gray-400">Our AI tutor is analyzing the video transcript...</p>
                <p className="text-sm text-gray-500">This might take a moment.</p>
              </div>
            )}
            
            {chapters && (
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700 animate-fade-in">
                <div className="flex items-center gap-3 mb-4">
                  <FilmIcon className="h-7 w-7 text-indigo-400"/>
                  <h3 className="text-2xl font-bold">Video Chapters</h3>
                </div>
                <div className="space-y-3">
                  {chapters.map((chapter, index) => (
                    <button
                      key={index}
                      onClick={() => handleGenerateLesson(chapter)}
                      disabled={isGenerating && selectedChapter !== chapter}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${selectedChapter === chapter ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-900 border-gray-700 hover:border-indigo-600'} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-mono bg-gray-700 text-indigo-300 px-2 py-1 rounded-md">{chapter.timestamp}</span>
                        <div className="flex-1">
                          <p className="font-bold text-gray-100">{chapter.title}</p>
                          <p className="text-sm text-gray-400">{chapter.summary}</p>
                        </div>
                        {isGenerating && selectedChapter === chapter && <Loader />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div id="lesson-display" className="mt-8">
              {isGenerating && !lesson && (
                <div className="text-center py-10">
                  <Loader />
                  <p className="mt-4 text-lg text-gray-400">Crafting your lesson for "{selectedChapter?.title}"...</p>
                  <p className="text-sm text-gray-500">Almost there!</p>
                </div>
              )}
              {lesson && <LessonDisplay lesson={lesson} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
