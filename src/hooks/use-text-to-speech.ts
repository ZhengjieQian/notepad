'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface UseTtsOptions {
  voiceName?: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseTtsReturn {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  audioRef: React.RefObject<HTMLAudioElement>;
  play: (text: string) => Promise<void>;
  stop: () => void;
  clearError: () => void;
}

/**
 * Custom hook for Text-to-Speech functionality
 * @param options Configuration options
 * @returns TTS state and control methods
 */
export function useTextToSpeech(options: UseTtsOptions = {}): UseTtsReturn {
  const { voiceName, onPlayStart, onPlayEnd, onError } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Play text as speech
  const play = useCallback(
    async (text: string) => {
      if (!text || text.trim().length === 0) {
        const err = new Error('Text cannot be empty');
        setError(err.message);
        onError?.(err);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        onPlayStart?.();

        console.log('Fetching TTS audio for:', text.substring(0, 50));

        const response = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            ...(voiceName && { voiceName }),
          }),
        });

        console.log('TTS API response status:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('TTS API error:', errorData);
          throw new Error(
            `TTS API error: ${response.status} ${response.statusText} - ${errorData.details || ''}`
          );
        }

        const audioBlob = await response.blob();
        console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);

        if (audioBlob.size === 0) {
          throw new Error('Received empty audio data');
        }

        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('Audio URL created:', audioUrl);
        setAudioSrc(audioUrl);
        setIsLoading(false);
      } catch (error) {
        const err =
          error instanceof Error
            ? error
            : new Error('Unknown error occurred');
        console.error('Error fetching TTS audio:', err);
        setError(err.message);
        setIsLoading(false);
        setIsPlaying(false);
        onError?.(err);
      }
    },
    [voiceName, onPlayStart, onError]
  );

  // Stop playback
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  }, []);

  // Clear error message
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-play audio when audioSrc is set
  useEffect(() => {
    if (audioSrc && audioRef.current && !isPlaying) {
      console.log('Auto-playing audio:', audioSrc);
      audioRef.current
        .play()
        .then(() => {
          console.log('Audio playback started successfully');
          setIsPlaying(true);
        })
        .catch((e) => {
          const err =
            e instanceof Error ? e : new Error('Failed to play audio');
          console.error('Audio play failed:', err);
          setError(err.message);
          onError?.(err);
        });
    }
  }, [audioSrc, isPlaying, onError]);

  // Handle audio ended
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;

    const handleEnded = () => {
      setIsPlaying(false);
      onPlayEnd?.();

      // Clean up the object URL
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
        setAudioSrc(null);
      }
    };

    const handleError = (e: Event) => {
      const err = new Error(
        `Audio element error: ${audioElement.error?.message || 'Unknown'}`
      );
      setError(err.message);
      setIsPlaying(false);
      onError?.(err);
    };

    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    return () => {
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
    };
  }, [audioSrc, onPlayEnd, onError]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, []);

  return {
    isLoading,
    isPlaying,
    error,
    audioRef: audioRef as React.RefObject<HTMLAudioElement>,
    play,
    stop,
    clearError,
  };
}
