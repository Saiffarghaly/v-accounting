import { useId, useRef } from "react";

type ListSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  variant?: "light" | "dark";
  className?: string;
  placeholder?: string;
};

/**
 * Search control for list pages: icon button + input + clear.
 */
export function ListSearchField({
  value,
  onChange,
  variant = "light",
  className = "",
  placeholder = "بحث في القائمة…",
}: ListSearchFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = variant === "dark";
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 min-w-[10rem] max-w-xs ${isDark ? "bg-gray-800/80 border-gray-700" : "bg-white border-[#ddd]"
        } ${className}`}
    >
      <button
        type="button"
        className={`shrink-0 text-base leading-none px-1 rounded ${isDark ? "text-amber-400 hover:text-amber-300" : "text-[#217346] hover:opacity-80"}`}
        aria-label="بحث"
        title="بحث"
        onClick={() => inputRef.current?.focus()}
      >
        🔍
      </button>
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={`flex-1 min-w-0 bg-transparent text-sm focus:outline-none ${isDark ? "text-white placeholder:text-gray-500" : "text-gray-900 placeholder:text-gray-400"
          }`}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className={`shrink-0 text-xs px-1.5 py-0.5 rounded ${isDark ? "text-gray-400 hover:text-white hover:bg-gray-700" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
        >
          مسح
        </button>
      ) : null}
    </div>
  );
}
