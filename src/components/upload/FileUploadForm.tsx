// src/components/upload/FileUploadForm.tsx
"use client";
import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "next-auth/react";

export default function FileUploadForm() {
  const { data: session } = useSession();
  const [file, setFile] = useState<File | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile && selectedFile.type === "application/pdf") {
      setFile(selectedFile);
      setStatusMessage("");
    } else {
      setFile(null);
      setStatusMessage("Please select a PDF file.");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setStatusMessage("Please select a file first.");
      return;
    }
    if (!session) {
      setStatusMessage("You must be logged in to upload files.");
      return;
    }

    setIsUploading(true);
    setStatusMessage("Requesting upload URL...");

    try {
      // 1. Get Presigned URL and document ID from our backend
      const presignedUrlResponse = await fetch("/api/documents/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      });

      if (!presignedUrlResponse.ok) {
        const errorData = await presignedUrlResponse.json();
        throw new Error(errorData.error || "Failed to get upload URL.");
      }

      const { uploadUrl, documentId, s3Key } = await presignedUrlResponse.json();
      setStatusMessage("Uploading file to S3...");

      // 2. Upload file directly to S3 using the Presigned URL
      const s3UploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!s3UploadResponse.ok) {
        throw new Error("S3 Upload failed.");
      }
      setStatusMessage("File uploaded to S3. Finalizing...");

      // 3. Notify backend that upload is complete & trigger processing
      const finalizeResponse = await fetch("/api/documents/finalize-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, s3Key }),
      });

      if (!finalizeResponse.ok) {
         const errorData = await finalizeResponse.json();
        throw new Error(errorData.error || "Failed to finalize upload.");
      }

      const result = await finalizeResponse.json();
      setStatusMessage(`Upload successful! Document processed. Extracted text length: ${result.extractedTextLength || 0}`);
      setFile(null);
      if(fileInputRef.current) fileInputRef.current.value = ""; // Clear file input

    } catch (error: any) {
      console.error("Upload error:", error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Input type="file" accept=".pdf" onChange={handleFileChange} ref={fileInputRef} />
      </div>
      {file && <p className="text-sm">Selected file: {file.name}</p>}
      <Button type="submit" disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload PDF"}
      </Button>
      {statusMessage && <p className="text-sm mt-2">{statusMessage}</p>}
    </form>
  );
}