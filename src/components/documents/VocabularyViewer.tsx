'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Volume2, Square, Search } from 'lucide-react';

interface VocabularyEntry {
  id?: string;
  term: string;
  definition: string;
  category?: string;
  createdAt?: string;
}

interface VocabularyViewerProps {
  vocabulary: VocabularyEntry[];
  title?: string;
}

export default function VocabularyViewer({
  vocabulary,
  title = 'Vocabulary',
}: VocabularyViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Filter vocabulary based on search and category
  const filteredVocabulary = vocabulary.filter((entry) => {
    const matchesSearch =
      entry.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.definition.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      !selectedCategory || entry.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(
    new Set(vocabulary.map((v) => v.category).filter(Boolean))
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
        <span className="text-sm text-muted-foreground">
          {filteredVocabulary.length} / {vocabulary.length} terms
        </span>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search terms or definitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-foreground placeholder-muted-foreground"
            />
          </div>
          {searchTerm && (
            <Button
              onClick={() => setSearchTerm('')}
              variant="outline"
              size="sm"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setSelectedCategory(null)}
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                onClick={() => setSelectedCategory(category || null)}
                variant={
                  selectedCategory === category ? 'default' : 'outline'
                }
                size="sm"
              >
                {category}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Vocabulary List */}
      {filteredVocabulary.length > 0 ? (
        <div className="grid gap-3">
          {filteredVocabulary.map((entry) => (
            <VocabularyCardWithTts
              key={entry.id || entry.term}
              entry={entry}
              isPlaying={playingId === entry.id}
              onPlayStart={() => setPlayingId(entry.id || entry.term)}
              onPlayEnd={() => setPlayingId(null)}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {vocabulary.length === 0
              ? 'No vocabulary extracted yet'
              : 'No results found'}
          </p>
        </Card>
      )}
    </div>
  );
}

// Sub-component: Single vocabulary card with TTS
interface VocabularyCardWithTtsProps {
  entry: VocabularyEntry;
  isPlaying: boolean;
  onPlayStart: () => void;
  onPlayEnd: () => void;
}

function VocabularyCardWithTts({
  entry,
  isPlaying,
  onPlayStart,
  onPlayEnd,
}: VocabularyCardWithTtsProps) {
  const [expandDefinition, setExpandDefinition] = useState(false);
  const [playingPart, setPlayingPart] = useState<'term' | 'definition' | null>(
    null
  );
  const [isLoadingTerm, setIsLoadingTerm] = useState(false);
  const [isLoadingDef, setIsLoadingDef] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      onPlayStart();

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
      onPlayEnd();
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
    onPlayEnd();
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
    <Card className="p-4 hover:shadow-md transition-shadow">
      {/* Term and Controls */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h5 className="font-semibold text-base truncate">{entry.term}</h5>
          <Button
            onClick={handlePlayTerm}
            disabled={isLoadingDef}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 flex-shrink-0"
            title={
              playingPart === 'term'
                ? 'Stop playback'
                : 'Listen to pronunciation'
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
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {entry.category}
          </Badge>
        )}
      </div>

      {/* Definition */}
      <div className="mb-3">
        <p 
          ref={textRef}
          className={`text-sm text-muted-foreground cursor-pointer transition-colors ${expandDefinition ? '' : 'line-clamp-2'}`}
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

      {/* Action Buttons */}
      <div className="flex gap-2 pt-3 border-t">
        <Button
          onClick={handlePlayDefinition}
          disabled={isLoadingTerm}
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs"
          title="Listen to full definition"
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

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-xs underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onEnded={() => {
          setPlayingPart(null);
          setIsLoadingTerm(false);
          setIsLoadingDef(false);
          onPlayEnd();
        }}
        onError={() => {
          setError('Failed to play audio');
          setIsLoadingTerm(false);
          setIsLoadingDef(false);
          setPlayingPart(null);
          onPlayEnd();
        }}
      />
    </Card>
  );
}
