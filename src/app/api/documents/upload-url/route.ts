// src/app/api/documents/upload-url/route.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/app/api/auth/[...nextauth]/route"; // Your NextAuth.js auth function
import prisma from "@/lib/prisma"; // Your Prisma Client instance
import { NextResponse } from "next/server";
import cuid from 'cuid'; // npm install cuid

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileName, contentType } = await request.json();
    if (!fileName || !contentType) {
      return NextResponse.json({ error: "fileName and contentType are required" }, { status: 400 });
    }

    const s3Key = `uploads/${session.user.id}/${cuid()}/${fileName}`; // Generate a unique S3 Key

    // 1. Create document record in the database (status: pending_upload)
    const document = await prisma.document.create({
      data: {
        fileName,
        s3Key,
        contentType,
        userId: session.user.id,
        status: "pending_upload", // Initial status
      },
    });

    // 2. Generate Presigned URL
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
      ContentType: contentType,
      // ACL: 'private', // or other ACL you need
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL valid for 1 hour

    return NextResponse.json({ uploadUrl, documentId: document.id, s3Key });

  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }
}