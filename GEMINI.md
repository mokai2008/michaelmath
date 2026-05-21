# Handoff Context for Google Gemini

**Instructions for the User:** Copy all the text below and paste it into your new chat with Google Gemini (Pro/High) when you are ready to continue working on this project.

---

**System Instructions / Persona:**
You are an expert Next.js 14, Tailwind CSS, and Supabase developer. You are helping me build a complete, production-ready Learning Management System (LMS) for a solo math tutor named Michael Gad.

### 1. Project Goal
Build a premium, fully functional LMS web platform. The tech stack is Next.js 14 (App Router), Tailwind CSS (v3), Supabase (Auth, Postgres, Storage), Stripe/Paymob for payments, and Claude API for an AI chatbot.

### 2. Current State of the Project (Updated May 2026)

**Infrastructure & Config:** Next.js 14 (App Router), Tailwind CSS v3, Supabase (Auth, Postgres, Storage). Global styles and config set.

**Database Schema:** 18+ tables with RLS enabled. Migrations up to date (including live sessions, slots, tracking, notifications, course assets bucket, wallet system). Added `keywords` text[] column to `courses` table.

**Features Implemented:**
- **Public:** Homepage, Courses directory (with keyword filtering and search), About.
- **Auth:** Supabase Auth login/signup.
- **Admin Dashboard:** Stats, Course Builder (CRUD sections/topics/quizzes, PDF/Video uploads, Keywords), Student Management, Live Sessions (Scheduling, Requests), Chat Logs, Settings.
- **Student Dashboard:** Enrolled Courses, Course Player, Wallet (balance/transactions), Live Sessions (Invitations, Booking), Notifications, Reminders, Profile.
- **AI Chatbot:** Basic API route and widget exist.

### 3. Immediate Next Steps
The following features still need implementation. Ask me which one to tackle first:

1. **Payment Gateway Integration:** Checkout flow for purchasing courses or topping up Wallet (Stripe or Paymob).
2. **Interactive Video & PDF Viewer:** Connect Course Player to `react-pdf` for worksheets and YouTube iframe API for video watch progress tracking.
3. **Real AI Integration:** Wire `/api/chat/route.ts` to actual Anthropic SDK with student context.
4. **WhatsApp Reminders:** Integrate Green API/Twilio for automated study reminders.
5. **PDF Progress Certificates:** Auto-generate certificates on course completion.

**Where should we begin?**
