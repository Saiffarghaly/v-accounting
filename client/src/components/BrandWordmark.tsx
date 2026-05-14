type BrandWordmarkProps = {
  /** على خلفية فاتحة — نفس صفحة Login (عنوان أخضر). على خلفية الشريط الأخضر — عنوان أبيض. */
  variant: "onLight" | "onDarkGreen";
  /** sm: شريط الرأس | md: سايدبار / بطاقات | lg: هيرو Landing */
  size?: "sm" | "md" | "lg";
  className?: string;
};

const boxSize: Record<NonNullable<BrandWordmarkProps["size"]>, string> = {
  sm: "w-7 h-7 text-xs rounded",
  md: "w-8 h-8 text-sm rounded",
  lg: "w-12 h-12 text-lg rounded-md",
};

const titleSize: Record<NonNullable<BrandWordmarkProps["size"]>, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl sm:text-4xl",
};

export function BrandWordmark({ variant, size = "md", className = "" }: BrandWordmarkProps) {
  const onLight = variant === "onLight";
  const boxBg = onLight ? "#217346" : "#1a5c38";
  const titleColor = onLight ? "#217346" : "#ffffff";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex shrink-0 items-center justify-center font-bold text-white ${boxSize[size]}`}
        style={{ background: boxBg }}
      >
        V
      </div>
      <span className={`font-bold leading-none ${titleSize[size]}`} style={{ color: titleColor }}>
        V-ACCOUNTING
      </span>
    </div>
  );
}
