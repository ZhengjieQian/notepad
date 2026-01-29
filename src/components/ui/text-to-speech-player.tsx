'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Volume2, Square } from 'lucide-react';

interface TextToSpeechPlayerProps {
  text: string;
  voiceName?: string;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  showText?: boolean;
}

export const TextToSpeechPlayer: React.FC<TextToSpeechPlayerProps> = ({
  text,
  voiceName,
  onPlayStart,
  onPlayEnd,
  onError,
  className = '',
  showText = false,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch audio from TTS API
  const handlePlayText = useCallback(async () => {
    if (!text || text.trim().length === 0) {
      const err = new Error('Text cannot be empty');
      setError(err.message);
      onError?.(err);
      return;
    }

    // If already playing, stop it
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      onPlayStart?.();

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          ...(voiceName && { voiceName }),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `TTS API error: ${response.status} ${response.statusText}`
        );
      }

      const audioBlob = await response.blob();

      if (audioBlob.size === 0) {
        throw new Error('Received empty audio data');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioSrc(audioUrl);
      setIsLoading(false);
    } catch (error) {
      const err =
        error instanceof Error ? error : new Error('Unknown error occurred');
      console.error('Error fetching TTS audio:', err);
      setError(err.message);
      setIsLoading(false);
      setIsPlaying(false);
      onError?.(err);
    }
  }, [text, voiceName, isPlaying, onPlayStart, onError]);

  // Auto-play audio when audioSrc is set
  useEffect(() => {
    if (audioSrc && audioRef.current && !isPlaying) {
      audioRef.current
        .play()
        .then(() => {
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
  const handleAudioEnded = useCallback(() => {
    setIsPlaying(false);
    onPlayEnd?.();

    // Clean up the object URL
    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
      setAudioSrc(null);
    }
  }, [audioSrc, onPlayEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioSrc) {
        URL.revokeObjectURL(audioSrc);
      }
    };
  }, []);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Button
          onClick={handlePlayText}
          disabled={isLoading || !text}
          variant={isPlaying ? 'destructive' : 'default'}
          size="sm"
          title={
            isPlaying
              ? 'Stop playback'
              : isLoading
                ? 'Loading audio...'
                : 'Play text as speech'
          }
        >
          {isPlaying ? (
            <>
              <Square className="h-4 w-4" />
              Stop
            </>
          ) : isLoading ? (
            <>
              <Volume2 className="h-4 w-4 animate-pulse" />
              Loading...
            </>
          ) : (
            <>
              <Volume2 className="h-4 w-4" />
              Play
            </>
          )}
        </Button>

        {showText && (
          <span className="text-sm text-muted-foreground truncate max-w-xs">
            {text}
          </span>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">Error: {error}</p>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        onError={(e) => {
          const err = new Error(
            `Audio element error: ${(e.target as HTMLAudioElement).error?.message || 'Unknown'}`
          );
          setError(err.message);
          setIsPlaying(false);
          onError?.(err);
        }}
      />
    </div>
  );
};

export default TextToSpeechPlayer;
