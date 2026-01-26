// Get saved vocabulary for a document
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { auth } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    // 1. Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { documentId } = await context.params;

    // 2. Verify document ownership
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

    // 3. Fetch vocabulary from database
    const vocabulary = await prisma.vocabularyWord.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        term: true,
        definition: true,
        category: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: vocabulary.length,
      vocabulary,
    });

  } catch (error: any) {
    console.error('Error fetching vocabulary:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vocabulary' },
      { status: 500 }
    );
  }
}
