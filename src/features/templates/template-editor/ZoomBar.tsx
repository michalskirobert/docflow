import { Minus, Plus } from "lucide-react";
import { A4_WIDTH_PX } from "@/utils/constants";
type Props = {
  t: (key: string) => string;
  zoom: number;
  setZoom: (updater: (current: number) => number) => void;
};
export function ZoomBar({ t, zoom, setZoom }: Props) {
  return (
    <div className="zoom-bar">
      <button
        type="button"
        onClick={() => setZoom((c) => Math.max(25, c - 25))}
        aria-label={t("zoomOut")}
      >
        <Minus />
      </button>
      <strong>{zoom}%</strong>
      <button
        type="button"
        onClick={() => setZoom((c) => Math.min(200, c + 25))}
        aria-label={t("zoomIn")}
      >
        <Plus />
      </button>
      <button
        type="button"
        onClick={() =>
          setZoom(() =>
            Math.max(
              25,
              Math.floor(
                (((window.innerWidth - 24) / A4_WIDTH_PX) * 100) / 25,
              ) * 25,
            ),
          )
        }
      >
        {t("fitPage")}
      </button>
    </div>
  );
}
