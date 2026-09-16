"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  ChevronDown, 
  HelpCircle, 
  BookOpen, 
  Video, 
  Wallet, 
  MessageCircle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

interface FAQItem {
  id: string;
  category: "general" | "courses" | "sessions" | "payment";
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  // General
  {
    id: "gen-1",
    category: "general",
    question: "What is Michael Gad Math Academy?",
    answer: "Michael Gad Math Academy is a premium online learning platform designed to help students master mathematics through structured video courses, interactive quizzes, live tutoring sessions, graded worksheets, and direct WhatsApp progress tracking."
  },
  {
    id: "gen-2",
    category: "general",
    question: "Who are the courses designed for?",
    answer: "Our courses cater to middle school, high school, and university prep students aiming for top academic grades, exam preparation (SAT, ACT, IGCSE, National Curriculums), or building strong foundational math skills."
  },
  {
    id: "gen-3",
    category: "general",
    question: "How do parents track student progress?",
    answer: "We send detailed WhatsApp progress reports directly to parents, including lesson completion timelines, quiz scores, homework worksheet feedback, and attendance history."
  },
  // Courses
  {
    id: "crs-1",
    category: "courses",
    question: "How do I access course materials and videos?",
    answer: "Once enrolled, all video lessons, PDF worksheets, and interactive practice quizzes are accessible 24/7 directly from your Student Dashboard."
  },
  {
    id: "crs-2",
    category: "courses",
    question: "What should I do if a video fails to load?",
    answer: "Our video player features multi-server mirroring! If a video server is slow or blocked on your network, simply click the server toggle buttons above the player to switch to an alternative fast stream mirror."
  },
  {
    id: "crs-3",
    category: "courses",
    question: "How are worksheets submitted and graded?",
    answer: "Students can download homework PDFs directly from lesson topics, complete them, and upload photos or PDF scans back to the platform. Michael Gad reviews each submission and provides personalized feedback and grades."
  },
  // Sessions
  {
    id: "ses-1",
    category: "sessions",
    question: "How do Live 1-on-1 and Group sessions work?",
    answer: "Live sessions are held via integrated video classrooms. You can view scheduled upcoming sessions in your dashboard, request custom session slots, or receive direct invitations from Michael."
  },
  {
    id: "ses-2",
    category: "sessions",
    question: "What if I miss a scheduled live class?",
    answer: "All live sessions are recorded and made available in the student dashboard under recorded sessions so you never miss a problem-solving walkthrough."
  },
  // Payment
  {
    id: "pay-1",
    category: "payment",
    question: "What payment methods are supported?",
    answer: "We support major credit/debit cards, online wallets, and local Egyptian payment gateways (Paymob / Vodafone Cash). You can top up your Student Wallet or purchase courses directly."
  },
  {
    id: "pay-2",
    category: "payment",
    question: "How does the Student Wallet work?",
    answer: "Your wallet allows you to maintain a balance on the platform to instantly purchase courses, book live session slots, or redeem promotional top-up codes without re-entering payment details each time."
  },
  {
    id: "pay-3",
    category: "payment",
    question: "Can I get a refund if I need to cancel?",
    answer: "Refund requests submitted within 7 days of course purchase—provided less than 20% of video content has been viewed—are processed to your Student Wallet or original payment method. Contact support for details."
  }
];

export default function FAQPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "general" | "courses" | "sessions" | "payment">("all");
  const [expandedId, setExpandedId] = useState<string | null>("gen-1");

  const categories = [
    { id: "all", label: "All Questions", icon: HelpCircle },
    { id: "general", label: "General & Support", icon: Sparkles },
    { id: "courses", label: "Courses & Videos", icon: BookOpen },
    { id: "sessions", label: "Live Sessions", icon: Video },
    { id: "payment", label: "Payments & Wallet", icon: Wallet },
  ];

  const filteredFaqs = faqs.filter((faq) => {
    const matchesCategory = activeCategory === "all" || faq.category === activeCategory;
    const matchesQuery = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const toggleFAQ = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Hero Header */}
      <section className="bg-primary py-20 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm">
            <HelpCircle className="w-4 h-4 text-accent" /> Help Center & Knowledge Base
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed mb-8">
            Have questions about course enrollments, video servers, live tutoring, or parent WhatsApp updates? Find quick answers below.
          </p>

          {/* Search Box */}
          <div className="max-w-xl mx-auto relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search for questions (e.g. video, whatsapp, wallet, refund)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white text-text rounded-2xl shadow-xl focus:outline-none focus:ring-4 focus:ring-white/30 text-base placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-text"
              >
                Clear
              </button>
            )}
          </div>
        </motion.div>
      </section>

      {/* FAQ Main Content */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/25 scale-105" 
                      : "bg-white text-text/70 hover:bg-gray-100 hover:text-text border border-gray-200"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-primary"}`} />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* FAQ List */}
          {filteredFaqs.length > 0 ? (
            <div className="space-y-4">
              {filteredFaqs.map((faq) => {
                const isExpanded = expandedId === faq.id;
                return (
                  <motion.div
                    key={faq.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full text-left p-6 flex items-center justify-between gap-4 font-bold text-lg text-text focus:outline-none"
                    >
                      <span className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        {faq.question}
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-400 transition-transform duration-300 flex-shrink-0 ${
                          isExpanded ? "rotate-180 text-primary" : ""
                        }`}
                      />
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="px-6 pb-6 pt-0 text-text/70 text-base leading-relaxed border-t border-gray-100 mt-1"
                        >
                          <p className="pt-4">{faq.answer}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-sm max-w-lg mx-auto">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-text mb-2">No matching questions found</h3>
              <p className="text-text/60 text-sm mb-6">
                We couldn't find any questions matching "{searchQuery}". Try searching another keyword or reach out directly to Michael.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
                className="bg-primary/10 text-primary font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/20 transition-colors"
              >
                Reset Search
              </button>
            </div>
          )}

          {/* Bottom Help Box */}
          <div className="mt-16 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/5 rounded-3xl p-8 md:p-10 border border-primary/20 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <h3 className="text-2xl font-bold text-text">Still have questions?</h3>
              <p className="text-text/70">
                Can't find the answer you're looking for? Reach out directly to Michael Gad on WhatsApp or email.
              </p>
            </div>
            <Link
              href="/contact"
              className="bg-primary hover:bg-primary/90 text-white font-bold px-7 py-3.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 flex-shrink-0"
            >
              <MessageCircle className="w-5 h-5" /> Contact Support <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>
    </div>
  );
}
