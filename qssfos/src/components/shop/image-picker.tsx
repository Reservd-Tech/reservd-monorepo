import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { uploadShopImage } from "@/lib/shop/media";

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  label: string;
  hint?: string;
  aspect?: "square" | "wide";
  className?: string;
}

export function ImagePicker({
  value,
  onChange,
  folder,
  label,
  hint,
  aspect = "wide",
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file?: File | null) {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadShopImage(file, folder);
      onChange(url);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error((e as Error).message || "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="text-sm font-medium">{label}</div>
      <div
        className={cn(
          "group relative overflow-hidden rounded-xl border border-dashed border-border bg-background/50",
          aspect === "wide" ? "aspect-[16/9]" : "aspect-square",
        )}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <div className="absolute right-2 top-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur transition-colors hover:text-primary"
                aria-label={`Replace ${label}`}
              >
                {busy ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ImagePlus className="h-3 w-3" />
                )}
                {busy ? "Uploading…" : "Replace"}
              </button>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="rounded-full bg-background/80 p-1.5 text-muted-foreground backdrop-blur transition-colors hover:text-destructive"
                aria-label={`Remove ${label}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-primary"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            <span className="text-xs">{busy ? "Uploading…" : "Add photo"}</span>
          </button>
        )}
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
    </div>
  );
}
