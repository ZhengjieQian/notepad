// AI-powered vocabulary extraction from document text
import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import prisma from '@/lib/prisma';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export const runtime = 'nodejs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VocabularyEntry {
  term: string;
  definition: string;
  category?: string; // Optional: technical, business, general, etc.
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { text, documentId } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid text provided' },
        { status: 400 }
      );
    }

    // 3. Verify document ownership (if documentId provided)
    if (documentId) {
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
    }

    console.log(`\n=== Vocabulary Extraction Started ===`);
    console.log(`User: ${session.user.email}`);
    console.log(`Document ID: ${documentId || 'N/A'}`);
    console.log(`Text length: ${text.length} characters`);

    // 4. Construct prompt for LLM
    const prompt = `You are an expert at analyzing documents and extracting technical terms, key concepts, and their definitions.

Please analyze the following text and extract all important terms, concepts, acronyms, and their clear definitions.

Guidelines:
- Extract technical terms, acronyms, key concepts, and specialized vocabulary
- Provide clear, concise definitions (1-2 sentences max)
- Only extract terms that are actually defined or clearly explained in the text
- Categorize each term as: "technical", "business", "general", or "acronym"
- Return ONLY a valid JSON object with a "vocabulary" array
- If no terms are found, return an empty array

Text to analyze:
"""
${text.substring(0, 8000)}
"""

Return format:
{
  "vocabulary": [
    {
      "term": "Example Term",
      "definition": "Clear definition of the term",
      "category": "technical"
    }
  ]
}`;

    // 5. Call OpenAI API
    console.log('Calling OpenAI for vocabulary extraction...');
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Good balance of cost and quality
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2, // Low temperature for more deterministic output
      response_format: { type: 'json_object' }, // Ensure JSON output
      max_tokens: 2000,
    });

    // 6. Parse the response
    let extractedVocabulary: VocabularyEntry[] = [];
    const content = completion.choices[0]?.message?.content;

    if (content) {
      try {
        const parsedJson = JSON.parse(content);
        
        // Handle different possible response structures
        if (Array.isArray(parsedJson)) {
          extractedVocabulary = parsedJson;
        } else if (parsedJson.vocabulary && Array.isArray(parsedJson.vocabulary)) {
          extractedVocabulary = parsedJson.vocabulary;
        } else if (parsedJson.terms && Array.isArray(parsedJson.terms)) {
          extractedVocabulary = parsedJson.terms;
        }

        // Validate and filter entries
        extractedVocabulary = extractedVocabulary.filter(
          (item: any): item is VocabularyEntry =>
            typeof item.term === 'string' &&
            typeof item.definition === 'string' &&
            item.term.length > 0 &&
            item.definition.length > 0
        );

        console.log(`✓ Extracted ${extractedVocabulary.length} vocabulary entries`);

        // Log sample entries
        if (extractedVocabulary.length > 0) {
          console.log('\nSample entries:');
          extractedVocabulary.slice(0, 3).forEach((entry, i) => {
            console.log(`${i + 1}. ${entry.term}: ${entry.definition.substring(0, 80)}...`);
          });
        }

      } catch (parseError) {
        console.error('Failed to parse LLM JSON output:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse AI response', details: String(parseError) },
          { status: 500 }
        );
      }
    }

    // 7. Store vocabulary in database
    if (extractedVocabulary.length > 0 && documentId) {
      console.log('Saving vocabulary to database...');
      
      // Delete existing vocabulary for this document first
      await prisma.vocabularyWord.deleteMany({
        where: { documentId },
      });

      // Create new vocabulary entries
      await prisma.vocabularyWord.createMany({
        data: extractedVocabulary.map(entry => ({
          documentId,
          term: entry.term,
          definition: entry.definition,
          category: entry.category || 'general',
        })),
      });

      console.log(`✓ Saved ${extractedVocabulary.length} terms to database`);
    }

    console.log('✓ Vocabulary Extraction Completed\n');

    // 8. Return the extracted vocabulary
    return NextResponse.json({
      success: true,
      count: extractedVocabulary.length,
      vocabulary: extractedVocabulary,
    });

  } catch (error: any) {
    console.error('❌ Error extracting vocabulary:', error);
    
    // Handle specific errors
    let errorMessage = 'Failed to extract vocabulary';
    if (error.message?.includes('API key')) {
      errorMessage = 'OpenAI API key is invalid';
    } else if (error.status === 429) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}
