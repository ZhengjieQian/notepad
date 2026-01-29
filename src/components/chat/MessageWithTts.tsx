'use client';

import React from 'react';
import { TextToSpeechPlayer } from '@/components/ui/text-to-speech-player';

interface MessageWithTtsProps {
  message: string;
  includePlayButton?: boolean;
  voiceName?: string;
}

/**
 * Example component showing how to integrate TTS with chat messages
 * Can be used in MessageList or individual message components
 */
export const MessageWithTts: React.FC<MessageWithTtsProps> = ({
  message,
  includePlayButton = true,
  voiceName,
}) => {
  const handlePlayError = (error: Error) => {
    console.error('TTS playback error:', error);
    // You can show a toast notification here
    // toast.error(`Failed to play audio: ${error.message}`);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm leading-relaxed">{message}</p>

      {includePlayButton && (
        <TextToSpeechPlayer
          text={message}
          voiceName={voiceName}
          onError={handlePlayError}
          showText={false}
          className="mt-2"
        />
      )}
    </div>
  );
};

export default MessageWithTts;
