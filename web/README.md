# Reft.AI — Web Application (React.js Frontend)

Complete web application conversion of **Reft.AI — Refund Evidence Verification System**, reproducing the full Flutter mobile application's UI, workflows, design language, and business logic in modern React.js.

---

## 🚀 Key Highlights & Architecture

- **100% Faithful UI Reproduction**: Replicates the slate-blue fintech design system (`#6A89A7`, `#BDDDFC`, `#88BDF2`, `#384959`, `#F6F9FC`), typography, cards, badges, dialogs, and animations from the original Flutter app.
- **Responsive Across All Form Factors**: Fully responsive on desktop monitors, laptops, tablets, Android smartphones, and iPhones.
- **Zero-Registration Customer Flow**: Customers verify return claims using their secure verification token or direct link without creating an account or logging in.
- **Product Reference Gating**: Enforces merchant registration of all 4 canonical reference angles (`FRONT`, `BACK`, `LEFT`, `RIGHT`) before sessions can be generated.
- **13-Facet Multimodal Investigation**: Comprehensive inspection screen with visual findings, deterministic carrier/telemetry signals, reasoning synthesis, and sticky merchant decision bar.
- **5-Tab Customer Dossier & 9-Section Explainable Report**: Complete evidence drill-down, audit chronology, and print-ready formal PDF audit report.
- **Future Backend Ready (Phase 2)**: Dedicated API service layer (`src/services/api/`) that operates seamlessly offline with rich mock data and connects to the upcoming Node.js/Express/MongoDB/Gemini backend via `VITE_API_BASE_URL`.

---

## 🛠 Technology Stack

- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS v3 + Custom Design System Tokens
- **Icons**: Lucide React
- **Routing**: React Router v7 (`react-router-dom`)
- **HTTP Client**: Axios with interceptors and mock fallback
- **State Management**: React Context (`AuthContext`, `MerchantContext`, `CustomerFlowContext`, `ServerConfigContext`)
- **Charts / Visuals**: Recharts

---

## 📂 Project Structure

```
web/
├── public/
│   └── assets/
│       └── branding/
│           ├── reft_icon.png
│           └── reft_wordmark.png
├── src/
│   ├── assets/              # Icons and branding assets
│   ├── components/
│   │   ├── common/          # Badges, StatCards, SectionCards, Headers, ImageViewerDialog
│   │   ├── merchant/        # DecisionDialog, HoldDialog, DeleteDialog, QuickAddProductDialog
│   │   └── customer/        # CustomerCameraCapture, DynamicAiFollowUpSheet, Step components
│   ├── constants/
│   │   ├── appColors.js     # Exact Flutter color tokens
│   │   └── apiEndpoints.js  # Configurable backend endpoints
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── MerchantContext.jsx
│   │   ├── CustomerFlowContext.jsx
│   │   └── ServerConfigContext.jsx
│   ├── pages/
│   │   ├── auth/            # LoginPage
│   │   ├── gateway/         # GatewayPage (Welcome / Token entry / Merchant entry)
│   │   ├── merchant/        # Dashboard, CreateVerification, CreatedShare, Investigation,
│   │   │                    # CustomerResponse (5-tab dossier), Report (9-section), Timeline,
│   │   │                    # WorkflowBuilder (7 layers)
│   │   │   └── settings/    # MerchantSettings, ProductList, ProductReferenceEvidence (4-angle)
│   │   └── customer/        # SessionOverview, WorkflowRunner, Reviewing (AI stages),
│   │                        # CustomerCompletion, InvalidToken
│   ├── routes/              # AppRoutes, ProtectedRoute
│   ├── services/
│   │   ├── api/             # apiClient, authService, merchantService, productService, verificationService
│   │   └── mockData/        # initialProducts, initialWorkflows, initialVerifications
│   ├── utils/               # formatters (currency ₹, dates, time remaining, hash truncation)
│   ├── App.jsx              # Providers wrapper and app root
│   ├── index.css            # Tailwind directives and custom scrollbars
│   └── main.jsx
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## ⚡ Getting Started & Running Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration:
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_DATA=true
```

### 3. Start Development Server
To test both locally and from your mobile device over the local Wi-Fi network:
```bash
npm run dev -- --host 0.0.0.0
```

The terminal will report:
- **Local URL**: `http://localhost:5173/`
- **Network URL**: `http://<your-lan-ip>:5173/` (open on phone)

### 4. Build for Production
```bash
npm run build
```

---

## 🔑 Demo Credentials & Test Sessions

### Merchant Portal Login
- **URL**: `/login` (or click "Merchant Sign In" from Gateway)
- **Email**: `merchant@example.com`
- **Password**: `password123`
*(A "Use Demo Credentials" button is also provided for instant 1-click fill).*

### Customer Verification Tokens
You can test the customer flow by navigating to `/` and entering any of the preloaded demo tokens:
- **VR-2026-9041** — Active Claim (Order `#ORD-94821` • Smart Wireless Headset • ₹4,999.00)
- **VR-2026-8812** — High-Value Return (Order `#ORD-94210` • 4K Ultra OLED Monitor • ₹42,500.00)
- **VR-2026-7734** — Inconsistency Detected (Order `#ORD-93911` • Noise-Canceling Earbuds • ₹2,499.00)

Or directly open:
```
http://localhost:5173/verify/VR-2026-9041
```

---

## 🔄 Recreated Workflows & Features

### 1. Verification Layers
Configurable under `/workflows`:
1. **Camera-First Evidence Submission**: Direct device sensor capture.
2. **AI-Assisted Image Authenticity Screening**: Detects moiré and synthetic generation.
3. **Geolocation Validation**: Browser coordinates compared with shipping destination.
4. **Delivery-Detail Validation**: Carrier timestamps checked against the return window.
5. **Dynamic AI Follow-Up Questions**: Autonomous clarification round triggered on ambiguous findings.
6. **Trusted Product Reference Comparison**: 4 canonical angles baseline comparison.
7. **Merchant-Defined Evidence Questions**: Custom survey questions configured by merchant.

### 2. AI Processing States
Recreates the exact stage pipeline during customer submission:
$$\text{Uploading} \longrightarrow \text{Queued} \longrightarrow \text{Visual Analysis} \longrightarrow \text{Reasoning} \longrightarrow \text{Complete}$$
- Dynamic follow-up sheet opens automatically during analysis for clarification.
- Merchant reference upload displays non-blocking: *"AI is analyzing your reference images..."*

### 3. Machine Assessment vs. Merchant Decision
Maintains strict separation:
- **Machine Assessment (AI Advisory)**:
  - `EVIDENCE_CONSISTENT` (Green)
  - `REVIEW_REQUIRED` (Amber)
  - `INCONSISTENCY_DETECTED` (Red)
- **Merchant Decision (Human Authority)**:
  - `REFUND_APPROVED` / `REFUND_REJECTED` / `MANUAL_REVIEW` / `HOLD`
  - Actions: Full Refund, Partial Refund, Replacement, Store Credit, No Refund

---

## 🤝 Phase 2 Backend Integration Guide

The frontend is specifically structured for integration with your Node.js + Express + MongoDB + Gemini backend:
1. Update `VITE_API_BASE_URL` in `.env` to point to the backend server.
2. Toggle `VITE_USE_MOCK_DATA=false` when backend endpoints are ready.
3. All network requests flow through `src/services/api/apiClient.js` which automatically attaches JWT tokens from `localStorage` under `Authorization: Bearer <token>`.
