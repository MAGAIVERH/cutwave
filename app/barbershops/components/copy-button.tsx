"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";

interface CopyButtonProps {
  value: string;
}

export function CopyButton({ value }: CopyButtonProps) {
  const copy = async () => {
    await navigator.clipboard.writeText(value);

    toast.success("Phone number copied", {
      duration: 2000,
    });
  };

  return (
    <button
      onClick={copy}
      className="text-primary flex items-center gap-1 text-sm"
    >
      <Copy className="h-4 w-4" />
      Copy
    </button>
  );
}
