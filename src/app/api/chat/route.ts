// RAG Chat API with Server-Sent Events (SSE) streaming
import { NextRequest } from 'next/server';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from '@langchain/openai';
import { OpenAI } from 'openai';
import prisma from '@/lib/prisma';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Initialize OpenAI and Pinecone clients
const embeddingsModel = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'text-embedding-ada-002',
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(req: NextRequest) {
  // Create a readable stream for SSE
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // 1. Authentication check
        const session = await auth();
        if (!session?.user?.id) {
          sendEvent('[ERROR] Unauthorized');
          sendEvent('[DONE]');
          controller.close();
          return;
        }

        // 2. Parse query parameters
        const searchParams = req.nextUrl.searchParams;
        const question = searchParams.get('question');
        const documentId = searchParams.get('documentId');

        if (!question || !documentId) {
          sendEvent('[ERROR] Missing question or documentId');
          sendEvent('[DONE]');
          controller.close();
          return;
        }

        console.log(`\n=== RAG Query Started ===`);
        console.log(`User: ${session.user.email}`);
        console.log(`Question: ${question}`);
        console.log(`Document ID: ${documentId}`);

        // 3. Verify document belongs to user and is vectorized
        const document = await prisma.document.findUnique({
          where: {
            id: documentId,
            userId: session.user.id,
          },
        });

        if (!document) {
          sendEvent('[ERROR] Document not found');
          sendEvent('[DONE]');
          controller.close();
          return;
        }

        if (!document.uploadedToPinecone) {
          sendEvent('[ERROR] Document has not been vectorized yet. Please vectorize the document first.');
          sendEvent('[DONE]');
          controller.close();
          return;
        }

        // 4. Generate embedding for the question
        console.log('Generating question embedding...');
        const queryEmbedding = await embeddingsModel.embedQuery(question);
        console.log(`✓ Question embedding generated (${queryEmbedding.length} dimensions)`);

        // 5. Query Pinecone for relevant chunks
        console.log('Querying Pinecone for relevant chunks...');
        const index = pinecone.Index(process.env.PINECONE_INDEX_NAME!);
        const namespace = index.namespace(documentId);

        const queryResponse = await namespace.query({
          vector: queryEmbedding,
          topK: 5, // Retrieve top 5 most relevant chunks
          includeMetadata: true,
        });

        console.log(`✓ Retrieved ${queryResponse.matches.length} relevant chunks`);

        // 6. Check if we found relevant context
        if (queryResponse.matches.length === 0) {
          sendEvent("I could not find any relevant information in the selected document to answer your question.");
          sendEvent('[DONE]');
          controller.close();
          return;
        }

        // 7. Extract context from retrieved chunks
        const contextChunks = queryResponse.matches
          .filter(match => match.score && match.score > 0.7) // Filter by relevance score
          .map((match) => {
            const text = match.metadata?.text as string;
            const score = match.score || 0;
            return {
              text,
              score,
              preview: `[Relevance: ${(score * 100).toFixed(1)}%]\n${text}`
            };
          });

        if (contextChunks.length === 0) {
          sendEvent("I could not find sufficiently relevant information in the document to answer your question.");
          sendEvent('[DONE]');
          controller.close();
          return;
        }

        const contextText = contextChunks
          .map(chunk => chunk.preview)
          .join('\n\n---\n\n');

        console.log(`✓ Context prepared (${contextChunks.length} chunks, avg score: ${(contextChunks.reduce((sum, c) => sum + c.score, 0) / contextChunks.length * 100).toFixed(1)}%)`);

        // 8. Build the prompt
        const prompt = `You are a helpful AI assistant answering questions based on the provided document context.

Context from the document "${document.fileName}":
---
${contextText}
---

User's Question:
${question}

Instructions:
- Answer the question based ONLY on the information provided in the context above.
- If the context doesn't contain enough information to answer the question, say so honestly.
- Be concise, accurate, and helpful.
- Cite specific parts of the context when relevant.
- Do not make up information that is not in the context.

Answer:`;

        // 9. Stream response from OpenAI
        console.log('Streaming response from OpenAI...');
        const chatStream = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Or 'gpt-3.5-turbo' for lower cost
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        });

        // 10. Forward stream to client
        for await (const chunk of chatStream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            // Send each token to the client
            sendEvent(content);
          }
        }

        console.log('✓ RAG Query Completed\n');

      } catch (error: any) {
        console.error('❌ Error in RAG chat:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });

        // Send error message to client
        let errorMessage = 'An error occurred while processing your request.';
        
        if (error.message?.includes('API key')) {
          errorMessage = 'OpenAI API key is invalid or missing.';
        } else if (error.message?.includes('rate limit')) {
          errorMessage = 'Rate limit exceeded. Please try again in a moment.';
        } else if (error.message?.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.status === 401) {
          errorMessage = 'Authentication failed with OpenAI.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        sendEvent(`[ERROR] ${errorMessage}`);
      } finally {
        // Always send completion signal
        sendEvent('[DONE]');
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}
