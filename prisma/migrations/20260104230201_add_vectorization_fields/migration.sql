-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "chunks" JSONB,
ADD COLUMN     "embeddings" JSONB,
ADD COLUMN     "vectorError" TEXT,
ADD COLUMN     "vectorStatus" TEXT;
