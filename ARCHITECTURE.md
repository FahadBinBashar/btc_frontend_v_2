# BTC SMEGA Platform - Complete System Documentation

This document provides comprehensive end-to-end documentation of the BTC SMEGA Platform, including all customer journeys, system architecture, data flows, and technical implementation details.

---

## Table of Contents

1. [Platform Overview](#platform-overview)
2. [Customer Journeys](#customer-journeys)
   - [Buy eSIM](#1-buy-esim-flow)
   - [SIM Swap](#2-sim-swap-flow)
   - [KYC Compliance](#3-kyc-compliance-flow)
   - [New Physical SIM](#4-new-physical-sim-flow)
   - [SMEGA Registration](#5-smega-registration-flow)
3. [System Architecture](#system-architecture)
4. [Database Schema](#database-schema)
5. [Edge Functions](#edge-functions)
6. [MetaMap KYC Integration](#metamap-kyc-integration)
7. [Admin Portal](#admin-portal)
8. [Security & Authentication](#security--authentication)
9. [Development Guidelines](#development-guidelines)

---

## Platform Overview

BTC SMEGA is a digital self-service platform for Botswana Telecommunications Corporation (BTC) customers to manage their mobile services. The platform enables customers to:

- Purchase new eSIMs with instant activation
- Swap existing SIMs (physical or eSIM)
- Complete KYC compliance verification
- Register for new physical SIMs
- Register for SMEGA digital services

### Key Features

- **Self-Service**: Customers complete all workflows independently
- **Instant Verification**: MetaMap-powered KYC with real-time document/biometric verification
- **Multi-Channel**: eSIM delivery via QR/LPA or physical SIM collection at BTC shops
- **Demo Mode**: Relaxed validation for testing (any 4-digit OTP accepted)

---

## Customer Journeys

### Visual Overview of All 5 Workflows

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              BTC SMEGA PLATFORM - 5 SERVICE FLOWS                            │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                │
│  │  Landing    │────▶│  Services   │────▶│  Select     │────▶│  Start      │                │
│  │  Page       │     │  Section    │     │  Service    │     │  Flow       │                │
│  └─────────────┘     └─────────────┘     └─────────────┘     └──────┬──────┘                │
│                                                                      │                       │
│         ┌────────────────┬────────────────┬────────────────┬────────┴───────┐               │
│         ▼                ▼                ▼                ▼                ▼               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Buy eSIM   │  │  SIM Swap   │  │    KYC      │  │ New Physical│  │   SMEGA     │       │
│  │             │  │             │  │ Compliance  │  │    SIM      │  │Registration │       │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘       │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. Buy eSIM Flow

**Purpose**: New customers purchase an eSIM with a new phone number and data plan.

**Service Type**: `esim_purchase`

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BUY eSIM JOURNEY                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  Step 1         Step 2         Step 3         Step 4         Step 5         Step 6         │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       │
│  │Terms │──────▶│Pay-  │──────▶│Number│──────▶│Regis-│──────▶│MetaMap│──────▶│Con-  │       │
│  │& Con-│       │ment  │       │Select│       │tration│      │ KYC   │       │firm  │       │
│  │ditions│      │      │       │      │       │      │       │       │       │      │       │
│  └──────┘       └──────┘       └──────┘       └──────┘       └──────┘       └──────┘       │
│      │              │              │              │              │              │            │
│      ▼              ▼              ▼              ▼              ▼              ▼            │
│  Accept         Select Plan    Choose MSISDN  Personal      ID/Passport   Review &       │
│  Terms          & Pay          from Pool      Details       + Selfie      Confirm        │
│                                                                                              │
│                                                                              │               │
│                                                                              ▼               │
│  Step 7                                                                                      │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐       │
│  │                              ACTIVATION                                           │       │
│  │  ┌─────────────────────────────────┐  ┌─────────────────────────────────────┐    │       │
│  │  │         QR Code                 │  │          LPA String                 │    │       │
│  │  │  [Scan with camera to install]  │  │  SM-DP+: example.com               │    │       │
│  │  │                                 │  │  Code: LPA:xxxxx                    │    │       │
│  │  └─────────────────────────────────┘  └─────────────────────────────────────┘    │       │
│  └──────────────────────────────────────────────────────────────────────────────────┘       │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Step Details**:

| Step | Component | Description |
|------|-----------|-------------|
| 1. Terms | `TermsConsent.tsx` | User accepts terms and conditions |
| 2. Payment | `PaymentStep.tsx` | Select plan (eSIM Only P10, Starter, Value, Premium) and payment method |
| 3. Number | `NumberSelection.tsx` | Choose phone number from available pool |
| 4. Registration | `RegistrationForm.tsx` | Enter personal details, address, next-of-kin |
| 5. KYC | `KYCVerification.tsx` | MetaMap verification (Omang or Passport + Selfie) |
| 6. Confirm | `KYCConfirmation.tsx` | Review extracted KYC data |
| 7. Activation | `ESIMActivation.tsx` | Display QR code and LPA string for eSIM installation |

**Data Collected**:
- Personal: Name, DOB, email, address, next-of-kin
- Document: ID number, expiry date, document photos
- Selection: MSISDN, plan type, payment method

---

### 2. SIM Swap Flow

**Purpose**: Existing customers transfer their phone number to a new SIM card (eSIM or physical).

**Service Type**: `sim_swap`

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    SIM SWAP JOURNEY                                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  Step 1         Step 2         Step 3         Step 4         Step 5         Step 6         │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       │
│  │MSISDN│──────▶│ OTP  │──────▶│Pay-  │──────▶│MetaMap│──────▶│ SIM  │──────▶│Com-  │       │
│  │Entry │       │Verify│       │ment  │       │ KYC   │       │ Type │       │plete │       │
│  │      │       │      │       │(P10) │       │       │       │Select│       │      │       │
│  └──────┘       └──────┘       └──────┘       └──────┘       └──────┘       └──────┘       │
│      │              │              │              │              │              │            │
│      ▼              ▼              ▼              ▼              ▼              ▼            │
│  Enter         Verify via     Pay P10        ID/Passport   Choose eSIM    Delivery       │
│  existing      SMS OTP        swap fee       + Selfie      or Physical    method         │
│  number                                                                                      │
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                           DELIVERY OPTIONS                                           │    │
│  │                                                                                      │    │
│  │  ┌─────────────────────────────┐    ┌─────────────────────────────────────────┐    │    │
│  │  │         eSIM                │    │           Physical SIM                  │    │    │
│  │  │  • Instant QR Code          │    │  • Select BTC Shop location             │    │    │
│  │  │  • LPA String               │    │  • PDF confirmation generated           │    │    │
│  │  │  • Immediate activation     │    │  • Collect at counter                   │    │    │
│  │  └─────────────────────────────┘    └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Step Details**:

| Step | Component | Description |
|------|-----------|-------------|
| 1. MSISDN Entry | `SIMSwapNumberEntry.tsx` | Enter existing BTC phone number |
| 2. OTP | `SIMSwapOTP.tsx` | Verify ownership via SMS OTP (optional skip if can't receive) |
| 3. Payment | `SIMSwapPayment.tsx` | Pay P10 swap fee via mobile money or card |
| 4. KYC | `SIMSwapKYC.tsx` | MetaMap verification for security |
| 5. SIM Type | `SIMSwapTypeSelection.tsx` | Choose eSIM or physical SIM |
| 6a. eSIM | `SIMSwapESIM.tsx` | Display QR/LPA for instant activation |
| 6b. Physical | `SIMSwapShopSelection.tsx` | Select BTC shop, download PDF confirmation |

**Key Business Rules**:
- P10 mandatory swap fee
- OTP verification for number ownership (can be skipped if phone damaged)
- KYC required for fraud prevention
- Physical SIM requires shop visit with PDF confirmation

---

### 3. KYC Compliance Flow

**Purpose**: Existing customers update their KYC records for regulatory compliance.

**Service Type**: `kyc_compliance`

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 KYC COMPLIANCE JOURNEY                                       │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  Step 1         Step 2         Step 3         Step 4         Step 5         Step 6         │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       │
│  │Terms │──────▶│Phone │──────▶│ OTP  │──────▶│Regis-│──────▶│MetaMap│──────▶│Thank │       │
│  │& Con-│       │Number│       │Verify│       │tration│      │ KYC   │       │ You  │       │
│  │ditions│      │Entry │       │      │       │      │       │       │       │      │       │
│  └──────┘       └──────┘       └──────┘       └──────┘       └──────┘       └──────┘       │
│      │              │              │              │              │              │            │
│      ▼              ▼              ▼              ▼              ▼              ▼            │
│  Accept         Enter BTC     Verify via     Address &      ID/Passport   Confirmation   │
│  Terms          number        SMS OTP        Next-of-Kin    + Selfie      message        │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Step Details**:

| Step | Component | Description |
|------|-----------|-------------|
| 1. Terms | `KYCComplianceTerms.tsx` | Accept KYC update terms |
| 2. Phone Number | `KYCComplianceNumberEntry.tsx` | Enter existing BTC number |
| 3. OTP | `KYCComplianceOTP.tsx` | Verify number ownership |
| 4. Registration | `KYCComplianceRegistration.tsx` | Update address, next-of-kin details |
| 5. Verification | `KYCComplianceVerification.tsx` | MetaMap document + biometric scan |
| 6. Complete | `KYCComplianceComplete.tsx` | Success confirmation |

**Purpose of Flow**:
- Regulatory compliance with BOCRA requirements
- Update outdated customer information
- Verify current identity documents

---

### 4. New Physical SIM Flow

**Purpose**: New customers register for a physical SIM card for shop collection.

**Service Type**: `new_physical_sim`

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              NEW PHYSICAL SIM JOURNEY                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  Step 1         Step 2         Step 3         Step 4         Step 5         Step 6         │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       │
│  │Terms │──────▶│Plan  │──────▶│Number│──────▶│Regis-│──────▶│MetaMap│──────▶│ Shop │       │
│  │& Con-│       │Select│       │Select│       │tration│      │ KYC   │       │Select│       │
│  │ditions│      │      │       │      │       │      │       │       │       │      │       │
│  └──────┘       └──────┘       └──────┘       └──────┘       └──────┘       └──────┘       │
│      │              │              │              │              │              │            │
│      ▼              ▼              ▼              ▼              ▼              ▼            │
│  Accept         Choose        Choose         Personal      ID/Passport   Select BTC     │
│  Terms          data plan     MSISDN         details       + Selfie      shop & PDF     │
│                                                                                              │
│                                              ┌──────────────────────────────────────┐       │
│                                              │       PDF CONFIRMATION               │       │
│                                              │  • Customer details                  │       │
│                                              │  • Selected MSISDN                   │       │
│                                              │  • Pickup location                   │       │
│                                              │  • Reference number                  │       │
│                                              └──────────────────────────────────────┘       │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Similar to Buy eSIM but**:
- Final step is shop selection instead of QR activation
- Customer receives PDF confirmation
- Must visit BTC shop to collect physical SIM
- Staff verifies identity against PDF at collection

---

### 5. SMEGA Registration Flow

**Purpose**: Register for BTC SMEGA digital ecosystem services.

**Service Type**: `smega_registration`

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SMEGA REGISTRATION JOURNEY                                      │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  Step 1         Step 2         Step 3         Step 4         Step 5                        │
│  ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐       ┌──────┐                       │
│  │Terms │──────▶│Phone │──────▶│Regis-│──────▶│MetaMap│──────▶│Success│                     │
│  │& Con-│       │Number│       │tration│      │ KYC   │       │      │                      │
│  │ditions│      │+ OTP │       │      │       │       │       │      │                      │
│  └──────┘       └──────┘       └──────┘       └──────┘       └──────┘                       │
│      │              │              │              │              │                           │
│      ▼              ▼              ▼              ▼              ▼                           │
│  Accept         Verify        Create         ID/Passport   Account ready                  │
│  SMEGA terms    number        profile        + Selfie      for services                   │
│                                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │                         SMEGA SERVICES UNLOCKED                                     │    │
│  │  • Digital Wallet           • Bill Payments          • Airtime Purchase            │    │
│  │  • Money Transfers          • Merchant Payments      • Financial Services          │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**SMEGA Ecosystem Benefits**:
- Digital wallet functionality
- Peer-to-peer money transfers
- Merchant payments
- Bill payments and airtime top-up
- Access to financial services

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND LAYER                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │   React 18  │  │  Tailwind   │  │  shadcn/ui  │  │   Framer    │  │  TanStack Query │   │
│  │   + Vite    │  │     CSS     │  │  + Radix UI │  │   Motion    │  │  (State Mgmt)   │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────────────────────────────┐   │
│  │ React Hook  │  │   Zod       │  │              React Router DOM                     │   │
│  │    Form     │  │ Validation  │  │              (Client Routing)                     │   │
│  └─────────────┘  └─────────────┘  └───────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ Supabase Client SDK
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              BACKEND LAYER (Lovable Cloud)                                   │
│                                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                           SUPABASE EDGE FUNCTIONS (Deno)                               │  │
│  │                                                                                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │ kyc-create-     │  │ kyc-update-     │  │  kyc-get-       │  │ kyc-get-        │   │  │
│  │  │ record          │  │ record          │  │  record         │  │ documents       │   │  │
│  │  │ (Create new)    │  │ (Status update) │  │  (Polling)      │  │ (Signed URLs)   │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘   │  │
│  │                                                                                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐   │  │
│  │  │ metamap-webhook │  │ metamap-config  │  │ admin-kyc-list  │  │ admin-kyc-stats │   │  │
│  │  │ (KYC callbacks) │  │ (Client config) │  │ (Admin listing) │  │ (Dashboard)     │   │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘   │  │
│  │                                                                                        │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                                             │  │
│  │  │ admin-users     │  │ admin-payment-  │                                             │  │
│  │  │ (User mgmt)     │  │ transactions    │                                             │  │
│  │  └─────────────────┘  └─────────────────┘                                             │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              │                                               │
│  ┌───────────────────────────────────────────┼───────────────────────────────────────────┐  │
│  │                         POSTGRESQL DATABASE                                           │  │
│  │                                                                                       │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │  │
│  │  │kyc_verifications│  │payment_         │  │   profiles      │  │   user_roles    │  │  │
│  │  │                 │  │transactions     │  │                 │  │                 │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘  │  │
│  │                                                                                       │  │
│  │                    Row-Level Security (RLS) Policies Enabled                         │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              │                                               │
│  ┌───────────────────────────────────────────┼───────────────────────────────────────────┐  │
│  │                         SUPABASE STORAGE                                              │  │
│  │                                                                                       │  │
│  │  ┌───────────────────────────────────────────────────────────────────────────────┐   │  │
│  │  │  kyc-documents (Private Bucket)                                                │   │  │
│  │  │  • ID Front/Back photos                                                        │   │  │
│  │  │  • Passport photos                                                             │   │  │
│  │  │  • Selfie images                                                               │   │  │
│  │  │  • Accessed via signed URLs                                                    │   │  │
│  │  └───────────────────────────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
│                                              │                                               │
│  ┌───────────────────────────────────────────┼───────────────────────────────────────────┐  │
│  │                         AUTH SYSTEM                                                   │  │
│  │  • Email/Password Authentication (Admin Portal)                                       │  │
│  │  • Session Management via localStorage                                                │  │
│  │  • Role-Based Access Control (admin/user)                                            │  │
│  │  • Super Admin auto-assignment trigger                                               │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                              │
                                              │ Webhook Integration
                                              ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SERVICES                                               │
│                                                                                              │
│  ┌───────────────────────────────────────────────────────────────────────────────────────┐  │
│  │                              METAMAP KYC VERIFICATION                                  │  │
│  │                                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Document Verification                                                          │  │  │
│  │  │  • Omang (National ID) - Citizen Flow                                           │  │  │
│  │  │  • Passport - Non-Citizen Flow                                                  │  │  │
│  │  │  • OCR Data Extraction                                                          │  │  │
│  │  │  • Document Authenticity Checks                                                 │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Biometric Verification                                                         │  │  │
│  │  │  • Selfie capture                                                               │  │  │
│  │  │  • Face-to-document matching                                                    │  │  │
│  │  │  • Liveness detection                                                           │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                                        │  │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Webhook Callbacks                                                              │  │  │
│  │  │  • verification.completed → Update status to 'verified'                         │  │  │
│  │  │  • verification.rejected → Update status to 'rejected'                          │  │  │
│  │  │  • verification.reviewNeeded → Mapped to 'rejected'                             │  │  │
│  │  │  • Automatic photo download and storage                                         │  │  │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Technology Stack Details

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 18.3.1 | UI component library |
| | Vite | Latest | Build tool & dev server |
| | TypeScript | Latest | Type safety |
| | Tailwind CSS | Latest | Utility-first styling |
| | shadcn/ui | Latest | Pre-built UI components |
| | Radix UI | Various | Headless UI primitives |
| | Framer Motion | 12.x | Animations |
| | TanStack Query | 5.x | Server state management |
| | React Hook Form | 7.x | Form management |
| | Zod | 3.x | Schema validation |
| | React Router | 6.x | Client-side routing |
| **Backend** | Supabase | Latest | Backend-as-a-Service |
| | PostgreSQL | Latest | Primary database |
| | Deno | Latest | Edge function runtime |
| **External** | MetaMap | Latest | KYC verification |

---

## Database Schema

### Tables Overview

#### `kyc_verifications`
Primary table storing all KYC verification records across all 5 service types.

```sql
TABLE kyc_verifications (
  -- Identity
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id            TEXT,              -- Browser session for anonymous access
  verification_id       TEXT,              -- MetaMap verification reference
  identity_id           TEXT,              -- MetaMap identity reference
  flow_id               TEXT,              -- MetaMap flow ID used
  
  -- Service Classification
  service_type          ENUM('esim_purchase', 'sim_swap', 'new_registration', 
                             'kyc_compliance', 'new_physical_sim', 'smega_registration'),
  document_type         ENUM('omang', 'passport'),
  status                ENUM('pending', 'verified', 'rejected', 'expired'),
  
  -- Personal Information
  full_name             TEXT,
  first_name            TEXT,
  surname               TEXT,
  sex                   TEXT,
  date_of_birth         DATE,
  email                 TEXT,
  msisdn                TEXT,              -- Primary phone number
  add_phone_number_1-10 TEXT,              -- Additional phone numbers
  
  -- Address Information
  physical_address      TEXT,
  postal_address        TEXT,
  plot_number           TEXT,
  ward                  TEXT,
  village               TEXT,
  city                  TEXT,
  country               TEXT,
  country_abbreviation  TEXT,
  
  -- Next of Kin
  next_of_kin_name      TEXT,
  next_of_kin_phone     TEXT,
  next_of_kin_relation  TEXT,
  
  -- Document Details
  document_number       TEXT,
  date_of_issue         DATE,
  expiry_date           DATE,
  document_photos       JSONB DEFAULT '[]',  -- Stored photo references
  
  -- Verification Data
  extracted_data        JSONB DEFAULT '{}',  -- OCR extracted fields
  metadata              JSONB DEFAULT '{}',  -- Flow metadata
  failure_reason        TEXT,
  verified_at           TIMESTAMP,
  retry_count           INTEGER DEFAULT 0,
  
  -- Audit
  ip_address            TEXT,
  user_agent            TEXT,
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  deleted_at            TIMESTAMP              -- Soft delete
)
```

#### `payment_transactions`
Records all payment transactions for paid services.

```sql
TABLE payment_transactions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_verification_id   UUID REFERENCES kyc_verifications(id),
  
  -- Transaction Details
  amount                NUMERIC NOT NULL,
  currency              VARCHAR DEFAULT 'BWP',
  payment_method        VARCHAR NOT NULL,     -- 'mobile_money', 'card', 'voucher'
  payment_type          VARCHAR,              -- 'plan', 'swap_fee'
  status                VARCHAR DEFAULT 'pending',
  
  -- Service Context
  service_type          VARCHAR,
  plan_name             VARCHAR,
  msisdn                VARCHAR,
  voucher_code          VARCHAR,
  
  -- Audit
  customer_care_user_id VARCHAR,
  ip_address            VARCHAR,
  user_agent            TEXT,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMP DEFAULT now(),
  updated_at            TIMESTAMP DEFAULT now(),
  completed_at          TIMESTAMP
)
```

#### `profiles`
User profile information for authenticated admin users.

```sql
TABLE profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,       -- References auth.users
  email       TEXT,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMP DEFAULT now(),
  updated_at  TIMESTAMP DEFAULT now()
)
```

#### `user_roles`
Role-based access control for admin functionality.

```sql
TABLE user_roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL,       -- References auth.users
  role        ENUM('admin', 'user'),
  created_at  TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, role)
)
```

### Row-Level Security Policies

| Table | Policy | Description |
|-------|--------|-------------|
| `kyc_verifications` | Deny all direct access | Access only via Edge Functions using service role |
| `payment_transactions` | Admin read/write, public insert | Admins see all; anyone can create transactions |
| `profiles` | Own profile only | Users can only read/update their own profile |
| `user_roles` | Admin only | Only admins can view/manage roles |

---

## Edge Functions

### Function Reference

| Function | Auth | Purpose | Key Operations |
|----------|------|---------|----------------|
| `kyc-create-record` | No (session) | Create new KYC record | INSERT into kyc_verifications |
| `kyc-update-record` | No (session) | Update record status/data | UPDATE kyc_verifications |
| `kyc-get-record` | No (session) | Fetch record for polling | SELECT from kyc_verifications |
| `kyc-get-documents` | No (session) | Get signed URLs for photos | Generate storage signed URLs |
| `metamap-config` | No | Get MetaMap client config | Return client ID and flow IDs |
| `metamap-webhook` | No (secret) | Handle MetaMap callbacks | Update status, download photos |
| `admin-kyc-list` | Yes (admin) | List all KYC records | SELECT with filters and pagination |
| `admin-kyc-stats` | Yes (admin) | Dashboard statistics | Aggregate queries |
| `admin-users` | Yes (admin) | User management | SELECT from profiles/user_roles |
| `admin-payment-transactions` | Yes (admin) | Payment listing | SELECT from payment_transactions |

### Data Flow: KYC Verification

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                          KYC VERIFICATION DATA FLOW                                       │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  1. RECORD CREATION                                                                       │
│  ┌────────────┐        ┌──────────────────┐        ┌─────────────────┐                   │
│  │  Frontend  │──────▶│ kyc-create-record │──────▶│  kyc_verifi-    │                   │
│  │  (Form)    │  POST │  Edge Function    │ INSERT │  cations (DB)   │                   │
│  └────────────┘       └──────────────────┘        └─────────────────┘                   │
│        │                                                   │                              │
│        │  Returns: { recordId, sessionId }                 │ status: 'pending'           │
│        ▼                                                   │                              │
│  2. METAMAP SDK LAUNCH                                     │                              │
│  ┌────────────┐        ┌──────────────────┐               │                              │
│  │  useMetaMap│──────▶│  MetaMap SDK     │               │                              │
│  │   Hook     │ Init   │  (Browser)       │               │                              │
│  └────────────┘       └────────┬─────────┘               │                              │
│        │                       │                          │                              │
│        │                       │ User scans ID + Selfie   │                              │
│        │                       ▼                          │                              │
│  3. METAMAP PROCESSING        ┌──────────────────┐       │                              │
│                               │  MetaMap Cloud   │       │                              │
│                               │  (Verification)  │       │                              │
│                               └────────┬─────────┘       │                              │
│                                        │                  │                              │
│                                        │ Webhook POST     │                              │
│                                        ▼                  │                              │
│  4. WEBHOOK PROCESSING        ┌──────────────────┐       │                              │
│                               │ metamap-webhook  │───────┘                              │
│                               │ Edge Function    │  UPDATE                               │
│                               └────────┬─────────┘                                       │
│                                        │                                                  │
│                                        │ Downloads photos                                │
│                                        ▼                                                  │
│  5. PHOTO STORAGE             ┌──────────────────┐                                       │
│                               │ kyc-documents    │                                       │
│                               │ Storage Bucket   │                                       │
│                               └──────────────────┘                                       │
│                                                                                           │
│  6. FRONTEND POLLING                                                                      │
│  ┌────────────┐        ┌──────────────────┐        ┌─────────────────┐                   │
│  │  Frontend  │◀──────│  kyc-get-record  │◀──────│  kyc_verifi-    │                   │
│  │  (Waiting) │  GET   │  Edge Function   │ SELECT │  cations (DB)   │                   │
│  └────────────┘       └──────────────────┘        └─────────────────┘                   │
│        │                                                                                  │
│        │  When status = 'verified' or 'rejected'                                         │
│        ▼                                                                                  │
│  7. FLOW COMPLETION                                                                       │
│  ┌────────────────────────────────────────────────────────────────────────────────────┐  │
│  │  • Show QR code for eSIM activation                                                 │  │
│  │  • Show shop selection for physical SIM                                             │  │
│  │  • Show thank you page for KYC compliance                                           │  │
│  └────────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## MetaMap KYC Integration

### Configuration

Two separate MetaMap flows based on document type:

| Document Type | Flow ID Secret | Description |
|---------------|----------------|-------------|
| Omang (National ID) | `METAMAP_CITIZEN_FLOW_ID` | Botswana citizen verification |
| Passport | `METAMAP_NON_CITIZEN_FLOW_ID` | Non-citizen verification |

### SDK Integration Details

**Key Implementation Points** (`src/hooks/useMetaMap.ts`):

1. **No Persist Mode**: SDK uses `nopersist` attribute to prevent session resumption
2. **Safari Compatibility**: Uses nested `requestAnimationFrame` calls for popup trigger
3. **Metadata Passing**: Service type, record ID, session ID passed to MetaMap
4. **Brand Styling**: Verification button styled with BTC green (#22c55e)

```typescript
// Metadata passed to MetaMap
const metadataObj = {
  documentType,       // 'omang' or 'passport'
  recordId,           // UUID of KYC record
  sessionId,          // Browser session ID
  serviceType,        // 'esim_purchase', 'sim_swap', etc.
  msisdn,            // Phone number being registered/swapped
  ...registrationData // All form fields
};
```

### Webhook Processing

The `metamap-webhook` edge function handles:

1. **Status Mapping**:
   - `verified` → `verified`
   - `reviewNeeded` → `rejected` (auto-mapped)
   - `rejected` → `rejected`

2. **Data Extraction**:
   - Full name, DOB, document number
   - Document photos (front, back)
   - Selfie photo
   - All OCR-extracted fields

3. **Photo Download**:
   - Downloads from MetaMap CDN
   - Stores in `kyc-documents` bucket
   - Updates `document_photos` array in record

---

## Admin Portal

### Access Control

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN PORTAL ACCESS FLOW                                        │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  ┌────────────┐        ┌──────────────────┐        ┌─────────────────┐                      │
│  │ /admin     │──────▶│ AdminLogin.tsx   │──────▶│ Supabase Auth   │                      │
│  │ (Route)    │        │ (Login Form)     │ signIn │ (JWT Session)   │                      │
│  └────────────┘        └──────────────────┘        └────────┬────────┘                      │
│                                                             │                                │
│                                                             ▼                                │
│                        ┌──────────────────┐        ┌─────────────────┐                      │
│                        │ useAuth Hook     │◀──────│  user_roles     │                      │
│                        │ (isAdmin check)  │ SELECT │  (DB Table)     │                      │
│                        └────────┬─────────┘        └─────────────────┘                      │
│                                 │                                                            │
│                                 │ isAdmin = true                                             │
│                                 ▼                                                            │
│  ┌────────────────────────────────────────────────────────────────────────────────────────┐ │
│  │                           ADMIN DASHBOARD                                               │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Statistics Cards                                                                │   │ │
│  │  │  • Total Verifications    • Verified Count    • Pending Count    • Rejected     │   │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐   │ │
│  │  │  Service Type Filters                                                            │   │ │
│  │  │  [All] [Buy eSIM] [SIM Swap] [KYC Compliance] [New Physical] [SMEGA]            │   │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                                         │ │
│  │  ┌─────────────────────────────────────────────────────────────────────────────────┐   │ │
│  │  │  KYC Records Table                                                               │   │ │
│  │  │  ID | Name | MSISDN | Service Type | Status | Date | Actions                    │   │ │
│  │  │  ────────────────────────────────────────────────────────────────────────────── │   │ │
│  │  │  ... | ... | ... | Buy eSIM | Verified | 2024-01-15 | [View Data] [View Docs]   │   │ │
│  │  │  ... | ... | ... | KYC Compliance | Pending | 2024-01-15 | [View Data]          │   │ │
│  │  └─────────────────────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Admin Features

| Feature | Page | Description |
|---------|------|-------------|
| Dashboard | `AdminDashboard.tsx` | KYC records, stats, document viewer |
| User Management | `AdminUsers.tsx` | View/manage admin users |
| Payment Transactions | `AdminPayments.tsx` | View all payment records |

### Document Viewer

Admins can view customer identity documents:
- **Document Front**: ID card or passport front
- **Document Back**: ID card back (if applicable)
- **Selfie Photo**: Face verification image

Documents are served via temporary signed URLs (valid for 1 hour).

---

## Security & Authentication

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                              SECURITY ARCHITECTURE                                           │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                              │
│  LAYER 1: ROW-LEVEL SECURITY                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │  • All tables have RLS enabled                                                       │    │
│  │  • kyc_verifications: Deny all direct access (Edge Functions only)                  │    │
│  │  • profiles: Users can only access own data                                         │    │
│  │  • user_roles: Admin-only access                                                    │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                              │
│  LAYER 2: EDGE FUNCTION AUTHORIZATION                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │  • Admin functions validate JWT tokens                                               │    │
│  │  • Check user_roles table via has_role() function                                   │    │
│  │  • Service role key used for database operations                                    │    │
│  │  • Never exposed to frontend                                                        │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                              │
│  LAYER 3: SESSION-BASED KYC ACCESS                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │  • Anonymous users get session_id on record creation                                │    │
│  │  • Session ID required for updates/reads                                            │    │
│  │  • No user account required for customer flows                                      │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                              │
│  LAYER 4: WEBHOOK SECURITY                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │  • METAMAP_WEBHOOK_SECRET for signature verification                                │    │
│  │  • Edge functions configured with verify_jwt = false                                │    │
│  │  • CORS headers properly configured                                                 │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                              │
│  LAYER 5: STORAGE SECURITY                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐    │
│  │  • kyc-documents bucket is PRIVATE                                                  │    │
│  │  • Access via signed URLs only (1-hour expiry)                                      │    │
│  │  • Only admins can request document URLs                                            │    │
│  └─────────────────────────────────────────────────────────────────────────────────────┘    │
│                                                                                              │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Authentication Flow (Admin)

1. User visits `/admin`
2. Redirected to `AdminLogin.tsx`
3. Enter email/password
4. Supabase Auth validates credentials
5. `useAuth` hook checks `user_roles` table
6. If admin role found, `isAdmin = true`
7. Access granted to admin dashboard

### Super Admin Auto-Assignment

Database trigger `handle_super_admin_role()` automatically assigns admin role to designated email addresses on user creation.

---

## Development Guidelines

### Project Structure

```
src/
├── components/
│   ├── esim/                    # eSIM purchase flow components
│   │   ├── ESIMPurchaseFlow.tsx # Main orchestrator
│   │   ├── TermsConsent.tsx
│   │   ├── PaymentStep.tsx
│   │   ├── NumberSelection.tsx
│   │   ├── RegistrationForm.tsx
│   │   ├── KYCVerification.tsx
│   │   ├── KYCConfirmation.tsx
│   │   └── ESIMActivation.tsx
│   │
│   ├── simswap/                 # SIM swap flow components
│   │   ├── SIMSwapFlow.tsx      # Main orchestrator
│   │   ├── SIMSwapNumberEntry.tsx
│   │   ├── SIMSwapOTP.tsx
│   │   ├── SIMSwapPayment.tsx
│   │   ├── SIMSwapKYC.tsx
│   │   ├── SIMSwapTypeSelection.tsx
│   │   ├── SIMSwapESIM.tsx
│   │   └── SIMSwapShopSelection.tsx
│   │
│   ├── kyc/                     # KYC compliance flow components
│   │   ├── KYCComplianceFlow.tsx
│   │   ├── KYCComplianceTerms.tsx
│   │   ├── KYCComplianceNumberEntry.tsx
│   │   ├── KYCComplianceOTP.tsx
│   │   ├── KYCComplianceRegistration.tsx
│   │   ├── KYCComplianceVerification.tsx
│   │   └── KYCComplianceComplete.tsx
│   │
│   ├── landing/                 # Landing page components
│   ├── layout/                  # Header, navigation
│   └── ui/                      # shadcn/ui components
│
├── hooks/
│   ├── useAuth.tsx              # Authentication context
│   ├── useMetaMap.ts            # MetaMap SDK integration
│   └── use-mobile.tsx           # Mobile detection
│
├── integrations/
│   └── supabase/
│       ├── client.ts            # Auto-generated client
│       └── types.ts             # Auto-generated types
│
├── pages/
│   ├── Index.tsx                # Landing page + flow router
│   ├── AdminLogin.tsx           # Admin authentication
│   ├── AdminDashboard.tsx       # KYC management
│   ├── AdminUsers.tsx           # User management
│   └── AdminPayments.tsx        # Payment transactions
│
└── lib/
    └── utils.ts                 # Utility functions

supabase/
├── config.toml                  # Supabase configuration
└── functions/
    ├── admin-kyc-list/
    ├── admin-kyc-stats/
    ├── admin-payment-transactions/
    ├── admin-users/
    ├── kyc-create-record/
    ├── kyc-get-documents/
    ├── kyc-get-record/
    ├── kyc-update-record/
    ├── metamap-config/
    └── metamap-webhook/
```

### Environment Variables

#### Frontend (.env)
```
VITE_SUPABASE_URL              # Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY  # Supabase anon key
VITE_SUPABASE_PROJECT_ID       # Project identifier
```

#### Edge Functions (Secrets)
```
SUPABASE_URL                   # Supabase project URL
SUPABASE_ANON_KEY              # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY      # Service role for admin operations
METAMAP_CLIENT_ID              # MetaMap API client ID
METAMAP_CLIENT_SECRET          # MetaMap API secret
METAMAP_CITIZEN_FLOW_ID        # MetaMap flow for Omang verification
METAMAP_NON_CITIZEN_FLOW_ID    # MetaMap flow for Passport verification
METAMAP_WEBHOOK_SECRET         # Webhook signature verification
```

### Demo Mode

The application includes relaxed validation for demo purposes:
- **OTP Verification**: Any 4-digit code is accepted
- **Phone Numbers**: Any numeric input accepted (no prefix/length validation)
- **Form Fields**: All fields are optional with "Next" buttons enabled by default

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Type checking
npm run typecheck
```

---

## Future Enhancements

- [ ] Implement proper MetaMap webhook signature verification
- [ ] Add unit tests for critical flows (Vitest)
- [ ] Implement status filtering on admin dashboard
- [ ] Add pagination for large datasets
- [ ] Implement audit logging for admin actions
- [ ] Add real OTP verification via SMS gateway
- [ ] Implement payment gateway integration (mobile money, card)
- [ ] Add multi-language support (English, Setswana)
- [ ] Implement customer support chat
- [ ] Add email notifications for KYC status changes
