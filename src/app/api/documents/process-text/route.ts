// App Router API endpoint for vectorizing document text
import { NextRequest, NextResponse } from 'next/server';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { Document } from '@langchain/core/documents';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { documentId, pdfText } = body;

        if (!pdfText || !documentId) {
            return NextResponse.json(
                { message: 'Missing pdfText or documentId' },
                { status: 400 }
            );
        }
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000, // Target size of each chunk (in characters)
            chunkOverlap: 200, // Overlap between chunks
        });

        const chunks = await textSplitter.splitText(pdfText);
        // LangChain's splitText returns an array of strings (the chunks)

        // To use with PineconeStore.fromDocuments, we need LangChain Document objects
        const lcDocuments = chunks.map((chunkContent, index) =>
            new Document({
                pageContent: chunkContent,
                metadata: {
                    documentId: documentId, // From our PostgreSQL DB
                    chunkIndex: index,
                    text: chunkContent, // Optional: PineconeStore stores pageContent by default
                },
            })
        );

        console.log(`Document ${documentId} split into ${lcDocuments.length} chunks.`);
        
        // Step 3: Initialize Pinecone client
        const pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });
        const pineconeIndexName = process.env.PINECONE_INDEX_NAME!;
        const pineconeIndex = pinecone.Index(pineconeIndexName);

        // Step 4: Initialize OpenAI Embeddings model
        const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "text-embedding-ada-002",
        });

        // Test embedding generation on first chunk
        console.log('\n=== Testing Embedding Generation ===');
        console.log('First chunk text preview:', chunks[0].substring(0, 200));
        const testEmbedding = await embeddings.embedQuery(chunks[0]);
        console.log('Embedding vector dimension:', testEmbedding.length);
        console.log('First 10 values of embedding vector:', testEmbedding.slice(0, 10));
        console.log('Embedding generation successful! ✓\n');

        // Step 5: Upsert documents to Pinecone (embed and store)
        // Using documentId as namespace for easy isolation and management
        await PineconeStore.fromDocuments(lcDocuments, embeddings, {
            pineconeIndex,
            namespace: documentId, // Use documentId for isolation
            maxConcurrency: 5, // Limits concurrent API calls
        });

        console.log(`Successfully embedded and stored ${lcDocuments.length} chunks for document ${documentId} in Pinecone.`);
        
        return NextResponse.json({ 
            message: `Successfully vectorized and stored document ${documentId}`,
            chunkCount: lcDocuments.length,
            // Return preview of first 3 chunks for verification
            sampleChunks: chunks.slice(0, 3).map((chunk, i) => ({
                index: i,
                length: chunk.length,
                preview: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : '')
            })),
            // Return embedding test results for validation
            embeddingPreview: {
                dimension: testEmbedding.length,
                firstValues: testEmbedding.slice(0, 10),
                chunkText: chunks[0].substring(0, 200) + (chunks[0].length > 200 ? '...' : '')
            }
        }, { status: 200 });

    } catch (error) {
        console.error("Error processing document:", error);
        return NextResponse.json(
            { 
                message: 'Error processing document', 
                error: error instanceof Error ? error.message : 'Unknown error' 
            },
            { status: 500 }
        );
    }
}