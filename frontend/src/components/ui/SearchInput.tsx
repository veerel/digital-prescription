import { Search, X } from "lucide-react";
import type { Ref } from "react";

import styles from "./SearchInput.module.css";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className = "",
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
}) {
  return (
    <div className={[styles.wrap, className].filter(Boolean).join(" ")}>
      <Search size={16} className={styles.icon} aria-hidden="true" />
      <input
        ref={inputRef}
        className={styles.input}
        value={value}
        placeholder={placeholder}
        aria-label={label}
        maxLength={100}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  );
}
