// src/app/api/documents/finalize-upload/route.ts
import 'pdf-parse/worker'; // Import worker FIRST - critical for Next.js
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import prisma from "@/lib/prisma";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { PDFParse } from 'pdf-parse';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let documentIdFromBody: string | undefined;

  try {
    const body = await request.json();
    documentIdFromBody = body.documentId; // Store for potential use in catch block
    const { documentId, s3Key } = body;

    if (!documentId || !s3Key) {
      return NextResponse.json({ error: "documentId and s3Key are required" }, { status: 400 });
    }

    // 1. Optionally get file size from S3 (if not sent from client or for verification)
    const objectMetadata = await s3Client.send(new GetObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: s3Key}));
    const fileSize = objectMetadata.ContentLength;

    // Update document status to 'uploaded' and store size
    await prisma.document.update({
      where: { id: documentId, userId: session.user.id },
      data: { status: "uploaded", size: fileSize },
    });

    // 2. Download PDF from S3
    const getObjectParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: s3Key,
    };
    const command = new GetObjectCommand(getObjectParams);
    const s3Object = await s3Client.send(command);

    if (!s3Object.Body) {
      throw new Error("Failed to download file from S3");
    }

    const pdfBuffer = await streamToBuffer(s3Object.Body as Readable);

    // 3. Parse PDF
    let extractedText = "";
    try {
      await prisma.document.update({ where: { id: documentId }, data: { status: "parsing" }});
      
      // Correct usage of pdf-parse
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      extractedText = result.text;
      await parser.destroy();

      // // Log extracted text for verification
      // console.log("=== PDF Text Extraction Success ===");
      // console.log(`Document ID: ${documentId}`);
      // console.log(`Total text length: ${extractedText.length} characters`);
      // console.log(`\n--- First 500 characters ---`);
      // console.log(extractedText.substring(0, 500));
      // console.log(`\n--- Last 200 characters ---`);
      // console.log(extractedText.substring(Math.max(0, extractedText.length - 200)));
      // console.log("=================================\n");
    } catch (parseError) {
      console.error("PDF parsing error:", parseError);
       await prisma.document.update({
        where: { id: documentId },
        data: { status: "failed_parsing" },
      });
      return NextResponse.json({ error: "Failed to parse PDF" }, { status: 500 });
    }

    // 4. Update document with extracted text and status 'processed'
    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedText,
        status: "processed",
      },
    });

    return NextResponse.json({
      message: "Document processed successfully",
      documentId: updatedDocument.id,
      extractedTextLength: extractedText.length,
    });

  } catch (error: any) {
    console.error("Finalize upload error:", error);
    if (documentIdFromBody && session?.user?.id) {
         await prisma.document.updateMany({
            where: { id: documentIdFromBody, userId: session.user.id }, // ensure user owns doc
            data: { status: "failed_processing" },
        }).catch(e => console.error("Failed to update doc status on error:", e));
    }
    return NextResponse.json({ error: "Failed to process document: " + error.message }, { status: 500 });
  }
}