"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookText, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
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
                  <Card key={entry.id || index} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h5 className="font-semibold text-sm">{entry.term}</h5>
                      {entry.category && (
                        <Badge variant="outline" className="text-xs">
                          {entry.category}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.definition}
                    </p>
                  </Card>
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
