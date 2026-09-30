"use client";

import { X } from "lucide-react";
import { useLocale } from "next-intl";
import { useEffect } from "react";

export const LEGAL_VERSION = "1.0";
export type LegalDocument = "terms" | "privacy" | "paidService";

type Copy = {
  title: string;
  intro: string;
  sections: Array<[string, string]>;
  close: string;
};
const copy: Record<string, Record<LegalDocument, Copy>> = {
  pl: {
    terms: {
      title: "Regulamin DocFlow",
      intro:
        "Wersja 1.0 · obowiązuje od 30.09.2026. DocFlow jest usługą SaaS do tworzenia dokumentów, szablonów, plików PDF i przygotowywania wiadomości e-mail.",
      sections: [
        [
          "1. Usługa",
          "Konto umożliwia korzystanie z funkcji dostępnych w wybranym planie. Użytkownik odpowiada za prawidłowość wprowadzanych danych, bezpieczeństwo hasła oraz zgodne z prawem wykorzystanie wygenerowanych dokumentów.",
        ],
        [
          "2. Plan bezpłatny",
          "DocFlow udostępnia bezpłatny plan pozwalający sprawdzić podstawowe funkcje produktu przed zakupem planu płatnego. Limity i zakres planów są prezentowane przed wyborem planu.",
        ],
        [
          "3. Plan płatny",
          "Cena, okres licencji, podatki i limit dokumentów są pokazywane przed złożeniem zamówienia. Płatny dostęp jest aktywowany zgodnie z wybraną metodą płatności i warunkami widocznymi w procesie zakupu.",
        ],
        [
          "4. Konsument i odstąpienie",
          "Jeżeli użytkownik jest konsumentem, zachowuje prawa wynikające z bezwzględnie obowiązujących przepisów. Żądanie rozpoczęcia płatnej usługi przed upływem ustawowego terminu na odstąpienie oraz wymagane prawem oświadczenie są odbierane oddzielnie przy wyborze planu płatnego. Regulamin nie ogranicza praw, których nie można wyłączyć umową.",
        ],
        [
          "5. Reklamacje",
          "Problemy z działaniem usługi można zgłaszać przez kanał wsparcia dostępny w DocFlow. Zgłoszenie powinno umożliwiać identyfikację problemu. Uprawnienia konsumenta dotyczące zgodności usługi cyfrowej z umową pozostają nienaruszone.",
        ],
        [
          "6. Dostępność i odpowiedzialność",
          "DocFlow może być czasowo niedostępny z powodu prac technicznych, awarii lub zdarzeń niezależnych od usługodawcy. Usługa wspiera tworzenie dokumentów, ale nie stanowi porady prawnej, podatkowej ani księgowej.",
        ],
        [
          "7. Zmiany regulaminu",
          "Istotna zmiana wymagająca ponownej akceptacji będzie przedstawiona użytkownikowi wraz z nową wersją dokumentu. Historia zaakceptowanych wersji jest widoczna w danych konta.",
        ],
      ],
      close: "Zamknij",
    },
    privacy: {
      title: "Polityka prywatności",
      intro: "Wersja 1.0 · obowiązuje od 30.09.2026.",
      sections: [
        [
          "Zakres danych",
          "DocFlow przetwarza dane konta, dane rozliczeniowe, ustawienia oraz dane niezbędne do świadczenia i zabezpieczenia usługi.",
        ],
        [
          "Cele",
          "Dane są używane do prowadzenia konta, realizacji płatności, obsługi użytkownika, bezpieczeństwa, obowiązków prawnych oraz działania funkcji wybranych przez użytkownika.",
        ],
        [
          "Okres przechowywania",
          "Dane są przechowywane przez okres korzystania z usługi oraz później, gdy wymagają tego przepisy lub jest to konieczne do ustalenia, dochodzenia lub obrony roszczeń.",
        ],
        [
          "Prawa",
          "W zakresie przewidzianym przez RODO użytkownik może żądać dostępu, sprostowania, usunięcia, ograniczenia przetwarzania, przeniesienia danych oraz wnieść skargę do właściwego organu nadzorczego.",
        ],
      ],
      close: "Zamknij",
    },
    paidService: {
      title: "Rozpoczęcie płatnej usługi",
      intro: "Informacja dla użytkownika wybierającego plan płatny.",
      sections: [
        [
          "Ważne",
          "Żądając rozpoczęcia świadczenia płatnej usługi niezwłocznie po płatności, przed upływem ustawowego terminu na odstąpienie, użytkownik przyjmuje do wiadomości skutki przewidziane przez właściwe przepisy dla rozpoczętego świadczenia. DocFlow nie wyłącza ustawowych praw konsumenta samym faktem istnienia planu bezpłatnego.",
        ],
      ],
      close: "Zamknij",
    },
  },
  en: {
    terms: {
      title: "DocFlow Terms",
      intro: "Version 1.0 · effective 30 September 2026.",
      sections: [
        [
          "Service",
          "DocFlow is a SaaS service for creating documents, reusable templates, PDFs and prepared emails.",
        ],
        [
          "Free plan",
          "A free plan is available to test core product functionality before purchasing a paid plan.",
        ],
        [
          "Paid plan",
          "Price, licence period, taxes and limits are shown before purchase.",
        ],
        [
          "Consumer rights",
          "Mandatory consumer rights remain unaffected. Any request for immediate performance and acknowledgement concerning withdrawal rights is collected separately for a paid plan.",
        ],
        [
          "Complaints",
          "Service issues can be reported through DocFlow support.",
        ],
        [
          "Changes",
          "Material changes requiring renewed acceptance are presented as a new version and accepted versions remain visible in the account.",
        ],
      ],
      close: "Close",
    },
    privacy: {
      title: "Privacy Policy",
      intro: "Version 1.0 · effective 30 September 2026.",
      sections: [
        [
          "Data",
          "DocFlow processes account, billing, settings and service-security data.",
        ],
        [
          "Purposes",
          "Data is used to provide the account and service, process payments, provide support, maintain security and meet legal obligations.",
        ],
        [
          "Retention",
          "Data is retained while required to provide the service and where law or legitimate claims require longer retention.",
        ],
        [
          "Rights",
          "Where GDPR applies, users may exercise applicable access, rectification, erasure, restriction, portability and complaint rights.",
        ],
      ],
      close: "Close",
    },
    paidService: {
      title: "Immediate paid service",
      intro: "Information for users choosing a paid plan.",
      sections: [
        [
          "Important",
          "By requesting paid service to start immediately after payment, before the statutory withdrawal period expires, the user acknowledges the consequences provided by applicable consumer law. The free plan does not itself remove statutory consumer rights.",
        ],
      ],
      close: "Close",
    },
  },
  id: {
    terms: {
      title: "Ketentuan DocFlow",
      intro: "Versi 1.0 · berlaku 30 September 2026.",
      sections: [
        [
          "Layanan",
          "DocFlow adalah layanan SaaS untuk membuat dokumen, template, PDF, dan menyiapkan email.",
        ],
        [
          "Paket gratis",
          "Paket gratis tersedia untuk mencoba fungsi utama sebelum membeli paket berbayar.",
        ],
        [
          "Paket berbayar",
          "Harga, masa lisensi, pajak, dan batas penggunaan ditampilkan sebelum pembelian.",
        ],
        [
          "Hak konsumen",
          "Hak konsumen yang wajib menurut hukum tetap berlaku. Permintaan untuk memulai layanan berbayar segera dan pernyataan terkait hak pembatalan diminta secara terpisah.",
        ],
        [
          "Keluhan",
          "Masalah layanan dapat dilaporkan melalui dukungan DocFlow.",
        ],
        [
          "Perubahan",
          "Perubahan penting yang memerlukan persetujuan baru akan ditampilkan sebagai versi baru dan riwayat persetujuan tetap tersedia di akun.",
        ],
      ],
      close: "Tutup",
    },
    privacy: {
      title: "Kebijakan Privasi",
      intro: "Versi 1.0 · berlaku 30 September 2026.",
      sections: [
        [
          "Data",
          "DocFlow memproses data akun, penagihan, pengaturan, dan keamanan layanan.",
        ],
        [
          "Tujuan",
          "Data digunakan untuk menyediakan layanan, pembayaran, dukungan, keamanan, dan kewajiban hukum.",
        ],
        [
          "Penyimpanan",
          "Data disimpan selama diperlukan untuk layanan serta sesuai kewajiban hukum atau klaim.",
        ],
        [
          "Hak",
          "Jika GDPR berlaku, pengguna dapat menggunakan hak akses, koreksi, penghapusan, pembatasan, portabilitas, dan pengaduan yang berlaku.",
        ],
      ],
      close: "Tutup",
    },
    paidService: {
      title: "Layanan berbayar segera",
      intro: "Informasi untuk pengguna paket berbayar.",
      sections: [
        [
          "Penting",
          "Dengan meminta layanan berbayar dimulai segera setelah pembayaran sebelum masa pembatalan menurut hukum berakhir, pengguna memahami konsekuensi menurut hukum konsumen yang berlaku. Paket gratis tidak menghapus hak konsumen menurut hukum.",
        ],
      ],
      close: "Tutup",
    },
  },
};
export function LegalModal({
  document: docType,
  onClose,
}: {
  document: LegalDocument | null;
  onClose: () => void;
}) {
  const locale = useLocale();
  const c = docType ? (copy[locale] ?? copy.en)[docType] : null;
  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [c, onClose]);
  if (!c) return null;
  return (
    <div
      className="legal-backdrop"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="legal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
      >
        <header>
          <div>
            <h2 id="legal-title">{c.title}</h2>
            <p>{c.intro}</p>
          </div>
          <button
            type="button"
            className="legal-close"
            onClick={onClose}
            aria-label={c.close}
          >
            <X size={20} />
          </button>
        </header>
        <div className="legal-content">
          {c.sections.map(([h, p]) => (
            <section key={h}>
              <h3>{h}</h3>
              <p>{p}</p>
            </section>
          ))}
        </div>
        <footer>
          <button type="button" className="btn secondary" onClick={onClose}>
            {c.close}
          </button>
        </footer>
      </section>
    </div>
  );
}
