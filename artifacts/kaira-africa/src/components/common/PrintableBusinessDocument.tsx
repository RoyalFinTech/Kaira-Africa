import { type ReactNode, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReceiptBranding } from "@/lib/platform-api";

type PrintableBusinessDocumentProps = {
  id?: string;
  title: string;
  documentNumber?: string | null;
  issuedAt?: string | null;
  status?: string | null;
  children: ReactNode;
};

export function printKairaDocument(targetId: string) {
  document.querySelectorAll(".kaira-print-target").forEach((target) => target.classList.remove("kaira-print-active"));
  const target = document.getElementById(targetId);
  if (!target || !target.classList.contains("kaira-print-target")) return;
  target.classList.add("kaira-print-active");
  const images = Array.from(target.querySelectorAll<HTMLImageElement>("img"));
  void Promise.all(images.map((image) => {
    if (image.complete) return Promise.resolve();
    if (typeof image.decode === "function") return image.decode().catch(() => undefined);
    return new Promise<void>((resolve) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => resolve(), { once: true });
    });
  })).then(() => {
    const cleanup = () => target.classList.remove("kaira-print-active");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  });
}

export function PrintableBusinessDocument({
  id, title, documentNumber, issuedAt, status, children,
}: PrintableBusinessDocumentProps) {
  const generatedId = useId().replace(/:/g, "");
  const documentId = id || `kaira-print-${generatedId}`;
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
    <section id={documentId} className="kaira-print-target" aria-label="Printable business document">
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
