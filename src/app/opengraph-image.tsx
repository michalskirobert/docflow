import { ImageResponse } from "next/og";

export const alt = "DocFlow by NurByte Software Lab";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#090d14",
        color: "#f8fafc",
        padding: "72px 84px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div
          style={{
            width: 74,
            height: 74,
            borderRadius: 18,
            background: "#f5c518",
            color: "#090d14",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 42,
            fontWeight: 900,
          }}
        >
          D
        </div>
        <div style={{ fontSize: 34, fontWeight: 700 }}>DocFlow</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div
          style={{
            fontSize: 68,
            lineHeight: 1.05,
            fontWeight: 800,
            maxWidth: 980,
          }}
        >
          Dokumenty. Szablony. E-mail. Faktury.
        </div>
        <div style={{ fontSize: 29, color: "#b8c0cc", maxWidth: 900 }}>
          Jeden uporządkowany workflow do tworzenia i obsługi dokumentów.
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 22,
          color: "#8f9baa",
        }}
      >
        <span>NurByte Software Lab</span>
        <span>docflow.nurbyte.dev</span>
      </div>
    </div>,
    size,
  );
}
