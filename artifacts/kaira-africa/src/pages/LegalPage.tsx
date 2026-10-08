import { Link } from "wouter";
import { ArrowLeft, ShieldCheck, FileText, Phone, MapPin } from "lucide-react";
import { KairaLogo } from "@/components/common/KairaLogo";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

type LegalType = "terms" | "privacy";

const TERMS = [
  ["1. Acceptance of Terms", "By accessing or using Kaira Africa, you agree to these Terms of Service and to use the platform lawfully. If you do not agree, do not use the service."],
  ["2. The Platform", "Kaira Africa provides business management tools including customer relationship management, inventory tracking, analytics, reporting and business insights. Features may change as the service evolves."],
  ["3. Accounts and Security", "You are responsible for keeping your phone, session credentials and account information secure. Do not share access or attempt to bypass another user's permissions."],
  ["4. Business Data", "You retain your rights in data you submit. You grant Kaira Africa the limited rights necessary to host, process, back up and display that data to provide the service."],
  ["5. Acceptable Use", "You may not use Kaira Africa for unlawful activity, malicious content, service disruption, unauthorized access, fraud, impersonation or infringement of another person's rights."],
  ["6. Analytics and AI-Assisted Insights", "Analytics and AI-assisted insights are decision-support features based on available business data. They are not legal, tax, accounting, financial or guaranteed business advice."],
  ["7. Availability and Changes", "We aim to provide a reliable service, but uninterrupted availability is not guaranteed. Features may change for security, maintenance or product-development reasons."],
  ["8. Intellectual Property", "Kaira Africa software, branding, interfaces and original materials are owned by or licensed to the service operator and may not be copied, resold or reverse engineered except where law permits."],
  ["9. Third-Party Services", "Some capabilities depend on hosting, storage, communications, payment or other third-party services. Their availability and applicable terms may also apply."],
  ["10. Suspension and Termination", "Access may be restricted or terminated for material breach, unlawful use, security risk or legitimate operational reasons. You may stop using your account at any time."],
  ["11. Disclaimers", "The service is provided on an as-available basis to the extent permitted by law. We do not guarantee revenue, customer growth, profitability or any other commercial outcome."],
  ["12. Limitation of Liability", "To the maximum extent permitted by law, Kaira Africa and its operator are not liable for indirect, incidental, special or consequential losses arising from use of the service."],
  ["13. Governing Law", "These terms are intended to be interpreted under applicable laws and regulations of The Gambia, subject to mandatory rights that cannot lawfully be excluded."],
  ["14. Contact", "Questions about these terms may be directed to " + BRAND.support.phone + " or " + BRAND.support.address + "."],
];

const PRIVACY = [
  ["1. Information We Collect", "We may collect account and business information such as phone number, name, business details, customer records, transaction information, inventory data and profile information."],
  ["2. How We Use Information", "We use information to authenticate users, operate the platform, provide analytics and reports, maintain security, troubleshoot issues and send service-related communications."],
  ["3. Business Customer Data", "When you enter information about your customers or staff, you are responsible for having the authority and appropriate notices to process it. Kaira Africa processes it to provide the features you request."],
  ["4. AI-Assisted Processing", "AI-assisted features may analyze business metrics such as sales, customer activity, transactions and inventory levels to produce summaries and recommendations. The initial Kaira insight engine is data-derived."],
  ["5. Sharing", "We do not sell personal information. Information may be shared with service providers that help us host, secure, communicate or operate the platform, subject to appropriate safeguards."],
  ["6. Security", "We use reasonable technical and organizational safeguards, including authenticated sessions, access controls and server-side authorization. No internet service can guarantee absolute security."],
  ["7. Retention", "Information is retained as reasonably necessary to provide the service, meet security or legal obligations, resolve disputes and maintain legitimate business records."],
  ["8. Your Choices", "You may request access to, correction of or deletion of personal information where applicable. Some records may need to be retained where required by law or legitimate security and accounting needs."],
  ["9. Children", "Kaira Africa is designed for business users and is not directed to children. We do not knowingly request personal information from children for independent account creation."],
  ["10. International Processing", "Information may be processed in countries where Kaira Africa or its service providers operate, subject to applicable legal requirements and safeguards."],
  ["11. Policy Updates", "We may update this Privacy Policy as the service, laws or processing practices change. Material changes will be communicated through reasonable service channels."],
  ["12. Contact", "For privacy questions or requests, contact " + BRAND.support.phone + " or " + BRAND.support.address + "."],
];

export default function LegalPage({ type }: { type: LegalType }) {
  const isTerms = type === "terms";
  const sections = isTerms ? TERMS : PRIVACY;
  return <div className="min-h-[100dvh] bg-background">
    <header className="border-b bg-card sticky top-0 z-20"><div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between"><Link href="/login"><Button variant="ghost" className="gap-2"><ArrowLeft className="h-4 w-4"/>Back</Button></Link><KairaLogo width={110}/></div></header>
    <main className="max-w-4xl mx-auto px-6 py-10"><div className="flex items-center gap-3 mb-4"><div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">{isTerms ? <FileText className="h-5 w-5 text-primary"/> : <ShieldCheck className="h-5 w-5 text-primary"/>}</div><div><h1 className="font-display text-3xl font-bold">{isTerms ? "Terms of Service" : "Privacy Policy"}</h1><p className="text-xs text-muted-foreground">Effective date: October 8, 2026</p></div></div>
    <p className="text-sm text-muted-foreground leading-relaxed mb-8">This is a professional product draft and should be reviewed by qualified local counsel before being adopted as a final legal agreement.</p>
    <Card><CardContent className="p-7 space-y-7">{sections.map(([heading, body]) => <section key={heading}><h2 className="font-semibold text-base mb-2">{heading}</h2><p className="text-sm text-muted-foreground leading-relaxed">{body}</p></section>)}</CardContent></Card>
    <Card className="mt-6"><CardContent className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div className="flex items-start gap-3"><Phone className="h-4 w-4 mt-0.5 text-primary"/><div><div className="font-medium">Official support</div><div className="text-muted-foreground">{BRAND.support.phone}</div></div></div><div className="flex items-start gap-3"><MapPin className="h-4 w-4 mt-0.5 text-primary"/><div><div className="font-medium">Office</div><div className="text-muted-foreground">{BRAND.support.address}</div></div></div></CardContent></Card>
    </main>
  </div>;
}
