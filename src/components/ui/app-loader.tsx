import Image from "next/image";
import { LoaderCircle } from "lucide-react";

export function AppLoader() {
  return (
    <main className="app-route-loading" aria-busy="true" aria-live="polite">
      <div className="app-route-loading__content">
        <div className="app-route-loading__brand">
          <Image
            className="app-route-loading__mark"
            src="/brand/docflow-icon-128.png"
            alt=""
            width={76}
            height={76}
            priority
          />
          <div className="app-route-loading__copy">
            <strong>DocFlow</strong>
            <span>by NurByte</span>
          </div>
        </div>
        <div className="app-route-loading__status">
          <LoaderCircle
            className="spinner app-route-loading__spinner"
            aria-hidden="true"
          />
          <span>Loading…</span>
        </div>
      </div>
    </main>
  );
}
