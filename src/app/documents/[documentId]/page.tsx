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
    pending_upload: { label: "待上传", variant: "outline" as const, color: "text-gray-500" },
    uploaded: { label: "已上传", variant: "secondary" as const, color: "text-blue-500" },
    parsing: { label: "解析中", variant: "secondary" as const, color: "text-yellow-500" },
    processed: { label: "已完成", variant: "default" as const, color: "text-green-500" },
    failed_parsing: { label: "解析失败", variant: "destructive" as const, color: "text-red-500" },
    failed_processing: { label: "处理失败", variant: "destructive" as const, color: "text-red-500" },
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
        {/* 返回按钮 */}
        <Link href="/documents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回文档列表
          </Button>
        </Link>

        {/* 文档标题 */}
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

        {/* 元数据卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>文档信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">文件大小</p>
                  <p className="text-sm text-muted-foreground">{formatFileSize(document.size)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">文件类型</p>
                  <p className="text-sm text-muted-foreground">{document.contentType || "未知"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">上传时间</p>
                  <p className="text-sm text-muted-foreground">{formatDate(document.createdAt)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">最后更新</p>
                  <p className="text-sm text-muted-foreground">{formatDate(document.updatedAt)}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">S3 存储路径</p>
              <code className="text-xs bg-muted px-2 py-1 rounded">{document.s3Key}</code>
            </div>

            {/* 下载按钮 */}
            <div className="pt-4 flex gap-3">
              <Link href={`/api/documents/${document.id}/download`} target="_blank">
                <Button>
                  <Download className="h-4 w-4 mr-2" />
                  下载原文件
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* 提取的文本内容 */}
        {document.extractedText && (
          <>
            {/* 向量化按钮 */}
            <VectorizeButton 
              documentId={document.id} 
              extractedText={document.extractedText} 
            />

            <Card>
              <CardHeader>
                <CardTitle>提取的文本内容</CardTitle>
                <p className="text-sm text-muted-foreground">
                  共 {document.extractedText.length} 个字符
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

        {/* 如果没有提取文本，显示提示 */}
        {!document.extractedText && document.status === "processed" && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">该文档没有提取到文本内容</p>
            </CardContent>
          </Card>
        )}

        {/* 如果正在处理，显示提示 */}
        {(document.status === "pending_upload" || document.status === "uploaded" || document.status === "parsing") && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">文档正在处理中，请稍后刷新页面查看提取的文本</p>
            </CardContent>
          </Card>
        )}

        {/* 如果处理失败，显示错误 */}
        {(document.status === "failed_parsing" || document.status === "failed_processing") && (
          <Card className="border-destructive">
            <CardContent className="py-12 text-center">
              <p className="text-destructive">文档处理失败，无法提取文本内容</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
