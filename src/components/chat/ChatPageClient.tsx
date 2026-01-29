"use client";

import { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import MessageList, { Message } from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import { useToast } from '@/components/ui/use-toast';

interface ChatPageClientProps {
  document: {
    id: string;
    fileName: string;
    uploadedToPinecone: boolean;
    chunkCount: number | null;
  };
}

export default function ChatPageClient({ document }: ChatPageClientProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentAiMessageId, setCurrentAiMessageId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Check if document is vectorized
    if (!document.uploadedToPinecone) {
      toast({
        title: "Document Not Ready",
        description: "Please vectorize and upload this document to Pinecone before chatting.",
        variant: "destructive",
      });
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: messageText,
    };
    setMessages(prev => [...prev, userMessage]);

    // Create AI message placeholder
    const aiMessageId = `ai-${Date.now()}`;
    const aiMessagePlaceholder: Message = {
      id: aiMessageId,
      sender: 'ai',
      text: '',
      isStreaming: true,
    };
    setMessages(prev => [...prev, aiMessagePlaceholder]);
    setCurrentAiMessageId(aiMessageId);
    setIsStreaming(true);

    // Close any existing EventSource connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Establish SSE connection
    const encodedQuestion = encodeURIComponent(messageText);
    const encodedDocId = encodeURIComponent(document.id);
    const url = `/api/chat?question=${encodedQuestion}&documentId=${encodedDocId}`;
    
    const es = new EventSource(url);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const data = event.data;
      
      // Check for completion signal
      if (data === "[DONE]") {
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
        ));
        setCurrentAiMessageId(null);
        setIsStreaming(false);
        es.close();
        return;
      }

      // Check for error messages
      if (data.startsWith("[ERROR]")) {
        const errorMessage = data.replace("[ERROR]", "").trim();
        setMessages(prev => prev.map(msg =>
          msg.id === aiMessageId 
            ? { ...msg, text: `⚠️ Error: ${errorMessage}`, isStreaming: false } 
            : msg
        ));
        setCurrentAiMessageId(null);
        setIsStreaming(false);
        es.close();
        
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      // Append token to current AI message
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId ? { ...msg, text: msg.text + data } : msg
      ));
    };

    es.onerror = (error) => {
      console.error('EventSource error:', error);
      setMessages(prev => prev.map(msg =>
        msg.id === aiMessageId 
          ? { 
              ...msg, 
              text: msg.text + "\n\n⚠️ Connection error. Please try again.", 
              isStreaming: false 
            } 
          : msg
      ));
      setCurrentAiMessageId(null);
      setIsStreaming(false);
      es.close();
      
      toast({
        title: "Connection Error",
        description: "Failed to communicate with the server. Please try again.",
        variant: "destructive",
      });
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return (
    <main className="flex flex-col flex-1 bg-background overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background p-4 flex-shrink-0">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link href={`/documents/${document.id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 flex-1">
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <h1 className="text-lg font-semibold tracking-tight">
                {document.fileName}
              </h1>
              <p className="text-xs text-muted-foreground">
                Chat with your document using AI
              </p>
            </div>
            
            {document.uploadedToPinecone && (
              <Badge variant="outline" className="text-green-600">
                <MessageSquare className="h-3 w-3 mr-1" />
                Ready ({document.chunkCount} chunks)
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-hidden min-h-0">
        <div className="h-full max-w-4xl mx-auto w-full">
          <MessageList messages={messages} />
        </div>
      </div>

      {/* Warning if not vectorized */}
      {!document.uploadedToPinecone && (
        <div className="border-t bg-amber-50 dark:bg-amber-950 p-4 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              ⚠️ This document hasn&apos;t been vectorized yet. Please go back and complete the vectorization process first.
            </p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-background p-4 flex-shrink-0">
        <MessageInput
          onSendMessage={handleSendMessage}
          disabled={!document.uploadedToPinecone}
          isLoading={isStreaming}
        />
      </div>
    </main>
  );
}
