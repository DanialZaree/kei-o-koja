"use client";

import React, { useEffect, useState } from "react";

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
  variant?: "primary" | "secondary";
  showShare?: boolean;
  shareTitle?: string;
}

export function CopyButton({
  textToCopy,
  label = "کپی لینک",
  copiedLabel = "کپی شد!",
  className = "",
  variant = "secondary",
  showShare = false,
  shareTitle,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setCanShare(true);
    }
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = textToCopy;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle || "لینک دورهمی",
          url: textToCopy,
        });
      } catch {
        // User cancelled share
      }
    }
  };

  const baseStyle =
    "min-h-[44px] px-4 py-2 rounded-full font-medium transition-colors focus:ring-2 focus:ring-brand-600 focus:outline-none inline-flex items-center justify-center gap-2 select-none text-xs sm:text-sm";
  const variantStyle =
    variant === "primary"
      ? "bg-brand-600 text-white hover:bg-brand-700"
      : "bg-white border border-secondary-200 text-accent-300 hover:bg-secondary-100";

  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className={`${baseStyle} ${variantStyle} ${className}`}
        aria-label={label}
      >
        <span>{copied ? copiedLabel : label}</span>
      </button>

      {showShare && canShare && (
        <button
          type="button"
          onClick={handleShare}
          className={`${baseStyle} bg-secondary-100 hover:bg-secondary-200 border border-secondary-200 text-accent-300`}
          aria-label="اشتراک‌گذاری"
        >
          اشتراک‌گذاری
        </button>
      )}
    </div>
  );
}
