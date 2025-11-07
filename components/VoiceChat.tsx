import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, Modality, LiveSession, LiveServerMessage } from '@google/genai';
import type { Lesson } from '../types';
import { decode, decodeAudioData, createPcmBlob } from '../utils/audioUtils';
import { Loader } from './Loader';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

type ChatStatus = 'idle' | 'connecting' | 'active' | 'stopped' | 'error';
type TranscriptEntry = {
    speaker: 'user' | 'model';
    text: string;
};

export const VoiceChat: React.FC<{ lesson: Lesson }> = ({ lesson }) => {
    const [status, setStatus] = useState<ChatStatus>('idle');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [error, setError] = useState<string | null>(null);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const sourcesRef = useRef(new Set<AudioBufferSourceNode>());
    const nextStartTimeRef = useRef(0);
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');

    const cleanup = useCallback(() => {
        mediaStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        
        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
          inputAudioContextRef.current.close().catch(console.error);
        }
        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
          outputAudioContextRef.current.close().catch(console.error);
        }

        sessionPromiseRef.current?.then(session => session.close()).catch(console.error);

        sourcesRef.current.forEach(source => source.stop());
        sourcesRef.current.clear();
        
        mediaStreamRef.current = null;
        scriptProcessorRef.current = null;
        inputAudioContextRef.current = null;
        outputAudioContextRef.current = null;
        sessionPromiseRef.current = null;
        nextStartTimeRef.current = 0;
    }, []);

    useEffect(() => {
        return () => cleanup();
    }, [cleanup]);

    const handleStartChat = async () => {
        setStatus('connecting');
        setError(null);
        setTranscript([]);
        
        // Cleanup previous session before starting a new one
        cleanup();

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

            // CRITICAL FIX: Ensure audio context is active on user gesture
            if (outputAudioContextRef.current.state === 'suspended') {
                const context = outputAudioContextRef.current;
                const buffer = context.createBuffer(1, 1, 22050);
                const source = context.createBufferSource();
                source.buffer = buffer;
                source.connect(context.destination);
                source.start(0);
                await context.resume();
            }

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const allVocabulary = [...lesson.vocabulary.general, ...lesson.vocabulary.specialized]
                .map(v => v.word)
                .join(', ');

            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        setStatus('active');
                        const inputCtx = inputAudioContextRef.current!;
                        const source = inputCtx.createMediaStreamSource(stream);
                        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessorRef.current = scriptProcessor;

                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createPcmBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        source.connect(scriptProcessor);
                        
                        // FIX: Route processor through a muted GainNode to prevent mic playback.
                        // This keeps the audio graph active for the processor to work without
                        // routing the user's voice to their speakers.
                        const gainNode = inputCtx.createGain();
                        gainNode.gain.setValueAtTime(0, inputCtx.currentTime);
                        scriptProcessor.connect(gainNode);
                        gainNode.connect(inputCtx.destination);
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        // Handle transcription
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.turnComplete) {
                            const fullInput = currentInputTranscriptionRef.current;
                            const fullOutput = currentOutputTranscriptionRef.current;
                            if (fullInput.trim() || fullOutput.trim()) {
                                setTranscript(prev => [...prev, { speaker: 'user', text: fullInput }, { speaker: 'model', text: fullOutput }]);
                            }
                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }

                        // Handle audio
                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                        if (base64Audio && outputAudioContextRef.current) {
                            const outputAudioContext = outputAudioContextRef.current;
                            nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContext.currentTime);
                            const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
                            
                            const source = outputAudioContext.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputAudioContext.destination);
                            source.addEventListener('ended', () => {
                                sourcesRef.current.delete(source);
                            });
                            source.start(nextStartTimeRef.current);
                            nextStartTimeRef.current += audioBuffer.duration;
                            sourcesRef.current.add(source);
                        }
                    },
                    onerror: (e: ErrorEvent) => {
                        console.error('Session error:', e);
                        setError('An error occurred during the chat session.');
                        setStatus('error');
                        cleanup();
                    },
                    onclose: () => {
                        setStatus(prev => prev === 'error' ? 'error' : 'stopped');
                        cleanup();
                    },
                },
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    systemInstruction: `You are a friendly language tutor. Your goal is to have a conversation with the user to help them practice the language. The topic of conversation is "${lesson.title}". Encourage the user to use the following vocabulary: ${allVocabulary}. Start the conversation by asking a simple question related to the topic. Keep your responses concise and ask questions to keep the conversation going.`
                }
            });

        } catch (err) {
            console.error('Failed to start chat:', err);
            setError('Could not access microphone. Please check permissions and try again.');
            setStatus('error');
        }
    };

    const handleStopChat = () => {
        setStatus('stopped');
        cleanup();
    };

    return (
        <div className="space-y-4">
            <p className="text-gray-400 text-sm">
                Practice your speaking skills! Our AI tutor will have a conversation with you about the lesson's topic.
            </p>

            {status === 'idle' && (
                <button
                    onClick={handleStartChat}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
                >
                    <MicrophoneIcon className="h-5 w-5" />
                    Start Voice Chat
                </button>
            )}

            {status === 'connecting' && (
                <div className="text-center p-4 bg-gray-900 rounded-lg">
                    <Loader />
                    <p className="mt-2 text-gray-400">Connecting to AI tutor...</p>
                </div>
            )}
            
            {status === 'active' && (
                 <button
                    onClick={handleStopChat}
                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
                >
                    <StopIcon className="h-5 w-5" />
                    Stop Chat
                </button>
            )}
            
            {(status === 'stopped' || status === 'error') && (
                 <button
                    onClick={handleStartChat}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
                >
                    <MicrophoneIcon className="h-5 w-5" />
                    Start a New Chat
                </button>
            )}

            {error && <p className="text-red-400 text-center">{error}</p>}
            
            {transcript.length > 0 && (
                <div className="mt-4 p-4 bg-gray-900/70 rounded-lg max-h-80 overflow-y-auto space-y-4">
                    {transcript.map((entry, index) => (
                        entry.text.trim() && (
                            <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 rounded-xl ${entry.speaker === 'user' ? 'bg-indigo-800 text-white' : 'bg-gray-700 text-gray-200'}`}>
                                <p className="font-bold capitalize text-sm mb-1">{entry.speaker}</p>
                                <p>{entry.text}</p>
                                </div>
                            </div>
                        )
                    ))}
                </div>
            )}
             {status === 'active' && transcript.length === 0 && (
                <div className="text-center p-6 bg-gray-900/70 rounded-lg border-2 border-dashed border-gray-600">
                    <MicrophoneIcon className="h-8 w-8 text-indigo-400 mx-auto animate-pulse"/>
                    <p className="mt-2 font-semibold text-gray-300">Listening...</p>
                    <p className="text-sm text-gray-500">The AI tutor will start the conversation.</p>
                </div>
            )}
        </div>
    );
};