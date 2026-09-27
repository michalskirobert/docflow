"use client";

import { DateTimePicker, FormField } from "@/components/shared/form";

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
    <FormField
      label={label}
      type="text"
      inputMode="numeric"
      value={value}
      placeholder="YYYY-MM-DD"
      onChange={(event) => onChange(event.target.value)}
      suffix={
        <DateTimePicker
          type="date"
          value={value}
          label={label}
          onChange={onChange}
        />
      }
    />
  );
}
