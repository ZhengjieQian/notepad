// src/app/documents/[documentId]/vocabulary/page.tsx
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import VocabularyViewer from '@/components/documents/VocabularyViewer';

export const dynamic = 'force-dynamic';

interface VocabularyEntry {
  id: string;
  term: string;
  definition: string;
  category: string | null;
  createdAt: Date;
}

async function getVocabulary(
  documentId: string,
  userId: string
): Promise<{ document: any; vocabulary: VocabularyEntry[] }> {
  // Verify document ownership
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
      userId: userId,
    },
    select: {
      id: true,
      fileName: true,
      status: true,
    },
  });

  if (!document) {
    return { document: null, vocabulary: [] };
  }

  // Fetch vocabulary
  const vocabulary = await prisma.vocabularyWord.findMany({
    where: { documentId },
    orderBy: [{ category: 'asc' }, { term: 'asc' }],
    select: {
      id: true,
      term: true,
      definition: true,
      category: true,
      createdAt: true,
    },
  });

  return { document, vocabulary };
}

export default async function VocabularyPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { documentId } = await params;
  const { document, vocabulary } = await getVocabulary(
    documentId,
    session.user.id
  );

  if (!document) {
    redirect('/documents');
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header with back button */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href={`/documents/${documentId}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Document</span>
          </Link>
        </div>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Vocabulary from Document</h1>
          <p className="text-muted-foreground">
            {document.fileName}
          </p>
        </div>

        {/* Vocabulary Viewer */}
        <VocabularyViewer
          vocabulary={vocabulary.map((v) => ({
            id: v.id,
            term: v.term,
            definition: v.definition,
            category: v.category || undefined,
            createdAt: v.createdAt.toISOString(),
          }))}
          title={`${vocabulary.length} Terms Found`}
        />
      </div>
    </div>
  );
}
