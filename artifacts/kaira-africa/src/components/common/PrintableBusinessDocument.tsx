import { type ReactNode, useId } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReceiptBranding, type ReceiptBrandingSettings } from "@/lib/platform-api";

type PrintableBusinessDocumentProps = {
  id?: string;
  title: string;
  documentNumber?: string | null;
  issuedAt?: string | null;
  status?: string | null;
  children: ReactNode;
  /** Optional live settings for the branding page's unsaved sample preview. */
  brandingOverride?: ReceiptBrandingSettings;
};

function waitForBrandingReady(target: HTMLElement, timeoutMs = 8_000): Promise<void> {
  if (target.dataset.brandingReady === "true") return Promise.resolve();
  return new Promise((resolve) => {
    let timeout: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver(() => {
      if (target.dataset.brandingReady === "true") finish();
    });
    const finish = () => {
      observer.disconnect();
      clearTimeout(timeout);
      resolve();
    };
    observer.observe(target, { attributes: true, attributeFilter: ["data-branding-ready"] });
    timeout = setTimeout(finish, timeoutMs);
    if (target.dataset.brandingReady === "true") finish();
  });
}

function waitForImage(image: HTMLImageElement, timeoutMs = 5_000): Promise<void> {
  return new Promise((resolve) => {
    let timeout: ReturnType<typeof setTimeout>;
    const finish = async () => {
      clearTimeout(timeout);
      image.removeEventListener("load", onLoad);
      image.removeEventListener("error", onError);
      if (image.naturalWidth > 0 && typeof image.decode === "function") {
        try { await image.decode(); } catch { /* Keep a usable fallback if this image cannot be decoded. */ }
      }
      resolve();
    };
    const onLoad = () => { void finish(); };
    const onError = () => { void finish(); };
    timeout = setTimeout(() => { void finish(); }, timeoutMs);
    if (image.complete) void finish();
    else {
      image.addEventListener("load", onLoad, { once: true });
      image.addEventListener("error", onError, { once: true });
    }
  });
}

export function printKairaDocument(targetId: string) {
  document.querySelectorAll(".kaira-print-target").forEach((target) => target.classList.remove("kaira-print-active"));
  const target = document.getElementById(targetId);
  if (!target || !target.classList.contains("kaira-print-target")) return;
  target.classList.add("kaira-print-active");
  void (async () => {
    // Do not open the native print dialog with the fallback template while saved
    // branding settings (especially a freshly signed logo URL) are still loading.
    await waitForBrandingReady(target);
    const images = Array.from(target.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all(images.map((image) => waitForImage(image)));
    const cleanup = () => target.classList.remove("kaira-print-active");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
  })();
}

export function PrintableBusinessDocument({
  id, title, documentNumber, issuedAt, status, children, brandingOverride,
}: PrintableBusinessDocumentProps) {
  const generatedId = useId().replace(/:/g, "");
  const documentId = id || `kaira-print-${generatedId}`;
  const { data: loadedBranding, isFetching: brandingFetching, isError: brandingError } = useQuery({
    queryKey: ["receipt-branding"],
    queryFn: getReceiptBranding,
    staleTime: 60_000,
    retry: 1,
  });
  const branding = brandingOverride ?? loadedBranding;
  const brandingReady = brandingOverride !== undefined ||
    (loadedBranding !== undefined && !brandingFetching) ||
    (brandingError && loadedBranding === undefined);
  const companyName = branding?.companyName?.trim() || "Your business";
  const contactLines = [
    branding?.address?.trim(),
    branding?.phone?.trim(),
    branding?.email?.trim(),
    branding?.website?.trim(),
  ].filter(Boolean);

  return (
    <section id={documentId} className="kaira-print-target" data-branding-ready={brandingReady ? "true" : "false"} aria-label="Printable business document">
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
