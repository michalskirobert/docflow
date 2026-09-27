"use client";
import { DateTimePicker, InputControl } from "@/components/shared/form";
export function FilterDateControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-date-control">
      <span>{label}</span>
      <div className="filter-date-input">
        <InputControl
          value={value}
          readOnly
          placeholder="YYYY-MM-DD"
          aria-label={label}
        />
        <DateTimePicker
          type="date"
          value={value}
          label={label}
          onChange={onChange}
        />
      </div>
    </label>
  );
}
