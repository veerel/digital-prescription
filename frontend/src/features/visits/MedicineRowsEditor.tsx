import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import forms from "@/styles/forms.module.css";

import { emptyRow, type MedicineRow, medicineReference } from "./medicines";
import styles from "./MedicineRowsEditor.module.css";

const COLUMNS: { key: keyof MedicineRow; label: string; placeholder: string }[] = [
  { key: "name", label: "Medicine", placeholder: "Medicine name" },
  { key: "dosage", label: "Dosage", placeholder: "1-0-1" },
  { key: "frequency", label: "Frequency", placeholder: "Twice daily" },
  { key: "duration", label: "Duration", placeholder: "5 days" },
  { key: "instructions", label: "Instructions", placeholder: "After food" },
];

export function MedicineRowsEditor({
  rows,
  onChange,
}: {
  rows: MedicineRow[];
  onChange: (rows: MedicineRow[]) => void;
}) {
  const updateRow = (i: number, key: keyof MedicineRow, value: string) =>
    onChange(rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  return (
    <div className={styles.wrap}>
      <datalist id="medicine-suggestions">
        {medicineReference.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <div className={styles.headerRow} aria-hidden="true">
        {COLUMNS.map((c) => (
          <span key={c.key}>{c.label}</span>
        ))}
        <span />
      </div>

      {rows.map((row, i) => (
        <div className={styles.row} key={i}>
          {COLUMNS.map((c) => (
            <input
              key={c.key}
              className={forms.input}
              list={c.key === "name" ? "medicine-suggestions" : undefined}
              placeholder={c.placeholder}
              aria-label={`${c.label} ${i + 1}`}
              maxLength={c.key === "name" || c.key === "instructions" ? 200 : 100}
              value={row[c.key]}
              onChange={(e) => updateRow(i, c.key, e.target.value)}
            />
          ))}
          <button
            type="button"
            className={styles.removeBtn}
            onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
            disabled={rows.length === 1}
            aria-label={`Remove medicine ${i + 1}`}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        icon={<Plus size={14} />}
        onClick={() => onChange([...rows, emptyRow()])}
        disabled={rows.length >= 30}
      >
        Add medicine
      </Button>
    </div>
  );
}
