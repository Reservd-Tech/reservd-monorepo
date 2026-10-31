import { useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { uploadVendorDocument, signedDocumentUrl } from "@/lib/shop/documents";

interface Props {
  value: string | null;
  onChange: (path: string | null) => void;
  folder: string;
  label: string;
  hint?: string;
}

/** Upload control for private compliance documents (stored as a path, never public). */
export function DocumentPicker({ value, onChange, folder, label, hint }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      onChange(await uploadVendorDocument(file, folder));
      toast.success("Document uploaded");
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function view() {
    if (!value) return;
    try {
      window.open(await signedDocumentUrl(value), "_blank", "noopener");
    } catch {
      toast.error("Could not open that document");
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      {value ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-3 py-2 text-sm">
          <FileUp className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 truncate text-muted-foreground">
            {value.split("/").pop()}
          </span>
          <button type="button" onClick={view} className="text-xs font-medium text-primary">
            View
          </button>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-muted-foreground transition-colors hover:text-destructive"
            aria-label={`Remove ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/50 px-3 py-4 text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
          {busy ? "Uploading…" : "Upload image or PDF"}
        </button>
      )}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
