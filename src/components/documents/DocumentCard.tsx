// src/components/documents/DocumentCard.tsx
"use client";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FileText, Calendar, HardDrive, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DocumentStatus = "pending_upload" | "uploaded" | "parsing" | "processed" | "failed_parsing" | "failed_processing";

interface DocumentCardProps {
  id: string;
  fileName: string;
  size: number | null;
  status: DocumentStatus;
  createdAt: Date;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
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

export default function DocumentCard({ id, fileName, size, status, createdAt }: DocumentCardProps) {
  const statusConfig = getStatusConfig(status);
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    console.log("开始删除文档:", id);
    setIsDeleting(true);

    try {
      console.log("发送删除请求到:", `/api/documents/${id}`);
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "删除失败");
      }

      console.log("删除成功，刷新页面");
      // 删除成功，刷新页面
      router.refresh();
    } catch (error: any) {
      console.error("删除文档失败:", error);
      alert(`删除失败: ${error.message}`);
      setIsDeleting(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/documents/${id}`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full flex flex-col">
      <div onClick={handleCardClick} className="flex-1 cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <h3 className="font-semibold text-sm truncate" title={fileName}>
                {fileName}
              </h3>
            </div>
            <Badge variant={statusConfig.variant} className={statusConfig.color}>
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              <span>{formatFileSize(size)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(createdAt)}</span>
            </div>
          </div>
        </CardContent>
      </div>

      {/* 删除按钮 - 放在卡片底部右下角 */}
      <CardFooter className="pt-0 pb-3 px-6 flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-3"
              onClick={(e) => {
                console.log("删除按钮被点击了！");
                e.stopPropagation(); // 阻止事件冒泡到卡片的点击事件
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              删除
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认删除文档？</AlertDialogTitle>
              <AlertDialogDescription>
                此操作无法撤销。将永久删除文档 &quot;{fileName}&quot; 及其在云端的文件。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "删除中..." : "确认删除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
