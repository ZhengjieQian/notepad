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

    // 1. Verify document exists and belongs to current user
    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        userId: session.user.id, // Ensure user can only delete their own documents
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found or unauthorized" },
        { status: 404 }
      );
    }

    // 2. Delete S3 file first (if this fails, database record remains, user can retry)
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: document.s3Key,
      });
      await s3Client.send(deleteCommand);
      console.log(`Successfully deleted S3 file: ${document.s3Key}`);
    } catch (s3Error) {
      console.error("Error deleting from S3:", s3Error);
      // S3 deletion failed, return error without deleting database record
      return NextResponse.json(
        { error: "Failed to delete file from storage" },
        { status: 500 }
      );
    }

    // 3. Delete database record
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

// GET - Retrieve single document details (for detail page)
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
