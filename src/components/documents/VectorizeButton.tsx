"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Upload, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface VectorizeButtonProps {
  documentId: string;
  extractedText: string | null;
  hasEmbeddings?: boolean;
  uploadedToPinecone?: boolean;
  chunkCount?: number | null;
}

interface EmbeddingResult {
  success?: boolean;
  message?: string;
  chunkCount?: number;
  embeddingDimension?: number;
  sampleChunks?: Array<{
    index: number;
    length: number;
    preview: string;
  }>;
  embeddingPreview?: {
    dimension: number;
    firstValues: number[];
    chunkText: string;
  };
}

interface PineconeResult {
  success?: boolean;
  message?: string;
  vectorCount?: number;
  indexName?: string;
  namespace?: string;
}

export default function VectorizeButton({ 
  documentId, 
  extractedText,
  hasEmbeddings = false,
  uploadedToPinecone = false,
  chunkCount = null
}: VectorizeButtonProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [embeddingResult, setEmbeddingResult] = useState<EmbeddingResult | null>(null);
  const [uploadResult, setUploadResult] = useState<PineconeResult | null>(null);

  const handleGenerateEmbeddings = async () => {
    if (!extractedText) {
      toast({
        title: "Error",
        description: "No text content available",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setEmbeddingResult(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/generate-embeddings`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to generate embeddings");
      }

      setEmbeddingResult(data);
      toast({
        title: "✓ Embeddings Generated",
        description: `Successfully created ${data.chunkCount} text chunks and embeddings`,
      });
      
      // Refresh page to show updated state
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error("Embedding generation error:", err);
      toast({
        title: "❌ Embedding Generation Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUploadToPinecone = async () => {
    setIsUploading(true);
    setUploadResult(null);

    try {
      const response = await fetch(`/api/documents/${documentId}/upload-to-pinecone`, {
        method: "POST",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to upload to Pinecone");
      }

      setUploadResult(data);
      toast({
        title: "✓ Uploaded to Pinecone",
        description: `Successfully uploaded ${data.vectorCount} vectors to index "${data.indexName}"`,
      });
      
      // Refresh page to show updated state
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      console.error("Pinecone upload error:", err);
      toast({
        title: "❌ Pinecone Upload Failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Vectorization Processing</CardTitle>
          <p className="text-sm text-muted-foreground">
            Step 1: Generate embeddings from document text | Step 2: Upload to Pinecone database
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Step 1: Generate Embeddings */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium">Step 1: Generate Embeddings</h4>
                {hasEmbeddings && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Chunk text and create vector embeddings using OpenAI
                {chunkCount && ` (${chunkCount} chunks)`}
              </p>
            </div>
            <Button
              onClick={handleGenerateEmbeddings}
              disabled={isGenerating || !extractedText || hasEmbeddings}
              size="sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {hasEmbeddings ? "Already Generated" : "Generate"}
                </>
              )}
            </Button>
          </div>

          {/* Step 2: Upload to Pinecone */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-medium">Step 2: Upload to Pinecone</h4>
                {uploadedToPinecone && (
                  <Badge variant="outline" className="text-green-600">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Store embeddings in Pinecone vector database for semantic search
              </p>
            </div>
            <Button
              onClick={handleUploadToPinecone}
              disabled={isUploading || !hasEmbeddings || uploadedToPinecone}
              size="sm"
              variant="secondary"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadedToPinecone ? "Already Uploaded" : "Upload"}
                </>
              )}
            </Button>
          </div>

          {/* Results Display */}
          {embeddingResult?.embeddingPreview && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Embedding Preview</p>
              <div className="space-y-2 text-xs">
                <p>Chunks: <Badge variant="secondary">{embeddingResult.chunkCount}</Badge></p>
                <p>Dimension: <Badge variant="outline">{embeddingResult.embeddingDimension}</Badge></p>
                <div>
                  <p className="text-muted-foreground mb-1">Sample Text:</p>
                  <pre className="text-xs bg-background p-2 rounded border overflow-x-auto max-h-20">
                    {embeddingResult.embeddingPreview.chunkText}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {uploadResult && (
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Uploaded {uploadResult.vectorCount} vectors to Pinecone index "{uploadResult.indexName}"
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
