# Reservd Monorepo (`reservd-tech`)

This monorepo contains the core web applications for **Reservd**, built using React, TypeScript, Vite, and Supabase.

---

## 📁 Repository Structure

* **`fulki-delights-app/`**: Customer Storefront application (`reservd.store`)
* **`qssfos/`**: Vendor Operations & Management Dashboard (`vendors.reservd.store`)

---

## 🚀 Deployment (Vercel)

Both applications are deployed separately on **Vercel** pointing to this monorepo:

1. **Customer App:** Root directory set to `fulki-delights-app` $\rightarrow$ Domain: `reservd.store`
2. **Vendor App:** Root directory set to `qssfos` $\rightarrow$ Domain: `vendors.reservd.store`

---

## 🔑 Environment Variables

To connect to Supabase, configure the following variables in Vercel project settings:

```env
VITE_SUPABASE_URL=[https://your-supabase-url.supabase.co](https://your-supabase-url.supabase.co)
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
