"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookText, Loader2, CheckCircle, RefreshCw, Volume2, Square } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/use-toast";

interface VocabularyEntry {
  id?: string;
  term: string;
  definition: string;
  category?: string;
  createdAt?: string;
}

interface ExtractVocabularyButtonProps {
  documentId: string;
  extractedText: string | null;
}

export default function ExtractVocabularyButton({ 
  documentId, 
  extractedText 
}: ExtractVocabularyButtonProps) {
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vocabulary, setVocabulary] = useState<VocabularyEntry[]>([]);

  // Load saved vocabulary on mount
  useEffect(() => {
    loadSavedVocabulary();
  }, [documentId]);

  const loadSavedVocabulary = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/vocabulary`);
      if (response.ok) {
        const data = await response.json();
        setVocabulary(data.vocabulary || []);
      }
    } catch (error) {
      console.error('Failed to load vocabulary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!extractedText) {
      toast({
        title: "Error",
        description: "No text content available",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      const response = await fetch('/api/extract-vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          documentId: documentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract vocabulary');
      }

      // Reload vocabulary from database
      await loadSavedVocabulary();
      
      toast({
        title: "✓ Vocabulary Extracted & Saved",
        description: `Found and saved ${data.count} terms to database`,
      });

    } catch (err: any) {
      console.error('Vocabulary extraction error:', err);
      toast({
        title: "❌ Extraction Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>AI Vocabulary Extraction</CardTitle>
          <p className="text-sm text-muted-foreground">
            Extract technical terms, concepts, and definitions from the document
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={handleExtract}
              disabled={isExtracting || !extractedText}
              className="flex-1"
            >
              {isExtracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting Terms...
                </>
              ) : (
                <>
                  <BookText className="h-4 w-4 mr-2" />
                  {vocabulary.length > 0 ? 'Re-extract Vocabulary' : 'Extract Vocabulary'}
                </>
              )}
            </Button>

            {vocabulary.length > 0 && (
              <Button
                onClick={loadSavedVocabulary}
                disabled={isLoading}
                variant="outline"
                size="icon"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            )}
          </div>

          {isLoading && vocabulary.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 mx-auto mb-2 animate-spin" />
              Loading saved vocabulary...
            </div>
          ) : vocabulary.length > 0 ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold">
                  {vocabulary.length} Terms Saved
                </h4>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {vocabulary.map((entry, index) => (
                  <VocabularyCard key={entry.id || index} entry={entry} />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No vocabulary extracted yet. Click the button above to start.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Vocabulary card component with TTS support
function VocabularyCard({ entry }: { entry: VocabularyEntry }) {
  const [expandDefinition, setExpandDefinition] = useState(false);
  const [isLoadingTerm, setIsLoadingTerm] = useState(false);
  const [isLoadingDef, setIsLoadingDef] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingPart, setPlayingPart] = useState<'term' | 'definition' | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Check if text is actually truncated
  useEffect(() => {
    if (textRef.current && !expandDefinition) {
      const isOverflowing =
        textRef.current.scrollHeight > textRef.current.clientHeight;
      setIsTruncated(isOverflowing);
    } else {
      setIsTruncated(false);
    }
  }, [expandDefinition, entry.definition]);

  const playAudio = async (text: string, part: 'term' | 'definition') => {
    try {
      setError(null);
      if (part === 'term') setIsLoadingTerm(true);
      if (part === 'definition') setIsLoadingDef(true);
      setPlayingPart(part);

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (audioBlob.size === 0) {
        throw new Error('No audio data received');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setIsLoadingTerm(false);
      setIsLoadingDef(false);
      setPlayingPart(null);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingPart(null);
    setIsLoadingTerm(false);
    setIsLoadingDef(false);
  };

  const handlePlayTerm = () => {
    if (playingPart === 'term') {
      stopAudio();
    } else {
      playAudio(entry.term, 'term');
    }
  };

  const handlePlayDefinition = () => {
    if (playingPart === 'definition') {
      stopAudio();
    } else {
      playAudio(entry.definition, 'definition');
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 flex-1">
          <h5 className="font-semibold text-sm flex-1">{entry.term}</h5>
          <Button
            onClick={handlePlayTerm}
            disabled={isLoadingDef}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            title={
              playingPart === 'term'
                ? 'Stop playback'
                : 'Pronounce word'
            }
          >
            {playingPart === 'term' ? (
              <Square className="h-4 w-4 text-red-500 animate-pulse" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
        {entry.category && (
          <Badge variant="outline" className="text-xs">
            {entry.category}
          </Badge>
        )}
      </div>

      <div className="text-sm text-muted-foreground mb-2">
        <p 
          ref={textRef}
          className={`cursor-pointer transition-colors ${expandDefinition ? '' : 'line-clamp-2'}`}
          onClick={() => setExpandDefinition(!expandDefinition)}
        >
          {entry.definition}
        </p>
        {isTruncated && (
          <button 
            className="text-xs text-blue-500 hover:underline mt-1"
            onClick={(e) => {
              e.stopPropagation();
              setExpandDefinition(!expandDefinition);
            }}
          >
            {expandDefinition ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t">
        <Button
          onClick={handlePlayDefinition}
          disabled={isLoadingTerm}
          variant="outline"
          size="sm"
          className="flex-1 h-7 text-xs"
          title="Listen to definition"
        >
          {playingPart === 'definition' ? (
            <>
              <Square className="h-3 w-3 mr-1 text-red-500 animate-pulse" />
              Stop
            </>
          ) : (
            <>
              <Volume2 className="h-3 w-3 mr-1" />
              Listen Definition
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-2 text-xs text-destructive flex justify-between items-center">
          <span>Error: {error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setPlayingPart(null);
          setIsLoadingTerm(false);
          setIsLoadingDef(false);
        }}
        onError={() => {
          setError('Failed to play audio');
          setIsLoadingTerm(false);
          setIsLoadingDef(false);
          setPlayingPart(null);
        }}
      />
    </Card>
  );
}
