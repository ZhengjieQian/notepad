"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { useState } from "react";

interface VectorizeButtonProps {
  documentId: string;
  extractedText: string | null;
}

interface EmbeddingResult {
  message: string;
  chunkCount: number;
  sampleChunks: Array<{
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

export default function VectorizeButton({ documentId, extractedText }: VectorizeButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<EmbeddingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVectorize = async () => {
    if (!extractedText) {
      setError("没有可用的文本内容");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/documents/process-text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          documentId,
          pdfText: extractedText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "向量化处理失败");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      console.error("Vectorization error:", err);
      setError(err.message || "处理失败");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>向量化处理</span>
            <Button
              onClick={handleVectorize}
              disabled={isProcessing || !extractedText}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  生成向量嵌入
                </>
              )}
            </Button>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            将文档文本分块并生成 OpenAI Embeddings，存储到 Pinecone 向量数据库
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                  ✓ {result.message}
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">处理统计</p>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>总分块数: <Badge variant="secondary">{result.chunkCount}</Badge></p>
                  </div>
                </div>

                {result.embeddingPreview && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Embedding 测试结果</p>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground mb-1">第一个分块文本预览:</p>
                        <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                          {result.embeddingPreview.chunkText}
                        </pre>
                      </div>
                      <div>
                        <p className="text-muted-foreground">
                          向量维度: <Badge variant="outline">{result.embeddingPreview.dimension}</Badge>
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">向量前10个值:</p>
                        <pre className="text-xs bg-background p-2 rounded border overflow-x-auto">
                          {JSON.stringify(result.embeddingPreview.firstValues, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">分块预览 (前3个)</p>
                  <div className="space-y-2">
                    {result.sampleChunks.map((chunk) => (
                      <div key={chunk.index} className="p-2 bg-background rounded border">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            块 {chunk.index + 1}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {chunk.length} 字符
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {chunk.preview}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
