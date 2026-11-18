"use client";

import Image from "next/image";
import { useState } from "react";

// Shows the logo from frontend/public, or a labelled circle until the file is added.
export function CourtLogo({ src, name, label }: { src: string; name: string; label: string }) {
  const [missing, setMissing] = useState(false);
  const frame = "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white";

  if (missing) {
    return (
      <div
        role="img"
        aria-label={`${name} logo`}
        className={`${frame} border border-dashed border-zinc-400 px-2 text-center text-xs leading-tight text-zinc-600`}
      >
        {label}
      </div>
    );
  }

  return (
    <div className={frame}>
      <Image
        src={src}
        alt={`${name} logo`}
        width={160}
        height={160}
        preload
        className="h-full w-full object-contain"
        onError={() => setMissing(true)}
      />
    </div>
  );
}
