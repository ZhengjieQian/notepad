// src/app/documents/page.tsx
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import DocumentCard from "@/components/documents/DocumentCard";
import AddDocumentCard from "@/components/documents/AddDocumentCard";

async function getDocuments(userId: string) {
  const response = await fetch(`${process.env.NEXTAUTH_URL}/api/documents/list`, {
    cache: "no-store",
    headers: {
      Cookie: `next-auth.session-token=${userId}`, // This won't work, need different approach
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }
  
  return response.json();
}

// Better approach: Direct database query
import prisma from "@/lib/prisma";

async function getDocumentsFromDb(userId: string) {
  const documents = await prisma.document.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      size: true,
      status: true,
      contentType: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return documents;
}

export default async function DocumentsPage() {
  const session = await auth();
  
  if (!session?.user?.id) {
    redirect("/login");
  }

  const documents = await getDocumentsFromDb(session.user.id);

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            My Documents
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your uploaded PDF documents, {documents.length} total
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <AddDocumentCard />
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              fileName={doc.fileName}
              size={doc.size}
              status={doc.status as any}
              createdAt={doc.createdAt}
            />
          ))}
        </div>

        {documents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No documents uploaded yet, click the card above to start uploading
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
