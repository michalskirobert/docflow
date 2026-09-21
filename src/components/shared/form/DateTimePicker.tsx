"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { InputControl } from "./InputControl";

type PickerType = "date" | "datetime" | "time";
type Props = {
  type: PickerType;
  value: string;
  label: string;
  onChange: (value: string) => void;
};

const pad = (value: number) => String(value).padStart(2, "0");
const dateValue = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function DateTimePicker({ type, value, label, onChange }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const parsed = value
    ? new Date(
        type === "date"
          ? `${value}T12:00:00`
          : type === "datetime"
            ? value
            : Date.now(),
      )
    : new Date();
  const [view, setView] = useState(
    () => new Date(parsed.getFullYear(), parsed.getMonth(), 1),
  );
  const [hour, setHour] = useState(() =>
    type === "time" ? Number(value.split(":")[0] || 0) : parsed.getHours(),
  );
  const [minute, setMinute] = useState(() =>
    type === "time" ? Number(value.split(":")[1] || 0) : parsed.getMinutes(),
  );

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [view]);

  const commitTime = (nextHour = hour, nextMinute = minute) => {
    if (type === "time") onChange(`${pad(nextHour)}:${pad(nextMinute)}`);
    else if (type === "datetime") {
      const date = value.split("T")[0] || dateValue(new Date());
      onChange(`${date}T${pad(nextHour)}:${pad(nextMinute)}`);
    }
  };

  const selectDay = (day: Date) => {
    const date = dateValue(day);
    if (type === "date") {
      onChange(date);
      setOpen(false);
      return;
    }
    onChange(`${date}T${pad(hour)}:${pad(minute)}`);
  };

  return (
    <div className="date-time-picker" ref={root}>
      <button
        type="button"
        className="date-picker-trigger"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {type === "time" ? <Clock3 size={18} /> : <CalendarDays size={18} />}
      </button>
      {open && (
        <div className="date-picker-popover" role="dialog" aria-label={label}>
          {type !== "time" && (
            <>
              <div className="date-picker-heading">
                <button
                  type="button"
                  onClick={() =>
                    setView(
                      new Date(view.getFullYear(), view.getMonth() - 1, 1),
                    )
                  }
                >
                  <ChevronLeft size={18} />
                </button>
                <strong>
                  {view.toLocaleDateString(undefined, {
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                <button
                  type="button"
                  onClick={() =>
                    setView(
                      new Date(view.getFullYear(), view.getMonth() + 1, 1),
                    )
                  }
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="date-picker-weekdays">
                {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className="date-picker-grid">
                {days.map((day) => {
                  const canonical = dateValue(day);
                  const selected = value.startsWith(canonical);
                  return (
                    <button
                      type="button"
                      key={canonical}
                      className={`${day.getMonth() !== view.getMonth() ? "outside" : ""}${selected ? " selected" : ""}`}
                      onClick={() => selectDay(day)}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {type !== "date" && (
            <div className="date-picker-time">
              <label>
                HH
                <InputControl
                  inputMode="numeric"
                  min={0}
                  max={23}
                  type="number"
                  value={hour}
                  onChange={(e) => {
                    const next = Math.max(
                      0,
                      Math.min(23, Number(e.target.value)),
                    );
                    setHour(next);
                    commitTime(next, minute);
                  }}
                />
              </label>
              <span>:</span>
              <label>
                MM
                <InputControl
                  inputMode="numeric"
                  min={0}
                  max={59}
                  type="number"
                  value={minute}
                  onChange={(e) => {
                    const next = Math.max(
                      0,
                      Math.min(59, Number(e.target.value)),
                    );
                    setMinute(next);
                    commitTime(hour, next);
                  }}
                />
              </label>
              <button
                type="button"
                className="btn compact"
                onClick={() => setOpen(false)}
              >
                OK
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
