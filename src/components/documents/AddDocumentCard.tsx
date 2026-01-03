// src/components/documents/AddDocumentCard.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function AddDocumentCard() {
  return (
    <Link href="/upload">
      <Card className="hover:shadow-lg hover:border-primary transition-all cursor-pointer h-full border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
          <div className="rounded-full bg-primary/10 p-4 mb-3">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">添加文档</h3>
          <p className="text-sm text-muted-foreground mt-1">上传新的 PDF 文件</p>
        </CardContent>
      </Card>
    </Link>
  );
}
