import type { Prisma } from "@prisma/client";

export const EXAMPLE_TEMPLATES = [
  {
    name: "Umowa o pracę",
    description:
      "Prosty wzór umowy o pracę z danymi pracownika, stanowiskiem, datą rozpoczęcia i wynagrodzeniem.",
    content: `<h1 style="text-align:center">Umowa o pracę</h1><p>Zawarta w dniu <strong>{{DataUmowy}}</strong> pomiędzy pracodawcą a:</p><p><strong>{{ImieNazwisko}}</strong></p><p>Stanowisko: {{Stanowisko}}<br>Data rozpoczęcia pracy: {{DataRozpoczecia}}<br>Wynagrodzenie brutto: {{Wynagrodzenie}} PLN</p><p>Umowa zostaje zawarta na warunkach uzgodnionych przez strony.</p><p><br></p><p>Podpis pracodawcy: ____________________</p><p>Podpis pracownika: ____________________</p>`,
    variables: [
      {
        name: "DataUmowy",
        label: "Data umowy",
        type: "date",
        defaultValueMode: "current",
        dateFormat: "DD.MM.YYYY",
      },
      {
        name: "ImieNazwisko",
        label: "Imię i nazwisko",
        type: "text",
        required: true,
      },
      { name: "Stanowisko", label: "Stanowisko", type: "text", required: true },
      {
        name: "DataRozpoczecia",
        label: "Data rozpoczęcia",
        type: "date",
        required: true,
        dateFormat: "DD.MM.YYYY",
      },
      {
        name: "Wynagrodzenie",
        label: "Wynagrodzenie brutto",
        type: "number",
        required: true,
        decimalPlaces: 2,
        decimalSeparator: ",",
        thousandsSeparator: "space",
      },
    ],
  },
  {
    name: "Oferta handlowa",
    description:
      "Uniwersalna oferta dla klienta z nazwą usługi, ceną, terminem realizacji i osobą kontaktową.",
    content: `<h1>Oferta handlowa</h1><p>Dla: <strong>{{Klient}}</strong></p><p>Dziękujemy za zainteresowanie naszą ofertą. Proponujemy realizację usługi <strong>{{Usluga}}</strong>.</p><h2>Warunki oferty</h2><p>Cena netto: {{CenaNetto}} PLN<br>Termin realizacji: {{TerminRealizacji}}<br>Oferta ważna do: {{WaznaDo}}</p><p>Osoba kontaktowa: {{OsobaKontaktowa}}</p>`,
    variables: [
      { name: "Klient", label: "Klient", type: "text", required: true },
      {
        name: "Usluga",
        label: "Usługa / produkt",
        type: "text",
        required: true,
      },
      {
        name: "CenaNetto",
        label: "Cena netto",
        type: "number",
        required: true,
        decimalPlaces: 2,
        decimalSeparator: ",",
        thousandsSeparator: "space",
      },
      { name: "TerminRealizacji", label: "Termin realizacji", type: "text" },
      {
        name: "WaznaDo",
        label: "Oferta ważna do",
        type: "date",
        dateFormat: "DD.MM.YYYY",
      },
      { name: "OsobaKontaktowa", label: "Osoba kontaktowa", type: "text" },
    ],
  },
  {
    name: "Protokół odbioru",
    description:
      "Wzór protokołu odbioru prac lub usługi z datą, stronami, zakresem i miejscem na uwagi.",
    content: `<h1 style="text-align:center">Protokół odbioru</h1><p>Data odbioru: <strong>{{DataOdbioru}}</strong></p><p>Zamawiający: {{Zamawiajacy}}<br>Wykonawca: {{Wykonawca}}</p><h2>Przedmiot odbioru</h2><p>{{Zakres}}</p><h2>Uwagi</h2><p>{{Uwagi}}</p><p>Strony potwierdzają odbiór opisanego wyżej zakresu.</p><p><br></p><p>Zamawiający: ____________________</p><p>Wykonawca: ____________________</p>`,
    variables: [
      {
        name: "DataOdbioru",
        label: "Data odbioru",
        type: "date",
        defaultValueMode: "current",
        dateFormat: "DD.MM.YYYY",
      },
      {
        name: "Zamawiajacy",
        label: "Zamawiający",
        type: "text",
        required: true,
      },
      { name: "Wykonawca", label: "Wykonawca", type: "text", required: true },
      {
        name: "Zakres",
        label: "Przedmiot / zakres odbioru",
        type: "text",
        required: true,
      },
      { name: "Uwagi", label: "Uwagi", type: "text" },
    ],
  },
] as const;

export function exampleTemplateCreateData(
  organizationId: string,
): Prisma.TemplateCreateManyInput[] {
  return EXAMPLE_TEMPLATES.map((template) => ({
    organizationId,
    name: template.name,
    description: template.description,
    content: template.content,
    variablesJson: JSON.stringify(template.variables),
    isExample: true,
  }));
}
