"use client";

import { useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { User, Bot, Loader2 } from 'lucide-react';

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isStreaming?: boolean;
}

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Ask a question about this document to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-y-auto h-full px-4 py-6">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-3 ${
            message.sender === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          {message.sender === 'ai' && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
            </div>
          )}

          <Card
            className={`max-w-[80%] px-4 py-3 ${
              message.sender === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted'
            }`}
          >
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              {message.text}
              {message.isStreaming && (
                <span className="inline-block ml-1 w-2 h-4 bg-current animate-pulse">
                  ▍
                </span>
              )}
            </p>
            {message.isStreaming && message.text === '' && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-xs">Thinking...</span>
              </div>
            )}
          </Card>

          {message.sender === 'user' && (
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
