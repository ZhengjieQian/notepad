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
    pending_upload: { label: "Pending Upload", variant: "outline" as const, color: "text-gray-500" },
    uploaded: { label: "Uploaded", variant: "secondary" as const, color: "text-blue-500" },
    parsing: { label: "Parsing", variant: "secondary" as const, color: "text-yellow-500" },
    processed: { label: "Completed", variant: "default" as const, color: "text-green-500" },
    failed_parsing: { label: "Parse Failed", variant: "destructive" as const, color: "text-red-500" },
    failed_processing: { label: "Process Failed", variant: "destructive" as const, color: "text-red-500" },
  };
  return configs[status] || configs.pending_upload;
}

export default function DocumentCard({ id, fileName, size, status, createdAt }: DocumentCardProps) {
  const statusConfig = getStatusConfig(status);
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    console.log("Starting document deletion:", id);
    setIsDeleting(true);

    try {
      console.log("Sending delete request to:", `/api/documents/${id}`);
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Delete failed");
      }

      console.log("Deletion successful, refreshing page");
      // Deletion successful, refresh the page
      router.refresh();
    } catch (error: any) {
      console.error("Document deletion failed:", error);
      alert(`Delete failed: ${error.message}`);
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

      {/* Delete button - positioned at bottom right of card */}
      <CardFooter className="pt-0 pb-3 px-6 flex justify-end">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="h-8 px-3"
              onClick={(e) => {
                console.log("Delete button clicked!");
                e.stopPropagation(); // Prevent event bubbling to card click handler
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Document Deletion?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete document &quot;{fileName}&quot; and its files in cloud storage.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
