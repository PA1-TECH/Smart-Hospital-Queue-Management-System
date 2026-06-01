# 🩺 Genesys Care: Intelligent Triage & Clinic Congestion Flow

Genesys Care is a full-stack, real-time medical walk-in queue monitor paired with intelligent symptoms pre-triage recommendations. Built with **React 18**, **Tailwind CSS**, and **Node.js (Express)**, it manages incoming patient volume, predicts clinical bottlenecks, conducts immediate Gemini-assisted priority assessments, and dispatches digital consultation passes with a built-in printer simulator.

---

## ✨ Features Key Overview

*   **👥 Admissions desk (Receptionist Portal):** Rapid registration of patient walked-in data, symptoms tracking, and live queue dispatcher.
*   **🧠 Gemini Pre-Triage Recommendation:** Real-time AI consultation guidelines, symptoms classification, priority sorting, and contingency rule-bound local safety checks.
*   **⏰ Smart Congestion Forecasting & Heuristic Wait Predictions:** Predictive model balancing practitioner speeds, queue densities, and specialty wing active loads.
*   **📊 Superintendent Intelligence Desk (Admin Portal):** Modular data visualization panels monitoring department roster flows, active wait ratios, and class classifications with interactive Recharts components.
*   **🖨️ Thermal Pass Printer Simulator (Patient Portal):** Dedicated ticket preview window rendering a physical-like thermal slip pass, complete with simulated barcodes and a real browser printer engine dispatch hook.
*   **💬 Clinic Virtual Assistant:** Floating AI hospital chat bubble supporting patient direction lookup, room coordinates, wait times, and hospital procedures.

---

## 🎨 Creative Architecture & Theme

The system features a bespoke visual scheme called **Cosmic Slate**:
*   **Typography:** Elegant display typography via *Inter* paired with *JetBrains Mono* for timestamps, ticket details, and simulated thermal receipts.
*   **Coloring:** Slate charcoal bases contrasted against deep indigos, refined slate-gray layout blocks, and crimson emergency overrides.
*   **Skeuomorphism:** Dynamic thermal slip print modal simulating genuine receipt paper, mimicking real clinical tickets perfectly.

---

## 🚀 Getting Started

### 📦 Run Dev Environment
To boot up the unified dev platform running the Express backend and Vite hot micro-server together:
```bash
npm run dev
```

### 🏗️ Production Build Package
Creates highly efficient static client bundles and bundles `server.ts` into a fast, portable CommonJS format (`dist/server.cjs`) using esbuild to guarantee smooth container cold starts:
```bash
npm run build
```

### 🏁 Production Start
Directly launch the production-ready consolidated runtime:
```bash
npm run start
```

---

*Genesys Care Clinical Triage — Crafted for smart clinic throughput.*
