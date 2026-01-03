// /pages/api/vectorize.ts (example)
import { NextApiRequest, NextApiResponse } from 'next';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';
import { Document } from '@langchain/core/documents';
// import { getPdfTextFromDbOrS3 } from '~/server/utils/documentUtils'; // Your utility

export default async function POST(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { documentId, pdfText } = req.body; // Assume pdfText is passed after parsing

    if (!pdfText || !documentId) {
        return res.status(400).json({ message: 'Missing pdfText or documentId' });
    }

    try {
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

        // Step 5: Upsert documents to Pinecone (embed and store)
        // Using documentId as namespace for easy isolation and management
        await PineconeStore.fromDocuments(lcDocuments, embeddings, {
            pineconeIndex,
            namespace: documentId, // Use documentId for isolation
            maxConcurrency: 5, // Limits concurrent API calls
        });

        console.log(`Successfully embedded and stored ${lcDocuments.length} chunks for document ${documentId} in Pinecone.`);
        
        return res.status(200).json({ 
            message: `Successfully vectorized and stored document ${documentId}`,
            chunkCount: lcDocuments.length,
            // 返回前3个块的预览信息，方便查看分块效果
            sampleChunks: chunks.slice(0, 3).map((chunk, i) => ({
                index: i,
                length: chunk.length,
                preview: chunk.substring(0, 100) + (chunk.length > 100 ? '...' : '')
            }))
        });

    } catch (error) {
        console.error("Error chunking text:", error);
        return res.status(500).json({ message: 'Error chunking text' });
    }
}