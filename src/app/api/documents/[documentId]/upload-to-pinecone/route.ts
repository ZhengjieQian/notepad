// Upload embeddings to Pinecone vector database
import { NextRequest, NextResponse } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import prisma from '@/lib/prisma';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ documentId: string }> }
) {
    try {
        // Verify authentication
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { documentId } = await context.params;

        // Get document from database
        const document = await prisma.document.findUnique({
            where: {
                id: documentId,
                userId: session.user.id,
            },
        });

        if (!document) {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        if (!document.embeddings) {
            return NextResponse.json(
                { error: 'No embeddings available. Please generate embeddings first.' },
                { status: 400 }
            );
        }

        if (document.uploadedToPinecone) {
            return NextResponse.json(
                { error: 'Embeddings have already been uploaded to Pinecone' },
                { status: 400 }
            );
        }

        console.log(`\n=== Starting Pinecone Upload for Document ${documentId} ===`);

        // Parse embeddings from database
        const embeddingsData = JSON.parse(document.embeddings);
        console.log(`✓ Loaded ${embeddingsData.length} embeddings from database`);

        // Initialize Pinecone
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });

        const indexName = process.env.PINECONE_INDEX_NAME!;
        console.log(`Connecting to Pinecone index: ${indexName}`);

        // Get index
        const index = pinecone.Index(indexName);

        // Prepare vectors for upsert
        const vectors = embeddingsData.map((item: any) => ({
            id: `${documentId}-chunk-${item.index}`,
            values: item.embedding,
            metadata: {
                documentId: documentId,
                chunkIndex: item.index,
                text: item.text,
                fileName: document.fileName,
                userId: session.user.id,
            },
        }));

        // Upload to Pinecone in batches
        const batchSize = 100;
        let uploadedCount = 0;

        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            
            await index.namespace(documentId).upsert(batch);
            
            uploadedCount += batch.length;
            console.log(`✓ Uploaded batch ${Math.floor(i / batchSize) + 1}: ${uploadedCount}/${vectors.length} vectors`);
        }

        // Update document status
        await prisma.document.update({
            where: { id: documentId },
            data: {
                uploadedToPinecone: true,
                pineconeUploadedAt: new Date(),
            },
        });

        console.log(`✓ Successfully uploaded all vectors to Pinecone\n`);

        return NextResponse.json({
            success: true,
            message: 'Embeddings uploaded to Pinecone successfully',
            vectorCount: vectors.length,
            indexName: indexName,
            namespace: documentId,
        });

    } catch (error: any) {
        console.error("❌ Error uploading to Pinecone:", error);

        // Detailed error messages
        let errorMessage = 'Failed to upload to Pinecone';
        let errorDetails = error.message;

        if (error.message?.includes('404') || error.statusCode === 404) {
            errorMessage = 'Pinecone index not found';
            errorDetails = `Index "${process.env.PINECONE_INDEX_NAME}" does not exist. Please create it in the Pinecone console first.`;
        } else if (error.message?.includes('API key') || error.message?.includes('401')) {
            errorMessage = 'Pinecone API key is invalid';
            errorDetails = 'Please check your PINECONE_API_KEY environment variable';
        } else if (error.message?.includes('dimension')) {
            errorMessage = 'Embedding dimension mismatch';
            errorDetails = 'The Pinecone index dimension does not match the embedding dimension (should be 1536 for text-embedding-ada-002)';
        } else if (error.message?.includes('network')) {
            errorMessage = 'Network error connecting to Pinecone';
            errorDetails = 'Please check your internet connection';
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: errorDetails,
                step: 'pinecone_upload',
            },
            { status: 500 }
        );
    }
}
