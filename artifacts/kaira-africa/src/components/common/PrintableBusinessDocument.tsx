import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReceiptBranding } from "@/lib/platform-api";

type PrintableBusinessDocumentProps = {
  title: string;
  documentNumber?: string | null;
  issuedAt?: string | null;
  status?: string | null;
  children: ReactNode;
};

export function printKairaDocument() {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>(".kaira-print-target img"));
  void Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    if (typeof image.decode === "function") return image.decode().catch(() => undefined);
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  })).then(() => window.print());
}

export function PrintableBusinessDocument({
  title, documentNumber, issuedAt, status, children,
}: PrintableBusinessDocumentProps) {
  const { data: branding } = useQuery({
    queryKey: ["receipt-branding"],
    queryFn: getReceiptBranding,
    staleTime: 60_000,
    retry: 1,
  });
  const companyName = branding?.companyName?.trim() || "Your business";
  const contactLines = [
    branding?.address?.trim(),
    branding?.phone?.trim(),
    branding?.email?.trim(),
    branding?.website?.trim(),
  ].filter(Boolean);

  return (
    <section className="kaira-print-target" aria-label="Printable business document">
      <article className="kaira-print-paper">
        <header className="kaira-print-header">
          <div className="kaira-print-company">
            {branding?.logoUrl && <img className="kaira-print-logo" src={branding.logoUrl} alt={companyName + " logo"} />}
            <div>
              <p className="kaira-print-eyebrow">BUSINESS RECORD</p>
              <h1>{companyName}</h1>
              {contactLines.map((line, index) => <p className="kaira-print-contact" key={index}>{line}</p>)}
            </div>
          </div>
          <div className="kaira-print-document-heading">
            <h2>{title}</h2>
            {branding?.showReceiptNumber !== false && documentNumber && <p>Reference: <strong>{documentNumber}</strong></p>}
            {issuedAt && <p>Date: <strong>{issuedAt}</strong></p>}
            {status && <p>Status: <strong>{status}</strong></p>}
          </div>
        </header>
        <div className="kaira-print-rule" />
        <main className="kaira-print-content">{children}</main>
        <footer className="kaira-print-footer">
          <p>{branding?.footerNote?.trim() || "Thank you for your business."}</p>
          <span>Prepared with Kaira Africa</span>
        </footer>
      </article>
    </section>
  );
}
