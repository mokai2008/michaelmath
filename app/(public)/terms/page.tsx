import { FileCheck, Shield, BookOpen, AlertCircle, Scale, Wallet, HelpCircle } from "lucide-react";
import Link from "next/link";

export default function TermsOfServicePage() {
  const lastUpdated = "September 17, 2026";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Header */}
      <section className="bg-primary py-16 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4 backdrop-blur-sm">
            <Scale className="w-4 h-4 text-accent" /> Terms & Conditions
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Terms of Service</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Please read these terms carefully before enrolling in courses or using Michael Gad Math Academy platform services.
          </p>
          <p className="text-xs text-white/60 mt-4">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 space-y-10 text-text/80 leading-relaxed">
            
            {/* Summary Notice */}
            <div className="bg-accent/10 rounded-2xl p-6 border border-accent/20 flex items-start gap-4">
              <FileCheck className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-bold text-lg text-text mb-1">Agreement Notice</h2>
                <p className="text-sm text-text/70">
                  By registering an account, purchasing a course, or accessing any educational materials on Michael Gad Math Academy, you agree to comply with and be bound by these Terms of Service.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <Shield className="w-6 h-6 text-primary" /> 1. Account Registration & Contact Accuracy
              </h3>
              <p>
                To access course content, students must register an account with a valid email address, password, student WhatsApp number, and a distinct parent/guardian WhatsApp number.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-text/70">
                <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You agree to provide accurate and current contact details for both student and parent records.</li>
                <li>Accounts are non-transferable and may not be shared across multiple individuals.</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-primary" /> 2. Intellectual Property Rights & Content Usage
              </h3>
              <p>
                All course materials—including video lectures, multi-server video streams, PDF worksheets, practice quizzes, and solution guides—are the exclusive intellectual property of Michael Gad.
              </p>
              <div className="bg-red-50 p-5 rounded-2xl border border-red-100 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800 font-medium">
                  Strictly Prohibited: Screen recording, re-uploading, downloading video streams, or redistributing worksheet materials without prior written consent from Michael Gad is illegal and subject to immediate account revocation without refund.
                </p>
              </div>
            </div>

            {/* Section 3 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <Wallet className="w-6 h-6 text-primary" /> 3. Student Wallet, Pricing & Payment Terms
              </h3>
              <p>
                Course fees and live session rates are displayed on the platform in designated currencies.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-text/70">
                <li><strong className="text-text">Student Wallet:</strong> Wallet funds may be used for instant course purchases and booking live session slots. Wallet balances do not expire while your account remains active.</li>
                <li><strong className="text-text">Refund Policy:</strong> Course purchases are eligible for a refund to the Student Wallet within 7 days of purchase, provided that less than 20% of the total course video lessons have been watched.</li>
                <li><strong className="text-text">Promotional Codes:</strong> Promo codes or wallet top-up vouchers are subject to specified expiry dates and usage conditions.</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <Scale className="w-6 h-6 text-primary" /> 4. Live Tutoring Sessions & Student Code of Conduct
              </h3>
              <p>
                Students participating in live 1-on-1 or group virtual classes are expected to maintain academic integrity and respectful behavior:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-text/70">
                <li>Students must join scheduled live sessions on time. Cancellations must be made at least 12 hours prior to the session start time.</li>
                <li>Worksheets and homework submissions must represent the student's original effort.</li>
                <li>Disruptive behavior, inappropriate language, or harassment during live sessions will result in immediate removal and potential account suspension.</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-primary" /> 5. Service Availability & Video Servers
              </h3>
              <p>
                While we strive for 99.9% platform uptime, we provide multi-server video mirrors to ensure continuous streaming availability. Michael Gad Math Academy is not liable for temporary service interruptions caused by internet service provider outages or external third-party network issues.
              </p>
            </div>

            {/* Section 6 */}
            <div className="space-y-4 border-t border-gray-100 pt-8">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-primary" /> 6. Contact Information & Support
              </h3>
              <p>
                If you have questions regarding these Terms of Service or require support regarding your account, please reach out to:
              </p>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 mt-4 space-y-2 text-sm">
                <p><strong className="text-text">Michael Gad Math Academy Legal & Support</strong></p>
                <p>Email: <a href="mailto:mokai2008@gmail.com" className="text-primary hover:underline">mokai2008@gmail.com</a></p>
                <p>Phone / WhatsApp: <a href="https://wa.me/201225293317" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">+20 122 529 3317</a></p>
              </div>
            </div>

            {/* Bottom Nav Links */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-sm text-text/60">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                ← Read our Privacy Policy
              </Link>
              <Link href="/faq" className="hover:text-primary transition-colors">
                Visit FAQ Knowledge Base →
              </Link>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}
