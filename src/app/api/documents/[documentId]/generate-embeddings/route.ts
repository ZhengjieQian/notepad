// Generate embeddings for document text chunks
import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
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

        if (!document.extractedText) {
            return NextResponse.json(
                { error: 'No extracted text available for this document' },
                { status: 400 }
            );
        }

        console.log(`\n=== Starting Embedding Generation for Document ${documentId} ===`);
        
        // Verify OpenAI API key exists
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured in environment variables');
        }

        // Step 1: Split text into chunks
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await textSplitter.splitText(document.extractedText);
        console.log(`✓ Text split into ${chunks.length} chunks`);

        // Step 2: Initialize OpenAI Embeddings
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-ada-002",
        });

        // Step 3: Generate embeddings for all chunks
        console.log('Starting embedding generation...');
        const embeddingVectors = await embeddings.embedDocuments(chunks);
        console.log(`✓ Generated ${embeddingVectors.length} embedding vectors`);

        // Step 4: Store embeddings in database as JSON
        const embeddingsData = chunks.map((chunk, index) => ({
            index,
            text: chunk,
            embedding: embeddingVectors[index],
        }));

        await prisma.document.update({
            where: { id: documentId },
            data: {
                embeddings: JSON.stringify(embeddingsData),
                chunkCount: chunks.length,
                embeddingModel: "text-embedding-ada-002",
                vectorizedAt: new Date(),
                uploadedToPinecone: false, // Not uploaded yet
            },
        });

        console.log(`✓ Embeddings saved to database\n`);

        return NextResponse.json({
            success: true,
            message: 'Embeddings generated successfully',
            chunkCount: chunks.length,
            embeddingDimension: embeddingVectors[0].length,
            sampleChunks: chunks.slice(0, 3).map((chunk, i) => ({
                index: i,
                length: chunk.length,
                preview: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : '')
            })),
            embeddingPreview: {
                dimension: embeddingVectors[0].length,
                firstValues: embeddingVectors[0].slice(0, 10),
                chunkText: chunks[0].substring(0, 200) + (chunks[0].length > 200 ? '...' : '')
            }
        });

    } catch (error: any) {
        console.error("❌ Error generating embeddings:", error);
        console.error("Error details:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
            cause: error.cause
        });
        
        // Detailed error messages
        let errorMessage = 'Failed to generate embeddings';
        let errorDetails = error.message;

        if (error.message?.includes('API key') || error.message?.includes('OPENAI_API_KEY')) {
            errorMessage = 'OpenAI API key is invalid or missing';
            errorDetails = 'Please check your OPENAI_API_KEY environment variable';
        } else if (error.message?.includes('rate limit')) {
            errorMessage = 'OpenAI API rate limit exceeded';
            errorDetails = 'Please wait a moment and try again';
        } else if (error.message?.includes('network') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            errorMessage = 'Network error connecting to OpenAI';
            errorDetails = 'Please check your internet connection and firewall settings';
        } else if (error.status === 401 || error.status === 403) {
            errorMessage = 'OpenAI API authentication failed';
            errorDetails = 'Your API key may be invalid or expired';
        } else if (error.status === 429) {
            errorMessage = 'Too many requests to OpenAI API';
            errorDetails = 'Rate limit exceeded. Please try again later';
        }

        return NextResponse.json(
            {
                error: errorMessage,
                details: errorDetails,
                step: 'embedding_generation',
            },
            { status: 500 }
        );
    }
}
