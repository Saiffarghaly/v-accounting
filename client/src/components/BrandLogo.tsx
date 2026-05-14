import { useState } from "react";

const BRAND_BG = "#217346";

type BrandLogoSize = "sidebar" | "compact" | "hero";

const sizeClasses: Record<BrandLogoSize, string> = {
  sidebar: "max-h-[7.5rem] w-full max-w-[13.5rem]",
  compact: "h-9 w-auto max-w-[10rem]",
  hero: "max-h-28 w-auto max-w-[16rem] sm:max-h-32",
};

type BrandLogoProps = {
  size: BrandLogoSize;
  className?: string;
};

/**
 * شعار V-accounting — خلفية خضراء مطابقة للوحة + mix-blend-multiply
 * لتقليل صندوق الأبيض حول ملفات PNG ذات الخلفية البيضاء.
 */
export function BrandLogo({ size, className = "" }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    const text =
      size === "sidebar" ? "text-xl text-white font-bold" : size === "hero" ? "text-2xl text-[#217346] font-bold" : "text-lg text-white font-bold";
    return <span className={text}>V-accounting</span>;
  }

  return (
    <div
      className={`inline-flex items-center justify-center rounded-lg ${className}`}
      style={{ backgroundColor: BRAND_BG }}
    >
      <img
        src="/logo.png"
        alt="V-accounting — محاسبة أسهل، قرارات أدق"
        className={`${sizeClasses[size]} object-contain mix-blend-multiply`}
        onError={() => setFailed(true)}
      />
    </div>
  );
}
