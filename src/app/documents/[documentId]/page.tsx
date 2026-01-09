// src/app/documents/[documentId]/page.tsx
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, HardDrive, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import VectorizeButton from "@/components/documents/VectorizeButton";

type DocumentStatus = "pending_upload" | "uploaded" | "parsing" | "processed" | "failed_parsing" | "failed_processing";

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getStatusConfig(status: DocumentStatus) {
  const configs = {
    pending_upload: { label: "Pending Upload", variant: "outline" as const, color: "text-gray-500" },
    uploaded: { label: "Uploaded", variant: "secondary" as const, color: "text-blue-500" },
    parsing: { label: "Parsing", variant: "secondary" as const, color: "text-yellow-500" },
    processed: { label: "Completed", variant: "default" as const, color: "text-green-500" },
    failed_parsing: { label: "Parse Failed", variant: "destructive" as const, color: "text-red-500" },
    failed_processing: { label: "Process Failed", variant: "destructive" as const, color: "text-red-500" },
  };
  return configs[status] || configs.pending_upload;
}

async function getDocument(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
      userId: userId,
    },
  });
  return document;
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { documentId } = await params;
  const document = await getDocument(documentId, session.user.id);

  if (!document) {
    redirect("/documents");
  }

  const statusConfig = getStatusConfig(document.status as DocumentStatus);

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back button */}
        <Link href="/documents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Documents
          </Button>
        </Link>

        {/* Document title */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {document.fileName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusConfig.variant} className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>
        </div>

        {/* Metadata card */}
        <Card>
          <CardHeader>
            <CardTitle>Document Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">File Size</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(document.size)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">File Type</p>
                  <p className="text-sm text-muted-foreground">{document.contentType || "Unknown"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Upload Time</p>
                  <p className="text-sm text-muted-foreground">{formatDate(document.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">{formatDate(document.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">S3 Storage Path</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">{document.s3Key}</code>
            </div>

            {/* Download button */}
            <div className="pt-4 flex gap-3">
              <Link href={`/api/documents/${document.id}/download`} target="_blank">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  Download Original File
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Extracted text content */}
        {document.extractedText && (
          <>
            {/* Vectorization button */}
            <VectorizeButton 
              documentId={document.id} 
              extractedText={document.extractedText}
              hasEmbeddings={!!document.embeddings}
              uploadedToPinecone={document.uploadedToPinecone}
              chunkCount={document.chunkCount}
            />

            <Card>
              <CardHeader>
                <CardTitle>Extracted Text Content</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total {document.extractedText.length} characters
                </p>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                    {document.extractedText}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* If no extracted text, show message */}
        {!document.extractedText && document.status === "processed" && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No text content extracted from this document</p>
            </CardContent>
          </Card>
        )}

        {/* If processing, show message */}
        {(document.status === "pending_upload" || document.status === "uploaded" || document.status === "parsing") && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Document is being processed, please refresh the page later to view extracted text</p>
            </CardContent>
          </Card>
        )}

        {/* If processing failed, show error */}
        {(document.status === "failed_parsing" || document.status === "failed_processing") && (
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Document processing failed, unable to extract text content</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
