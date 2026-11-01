# StreetVend OS

You are an expert product engineer and startup CTO.

Build a production-quality web application called "QSSF OS".

QSSF (Quick Service Street Food Framework) is NOT a food delivery app.

It is an operating system for street food vendors that manages orders, payments, inventory, hygiene, analytics, staff, and customer loyalty.

The first business using this software is a premium pani puri brand called Fulki.

The product should be built so that any street food vendor can eventually use it.

Tech Stack:

- React

- TypeScript

- Tailwind CSS

- Supabase Authentication

- PostgreSQL (Supabase)

- Responsive design (desktop and mobile)

Design Language:

Modern

Minimal

Premium

Fast

Dark mode by default

White typography

Orange accents inspired by pani puri

Rounded cards

Smooth animations

Professional SaaS dashboard

Create the project architecture only.

Include:

Authentication

Landing Page

Sidebar Navigation

Dashboard Layout

Database setup

Protected routes

Reusable UI components

Theme system

State management

Folder structure

Do NOT build every feature yet.

Leave placeholders for:

Orders

Inventory

Payments

Hygiene

Analytics

Customers

Staff

Reports

AI

The code should be clean, modular and scalable.

Assume this product will eventually support thousands of vendors.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://qssfos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/37c67ab8-188d-415f-8ada-5ea01131d8a9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

### Supabase authentication

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` plus the
project's public anon/publishable key in `VITE_SUPABASE_ANON_KEY`. These values
are intentionally client-visible; never use a service-role key or store secrets
in `VITE_*` variables.

Sign-in uses Supabase email or SMS one-time codes and does not create accounts.
Configure the Email and Phone providers, email SMTP settings, SMS provider API
credentials, and message templates in **Supabase Dashboard → Authentication**
(Providers, SMTP Settings, and Message Templates). SMS WebOTP autofill requires
the SMS template to end with the origin-bound suffix `@your-domain #{{ .Code }}`,
using the application's host without a scheme or path.
