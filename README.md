# 🏠 Property Hub Uganda

> **Find your perfect space — homes, rentals, land, and guesthouses from trusted brokers across Uganda.**

[![Live Site](https://img.shields.io/badge/Live-propertyhub.dpdns.org-4f46e5?style=for-the-badge)](https://propertyhub.dpdns.org/)
[![Made in Uganda](https://img.shields.io/badge/Made%20in-Uganda%20🇺🇬-000000?style=for-the-badge)](https://propertyhub.dpdns.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

[**🌍 Visit Property Hub**](https://propertyhub.dpdns.org/) · [**📊 Admin Dashboard**](https://propertyhub.dpdns.org/admin.html) · [**📧 Contact**](mailto:matovujoshuajunior@gmail.com)

---

## 📖 Overview

**Property Hub Uganda** is an online real estate marketplace that connects property seekers with verified, trusted brokers across Uganda.

Brokers list properties for free and unlock qualified leads. Property seekers find verified listings, connect with brokers through an intelligent quiz system, and receive the broker's contact details directly in their inbox.

### The Problem We Solve

- **For property seekers:** Finding genuine listings and reliable brokers in Uganda is fragmented across WhatsApp groups, Facebook pages, and word-of-mouth. Fraud and inflated prices are common.
- **For brokers:** Marketing properties online is expensive and lead quality is inconsistent. Commission-only models make overheads hard to cover.

Property Hub fixes both sides with a transparent, reputation-driven marketplace where **verified brokers rank higher**, **qualified leads are paid for individually**, and **every party is accountable**.

---

## ✨ Features

### For Property Seekers (Free)
- 🔍 **Smart search** — Search by text, location, or price (`"under 500k"`, `"300000-700000"`, `"3m"`)
- 🏘️ **Filter by type** — Rentals, Properties (sale), and Guesthouses
- ✅ **Verified badges** — Every listing is reviewed by our team before receiving the Verified mark
- ⭐ **Trusted broker badges** — Awarded to brokers with 4★+ ratings from 10+ reviews
- 📊 **Transparent broker profiles** — See all listings, reviews, and response scores before contacting
- 📨 **Smart lead submission** — Answer a 4-question quiz; the broker receives a qualified lead instantly
- 📧 **Email follow-up** — Receive the broker's contact details once they approve your request
- 🚩 **Report suspicious brokers** — Anonymous reporting keeps the marketplace safe
- 📱 **Fully responsive** — Works on any phone, tablet, or desktop

### For Brokers
- 🆓 **Free property listings** with compressed image uploads (auto-resized to save data)
- 💰 **Prepaid wallet system** — Top up once, unlock leads as they arrive
- 🎯 **Tiered lead pricing** — Pay for what you get:
  - 🔥 **Hot leads** (ready to view within 7 days): **UGX 5,000** per 150,000 of property value
  - 🌤️ **Warm leads** (interested, comparing): **UGX 3,250** per 150,000
  - ❄️ **Cold leads** (just browsing): **UGX 1,750** per 150,000
  - 🏨 **Guesthouses**: flat 4% of property price
- 🛡️ **Property verification service** — For UGX 5,000 per property, our team verifies ownership documents and awards a **Verified** badge (boosted ranking)
- 📈 **Rank score system** — Verified properties + trusted brokers rank highest in search
- 📬 **Lead management** — Unlock, reject, or archive leads from your dashboard
- 🎁 **Automatic visitor follow-ups** — Visitors receive a follow-up email 3 days after approval, requesting a review and offering relevant services

### For Admins
- 📊 **Full dashboard** — Real-time stats on brokers, properties, verifications, leads
- 🛡️ **Property verification queue** — Review submitted ownership docs (title, LC1, survey) with inline image previews
- 🚨 **Report management** — Investigate and resolve user reports
- 💰 **Wallet transaction ledger** — Every top-up, lead unlock, and verification fee tracked
- 🔍 **Programmatic SEO control** — Auto-generated location, type, and price-range landing pages
- ⚙️ **Platform settings** — Adjust verification fee, cleanup schedule, and lead cleanup days
- 🧹 **Automatic cleanup** — Approved/rejected leads purged after 30 days; stale pending leads expire after 7 days

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5 + Tailwind CSS + Vanilla JavaScript | Fast, no-build-step SPA |
| **Backend** | [Supabase](https://supabase.com/) | Auth, Postgres database, storage, realtime, edge functions |
| **Hosting** | [GitHub Pages](https://pages.github.com/) | Static hosting with custom domain |
| **DNS/CDN** | [Cloudflare](https://cloudflare.com/) | DNS, SSL, caching |
| **Email** | [Web3Forms](https://web3forms.com/) | Transactional email relay |
| **Image Compression** | [browser-image-compression](https://www.npmjs.com/package/browser-image-compression) | Client-side image optimization |
| **Realtime** | Supabase Realtime | Live property card updates |

**No npm. No build. No framework.** Just a single `index.html` that loads Supabase from CDN and runs.

---

## 🏗️ Architecture
