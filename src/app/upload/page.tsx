import FileUploadForm from "@/components/upload/FileUploadForm";

export default function UploadPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-2xl space-y-6 rounded-xl border border-border bg-card/60 p-8 shadow-sm backdrop-blur">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Upload a PDF
          </h1>
          <p className="text-sm text-muted-foreground">
            Select a PDF from your device and we will handle the upload and text extraction for you.
          </p>
        </div>
        <section className="rounded-lg border border-border bg-background/80 p-6 shadow-sm">
          <FileUploadForm />
        </section>
      </div>
    </main>
  );
}
