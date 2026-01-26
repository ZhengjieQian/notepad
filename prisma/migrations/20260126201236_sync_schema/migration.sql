/*
  Warnings:

  - You are about to drop the column `chunks` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `vectorError` on the `Document` table. All the data in the column will be lost.
  - You are about to drop the column `vectorStatus` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "chunks",
DROP COLUMN "vectorError",
DROP COLUMN "vectorStatus",
ADD COLUMN     "chunkCount" INTEGER,
ADD COLUMN     "embeddingModel" TEXT,
ADD COLUMN     "pineconeUploadedAt" TIMESTAMP(3),
ADD COLUMN     "uploadedToPinecone" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "vectorizedAt" TIMESTAMP(3),
ALTER COLUMN "embeddings" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "VocabularyWord" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "category" TEXT,
    "documentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyWord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VocabularyWord_documentId_idx" ON "VocabularyWord"("documentId");

-- CreateIndex
CREATE INDEX "VocabularyWord_term_idx" ON "VocabularyWord"("term");

-- AddForeignKey
ALTER TABLE "VocabularyWord" ADD CONSTRAINT "VocabularyWord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
