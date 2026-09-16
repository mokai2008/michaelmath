import { ShieldCheck, Lock, Eye, FileText, Database, UserCheck, Mail } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  const lastUpdated = "September 17, 2026";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Header */}
      <section className="bg-primary py-16 text-white text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-4 backdrop-blur-sm">
            <ShieldCheck className="w-4 h-4 text-accent" /> Legal & Trust
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">Privacy Policy</h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            Your privacy and data security are our top priorities. Learn how Michael Gad Math Academy handles your information.
          </p>
          <p className="text-xs text-white/60 mt-4">Last Updated: {lastUpdated}</p>
        </div>
      </section>

      {/* Main Policy Content */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl border border-gray-100 space-y-10 text-text/80 leading-relaxed">
            
            {/* Overview Card */}
            <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20 flex items-start gap-4">
              <Lock className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-bold text-lg text-text mb-1">Commitment to Data Privacy</h2>
                <p className="text-sm text-text/70">
                  Michael Gad Math Academy ("we", "our", or "us") respects your privacy. We strictly collect data required to deliver educational services, monitor student progress, and communicate academic performance with parents and guardians.
                </p>
              </div>
            </div>

            {/* Section 1 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <Database className="w-6 h-6 text-primary" /> 1. Information We Collect
              </h3>
              <p>We collect information when you register an account, enroll in courses, or interact with our learning management system:</p>
              <ul className="list-disc pl-6 space-y-2 text-text/70">
                <li><strong className="text-text">Account Information:</strong> Full name, email address, student phone/WhatsApp number, grade level, and password credentials.</li>
                <li><strong className="text-text">Parent/Guardian Contact:</strong> Parent email address and parent WhatsApp number for automated progress reports and notifications.</li>
                <li><strong className="text-text">Academic & Learning Data:</strong> Video watch history, lesson completion statuses, quiz attempts & scores, worksheet submission files, and server playback preferences.</li>
                <li><strong className="text-text">Financial Transactions:</strong> Wallet balance logs, top-up histories, and course purchase receipts (card details are processed securely via external payment providers and are never stored on our servers).</li>
              </ul>
            </div>

            {/* Section 2 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <Eye className="w-6 h-6 text-primary" /> 2. How We Use Your Information
              </h3>
              <p>We utilize the collected information strictly for educational and operational purposes:</p>
              <ul className="list-disc pl-6 space-y-2 text-text/70">
                <li>Providing 24/7 access to enrolled course materials, video lectures, and practice quizzes.</li>
                <li>Grading student homework submissions and providing personalized academic feedback.</li>
                <li>Sending progress summaries and session reminders via WhatsApp to students and parents.</li>
                <li>Maintaining Student Wallet balances and fulfilling course purchase requests.</li>
                <li>Optimizing video streaming performance across multi-server mirrors.</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-primary" /> 3. Data Protection & Security
              </h3>
              <p>
                We implement industry-standard technical and organizational security measures to protect your data. All database interactions and authentication tokens are secured via standard SSL/TLS encryption and Row-Level Security (RLS) policies within our database architecture.
              </p>
            </div>

            {/* Section 4 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-primary" /> 4. Parent & Minor Safeguards
              </h3>
              <p>
                Because our platform serves middle and high school students, we prioritize minor safety. Parent contact details are maintained so parents remain fully informed of their child's academic progress. We do not sell, rent, or trade student or parent personal data to any third party for marketing purposes.
              </p>
            </div>

            {/* Section 5 */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <FileText className="w-6 h-6 text-primary" /> 5. Third-Party Service Providers
              </h3>
              <p>We partner with trusted third-party service providers to power our platform infrastructure:</p>
              <ul className="list-disc pl-6 space-y-2 text-text/70">
                <li><strong className="text-text">Supabase:</strong> Database hosting, user authentication, and secure storage for uploaded worksheets.</li>
                <li><strong className="text-text">Stripe & Paymob:</strong> PCI-DSS compliant payment gateways for card payments and wallet top-ups.</li>
                <li><strong className="text-text">WhatsApp Messaging Services:</strong> Automated notification dispatch for study reminders and progress cards.</li>
              </ul>
            </div>

            {/* Section 6 */}
            <div className="space-y-4 border-t border-gray-100 pt-8">
              <h3 className="text-2xl font-bold text-text flex items-center gap-3">
                <Mail className="w-6 h-6 text-primary" /> 6. Your Data Rights & Contact Information
              </h3>
              <p>
                You have the right to inspect, update, or request the deletion of your personal profile details. If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us:
              </p>
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 mt-4 space-y-2 text-sm">
                <p><strong className="text-text">Michael Gad Math Academy Support</strong></p>
                <p>Email: <a href="mailto:mokai2008@gmail.com" className="text-primary hover:underline">mokai2008@gmail.com</a></p>
                <p>WhatsApp: <a href="https://wa.me/201225293317" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">+20 122 529 3317</a></p>
              </div>
            </div>

            {/* Bottom Nav Links */}
            <div className="pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4 text-sm text-text/60">
              <Link href="/terms" className="hover:text-primary transition-colors">
                Read our Terms of Service →
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
