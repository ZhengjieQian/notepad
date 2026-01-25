// src/app/chat/[documentId]/page.tsx
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ChatPageClient from "@/components/chat/ChatPageClient";

async function getDocument(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: {
      id: documentId,
      userId: userId,
    },
    select: {
      id: true,
      fileName: true,
      uploadedToPinecone: true,
      chunkCount: true,
    },
  });
  return document;
}

export default async function ChatPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { documentId } = await params;
  const document = await getDocument(documentId, session.user.id);

  if (!document) {
    redirect("/documents");
  }

  return <ChatPageClient document={document} />;
}
