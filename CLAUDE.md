# Handoff Context for Anthropic Claude

**Instructions for the User:** Copy all the text below and paste it into your new chat with Claude when you are ready to continue working on this project.

---

<system_prompt>
You are an elite Next.js 14, React, Tailwind CSS, and Supabase developer. We are building a high-end Learning Management System (LMS) for a solo math tutor named Michael Gad.
</system_prompt>

<project_objective>
To finalize a production-ready LMS web platform utilizing Next.js 14 (App Router), Tailwind CSS, Supabase (Auth, DB, Storage), Stripe/Paymob (Payments), and Claude API (for an in-platform AI Study Assistant).
</project_objective>

<current_state>
The project is well past initial scaffolding. All components compile without runtime errors. Updated July 2026.

**Stack**: Next.js 14.2, Tailwind CSS 3, TypeScript, Supabase, Lucide-React icons.

**Database (Supabase Postgres)**: 19+ tables with RLS. Migrations up to date (live sessions, slots, tracking, notifications, course assets bucket, wallet system, video server opens). Added `keywords` text[] column to `courses` table and `video_server_opens` table for tracking bandwidth load balanced mirrors.

**Features Implemented:**
- **Public:** Homepage, Courses directory (with keyword filtering and search), About.
- **Auth:** Login + Signup forms wired to Supabase Auth.
- **Admin UI:** Dashboard Overview & Stats (with Video Opens per Server chart and Total Video Opens KPI), Course Builder (CRUD sections/topics/quizzes, PDF/Video uploads, Keywords, per-server mirror open badges), Students Directory (interactive student profile analytics drawer with enrolled courses progress, completed lessons timeline, uploaded & reviewed worksheets with feedback, quiz history, editable student/parent WhatsApp numbers, and instant WhatsApp report generator buttons), Live Sessions (3-tab design for Sessions, Schedule, Requests), Chat Logs, Settings.
- **Student UI:** Enrolled Courses, Course Player (with seamless background video server open logging, student view clean with no open counts exposed), Wallet, Live Sessions (Invitations, Booking), Notifications, Reminders, Profile.
- **AI Chatbot**: Basic widget and API route exist, not yet wired to real SDK.
</current_state>

<instructions>
We need to continue connecting backend logic and implementing business features. Acknowledge this context, then propose an execution plan for the remaining milestones. Wait for my confirmation before writing code.

Remaining milestones:
1. **Payments / Wallet**: Integrate Stripe or Paymob for wallet top-up and section unlocking.
2. **Interactive Video & PDF Viewer**: Connect Course Player to `react-pdf` for worksheets and YouTube iframe API for video watch progress tracking.
3. **Real AI Integration**: Wire `/api/chat/route.ts` to Anthropic SDK with dynamic student context.
4. **WhatsApp Reminders**: Green API/Twilio integration for automated study reminders.
5. **PDF Certificates**: Auto-generate progress certificates on course completion.
</instructions>
