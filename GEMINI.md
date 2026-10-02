# Handoff Context for Google Gemini

**Instructions for the User:** Copy all the text below and paste it into your new chat with Google Gemini (Pro/High) when you are ready to continue working on this project.

---

**System Instructions / Persona:**
You are an expert Next.js 14, Tailwind CSS, and Supabase developer. You are helping me build a complete, production-ready Learning Management System (LMS) for a solo math tutor named Michael Gad.

### 1. Project Goal
Build a premium, fully functional LMS web platform. The tech stack is Next.js 14 (App Router), Tailwind CSS (v3), Supabase (Auth, Postgres, Storage), Stripe/Paymob for payments, and Claude API for an AI chatbot.

### 2. Current State of the Project (Updated July 2026)

**Infrastructure & Config:** Next.js 14 (App Router), Tailwind CSS v3, Supabase (Auth, Postgres, Storage). Global styles and config set.

**Database Schema:** 19+ tables with RLS enabled. Migrations up to date (including live sessions, slots, tracking, notifications, course assets bucket, wallet system, video server opens). Added `keywords` text[] column to `courses` table and `video_server_opens` table.

**Features Implemented:**
- **Public:** Homepage, Courses directory (with keyword filtering and search), About.
- **Auth:** Supabase Auth login/signup.
- **Admin Dashboard:** Overview Stats (with Video Opens per Server chart, Total Video Opens KPI, and Total AI Queries), Course Builder (CRUD sections/topics/quizzes, PDF/Video uploads, Keywords, per-server mirror open badges), Student Management (interactive student analytics modal with enrolled courses progress, completed lessons history, uploaded/reviewed worksheets with scores and feedback, quiz attempts, editable student/parent WhatsApp numbers, 1-click WhatsApp progress report generator, and dedicated AI Assistant tab with usage metrics, question quota controls, and 1-click Stop/Enable AI access toggle), Live Sessions (Scheduling, Requests), AI Chat Logs (live monitor with total messages, token consumption, est. API cost, active vs paused student breakdown, filtering, and 1-click AI stop/enable controls), Settings.
- **Student Dashboard:** Enrolled Courses, Course Player (with seamless background video server open logging, student view clean with no open counts exposed), Wallet (balance/transactions), Live Sessions (Invitations, Booking), Notifications, Reminders, Profile.
- **AI Chatbot & Token Tracking Engine:** Dual-model balancer (Claude 3.7 Sonnet & GPT-4o) with prompt & completion token accounting, cost calculations, student quota management, instant instructor lockout enforcement (403 block preventing API calls and token waste), and real-time locked-out UI with notification banners.

### 3. Immediate Next Steps
The following features still need implementation. Ask me which one to tackle first:

1. **Payment Gateway Integration:** Checkout flow for purchasing courses or topping up Wallet (Stripe or Paymob).
2. **Interactive Video & PDF Viewer:** Connect Course Player to `react-pdf` for worksheets and YouTube iframe API for video watch progress tracking.
3. **Real AI Integration:** Wire `/api/chat/route.ts` to actual Anthropic SDK with student context.
4. **WhatsApp Reminders:** Integrate Green API/Twilio for automated study reminders.
5. **PDF Progress Certificates:** Auto-generate certificates on course completion.

**Where should we begin?**
