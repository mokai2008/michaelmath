# MichaelMath LMS 🎓📐

A premium, fully functional, and production-ready **Learning Management System (LMS)** designed specifically for solo math tutor **Michael Gad**. 

Built with modern web standards, this platform offers a seamless experience for students to learn mathematics, manage their wallets, book live sessions, and interact with an AI tutor, while offering a robust management suite for the administrator.

---

## 🚀 Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router & Server Actions)
- **Styling:** [Tailwind CSS v3](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/) for premium, fluid animations
- **Database & Auth:** [Supabase](https://supabase.com/) (Postgres database with Row Level Security (RLS), User Authentication, and Supabase Storage for course assets)
- **Payments:** [Stripe](https://stripe.com/) (Wallet top-ups and checkout system)
- **AI Chatbot:** Anthropic/OpenAI SDK integrations
- **Language:** [TypeScript](https://www.typescriptlang.org/)

---

## ✨ Key Features

### 🌐 Public Portal
- **Homepage:** High-conversion landing page with modern typography, smooth gradients, and interactive components.
- **Course Catalog:** Searchable directory with dynamic tag-filtering, keyword searches, and course detail previews.
- **About Page:** Showcase of tutor credentials, teaching methodology, and student testimonials.

### 👨‍🎓 Student Experience
- **Course Player:** Interactive sidebar navigation, progress tracking, built-in PDF reader for worksheets, and integrated video player.
- **Wallet System:** Personal dashboard showing current balances and transaction history for course/section unlocking.
- **Live Session Booking:** Interactive calendar interface where students can request and book available 1-on-1 tutoring slots.
- **AI Study Assistant:** In-app chatbot powered by AI to assist students with homework questions and course topics.
- **Notifications & Reminders:** System notifications and study reminders (ready for WhatsApp integration).

### 👑 Admin Management Dashboard
- **Performance Analytics:** Clean dashboard showing total active students, course enrollment statistics, revenue stats, and request queues.
- **Course Builder:** Fully-featured admin UI to manage courses, drag-and-drop sections, add/edit topics, build quizzes, and upload notes, PDF worksheets, and video lectures.
- **Student Database:** Monitor enrolled students, view transaction logs, manually adjust wallet balances, and manage student accounts.
- **Live Session Planner:** Scheduler to open tutoring slots, review booking requests from students, and schedule live session links.
- **Chat Logs & Settings:** Review student chatbot conversations for quality assurance and manage platform configurations.

---

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18.x or later)
- npm / yarn / pnpm
- A Supabase account and project
- A Stripe developer account

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/michaelmath-lms.git
   cd michaelmath-lms
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and configure the following variables:
   ```env
   # Supabase Credentials
   NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"

   # AI Integration
   OPENAI_API_KEY="your-openai-api-key"
   # or ANTHROPIC_API_KEY if switching to Claude

   # Stripe Credentials
   STRIPE_SECRET_KEY="your-stripe-secret-key"
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="your-stripe-publishable-key"
   STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 🗄️ Database Schema & Policies

The database is built on **Supabase (PostgreSQL)** and contains 18+ interlinked tables mapping courses, enrollments, wallet transactions, scheduling slots, and quiz submissions.

All tables are secured with strict **Row Level Security (RLS)** policies ensuring:
- Students can only view their own profile, wallet transactions, enrollments, and booked sessions.
- Only authenticated admins have write/edit access to course builders, slots availability, and overall settings.
- Backend processes authenticate securely via the `SUPABASE_SERVICE_ROLE_KEY`.

---

## ☁️ Deployment on Vercel

The easiest way to deploy this app is using the Vercel Platform:

1. Push your repository to **GitHub / GitLab / Bitbucket**.
2. Import the project on [Vercel](https://vercel.com/new).
3. Under **Settings > Environment Variables**, add all environment variables listed in your `.env.local` configuration.
4. Click **Deploy**.

> [!WARNING]
> **Production Settings Configuration**: Do not attempt to update API keys through the Admin Settings UI when deployed on Vercel. Because Vercel uses a read-only serverless filesystem, updating values in `.env.local` at runtime is disabled. Always update your keys directly in the **Vercel Dashboard**.
