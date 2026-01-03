// src/app/api/documents/[documentId]/route.ts
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId } = await params;

    // 1. 验证文档存在且属于当前用户
    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        userId: session.user.id, // 确保用户只能删除自己的文档
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or unauthorized" },
        { status: 404 }
      );
    }

    // 2. 先删除 S3 文件（如果这步失败，数据库记录还在，用户可以重试）
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: document.s3Key,
      });
      await s3Client.send(deleteCommand);
      console.log(`Successfully deleted S3 file: ${document.s3Key}`);
    } catch (s3Error) {
      console.error("Error deleting from S3:", s3Error);
      // S3 删除失败，返回错误但不继续删除数据库记录
      return NextResponse.json(
        { error: "Failed to delete file from storage" },
        { status: 500 }
      );
    }

    // 3. 删除数据库记录
    await prisma.document.delete({
      where: { id: documentId },
    });

    console.log(`Successfully deleted document ${documentId} from database`);

    return NextResponse.json({
      message: "Document deleted successfully",
      documentId,
    });
  } catch (error: any) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Failed to delete document: " + error.message },
      { status: 500 }
    );
  }
}

// GET - 获取单个文档详情（为后续详情页准备）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { documentId } = await params;

    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        userId: session.user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}
