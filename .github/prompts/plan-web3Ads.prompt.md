# Web3Ads Platform - Comprehensive Plan

## Overview

Web3Ads is a decentralized advertising platform where users can advertise, publish ads, or earn by viewing ads. The platform uses zkProofs for privacy-preserving ad tracking and integrates with x402 for AI agent payments.

**Target Hackathon:** ETHMumbai 2026
**Prize Pool Target:** Multiple tracks - Privacy ($500), DeFi ($500), AI ($500), HeyElsa x402 ($1,000), Base AI×Onchain ($350)

---

## Implementation Progress

### ✅ Completed

| Component | Status | Notes |
|-----------|--------|-------|
| **Server API** | ✅ Done | Express + Prisma 7 + Supabase PostgreSQL |
| **Viewer Registration** | ✅ Done | `/api/viewers/register`, `/api/viewers/profile`, `/api/viewers/stats` |
| **Client Web App** | ✅ Done | React + Vite + wagmi + RainbowKit |
| **Viewer Page** | ✅ Done | Semaphore identity generation, wallet linking |
| **Chrome Extension** | ✅ Done | Identity storage, popup UI, switch wallet |
| **@web3ads/react SDK** | ✅ Done | Ad component, extension detection |

### 🔄 In Progress / Remaining

| Component | Status | Notes |
|-----------|--------|-------|
| **Smart Contracts** | ⏳ Pending | Web3AdsCore, RewardPool on Base Sepolia |
| **zkProof Verification** | ⏳ Pending | Backend verification of Semaphore proofs |
| **Impression Tracking** | ⏳ Pending | With fraud prevention |
| **Publisher Dashboard** | ⏳ Pending | Earnings, embed code |
| **Advertiser Dashboard** | ⏳ Pending | Campaign creation, analytics |
| **Gasless Transactions** | ⏳ Pending | ERC-4337 paymaster |
| **x402 MCP Integration** | ⏳ Pending | HeyElsa agent payments |

### 🏗️ Key Architecture Decisions Made

1. **Semaphore in Client, Not Extension**: Service workers can't use WASM, so identity generation happens in client app
2. **CSP-Safe Extension Detection**: Uses `data-web3ads-extension` attribute instead of inline script injection
3. **Wallet = Earnings Bucket**: Each wallet has separate earnings, no transfer between wallets
4. **Switch Wallet Flow**: Clears identity entirely, creates fresh one for new wallet

---

## Partner Technology Integration Strategy

| Partner            | Integration                                        | Priority |
| ------------------ | -------------------------------------------------- | -------- |
| **HeyElsa (x402)** | MCP protocol for agent payments via ad balance     | HIGH     |
| **Base**           | L2 for smart contracts, gasless txs via paymasters | HIGH     |
| **Semaphore**      | zkProof identity for anonymous ad tracking         | HIGH     |
| **ENS**            | User-friendly names for publishers/advertisers     | MEDIUM   |
| **BitGo**          | Custody for platform treasury (optional)           | LOW      |
| **Fileverse**      | Decentralized ad media storage (optional)          | LOW      |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        WEB3ADS PLATFORM                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │ Advertisers │  │ Publishers  │  │   Viewers   │             │
│  │  (Web App)  │  │(NPM Package)│  │ (Extension) │             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘             │
│         │                │                │                     │
│         ▼                ▼                ▼                     │
│  ┌──────────────────────────────────────────────┐              │
│  │              BACKEND API SERVER              │              │
│  │  • Ad serving • Tracking • Monetization      │              │
│  └──────────────────────────────────────────────┘              │
│         │                                                       │
│         ▼                                                       │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │ Smart Contracts│  │   Semaphore   │  │    x402 MCP   │       │
│  │   (Base L2)   │  │   (zkProofs)  │  │  (HeyElsa)    │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Monetization Model (CPM-Based)

### Pricing Structure

- **Advertisers pay:** $2-10 CPM (Cost Per Mille/1000 impressions) based on ad type
- **Revenue split:**
  - Platform: 30%
  - Publisher: 50%
  - Viewer: 20%

### Ad Types & Pricing

| Ad Type                | CPM Rate | Publisher Share | Viewer Share |
| ---------------------- | -------- | --------------- | ------------ |
| Footer Banner (728x90) | $2       | $1.00           | $0.40        |
| Square (300x300)       | $3       | $1.50           | $0.60        |
| Sidebar (300x600)      | $4       | $2.00           | $0.80        |
| Interstitial           | $8       | $4.00           | $1.60        |

### Payout Thresholds

- **Publishers:** Minimum 0.01 ETH (~$25) to withdraw
- **Viewers:** Minimum 0.005 ETH (~$12.50) to withdraw
- **Alternative:** Use balance for gasless transactions (no threshold)

---

## Feasibility Assessment

### ✅ FULLY DOABLE

1. **Platform Web App** - Standard React/TypeScript development
2. **Advertiser Dashboard** - CRUD for campaigns, payment flow
3. **Publisher NPM Package** - React component with API calls
4. **Chrome Extension** - Boilerplate already exists
5. **Base L2 Smart Contracts** - Well-documented, lower gas costs
6. **x402/MCP Integration** - HeyElsa provides SDK and docs
7. **Gasless Transactions** - Base supports ERC-4337 paymasters

### ⚠️ COMPLEX BUT DOABLE

1. **Semaphore zkProof Integration**
   - Pros: Well-documented, audited, Ethereum Foundation backed
   - Complexity: Need to handle identity generation, group management
   - Solution: Use Semaphore V4's JavaScript SDK

2. **Fake View Prevention**
   - Challenge: Bot detection without compromising privacy
   - Solution: Multi-layered approach (see Anti-Fraud section)

### ❌ LIMITATIONS/CHALLENGES

1. **Full anonymity vs. fraud prevention** - Tradeoff exists
2. **Cross-browser extension support** - Start with Chrome only
3. **Real-time sync between extension and component** - Need WebSocket/polling

---

## Phase 1: Foundation (MVP)

### 1.1 Smart Contracts on Base

**Files to create:**

- `contracts/Web3AdsRegistry.sol` - Main registry for advertisers, publishers
- `contracts/AdCampaign.sol` - Campaign management and payments
- `contracts/RewardPool.sol` - Viewer/publisher reward distribution
- `contracts/SemaphoreVerifier.sol` - zkProof verification integration

**Key functions:**

```solidity
// Advertiser deposits funds for campaign
function createCampaign(AdType, budgetUSDC, mediaIPFS) payable

// Record verified impression (called by backend with zkProof)
function recordImpression(campaignId, semaphoreProof)

// Publisher/Viewer claims rewards
function claimRewards(address recipient, semaphoreProof)
```

### 1.2 Backend API Server

**Enhance `server/src/index.ts` with:**

- `/api/ads/serve` - Returns ad based on type, category
- `/api/ads/impression` - Records impression with zkProof
- `/api/campaigns/*` - CRUD for advertiser campaigns
- `/api/rewards/balance` - Check accumulated rewards
- `/api/rewards/claim` - Initiate withdrawal

**Database schema (PostgreSQL via Supabase):**

- `advertisers` - wallet, campaigns
- `campaigns` - id, advertiser, type, budget, spent, mediaUrl, active
- `publishers` - wallet, totalViews, pendingRewards
- `impressions` - campaignId, semaphoreNullifier, timestamp, publisherWallet

### 1.3 Client Web App

**Pages to add to `client/src/`:**

- `/` - Landing page explaining the platform
- `/advertiser` - Create/manage campaigns, deposit funds
- `/publisher` - Get embed code, view earnings
- `/viewer` - Connect extension, view earnings
- `/dashboard` - Unified dashboard for all roles

---

## Phase 2: Publisher NPM Package

### Package: `@web3ads/react`

**Component API:**

```tsx
import { Web3Ad } from "@web3ads/react";

<Web3Ad
  publisherWallet="0x..."
  type="banner" // 'banner' | 'square' | 'sidebar'
  category="defi" // optional targeting
  onImpression={(adId) => {}} // callback
/>;
```

**Internal flow:**

1. Component mounts → calls `/api/ads/serve`
2. Renders ad with viewability tracking (IntersectionObserver)
3. When 50%+ visible for 1s → calls `/api/ads/impression`
4. If extension detected → coordinates zkProof generation

---

## Phase 3: Browser Extension (Viewer Earnings)

### Architecture Decision (Updated)

**Semaphore identity generation happens in the CLIENT APP, not the extension.**

**Rationale:**
- Service workers cannot use `URL.createObjectURL()` which `@semaphore-protocol/core` requires for WASM
- Moving Semaphore to client app (which has full DOM access) avoids this limitation
- Extension becomes a lightweight identity storage and proof relay

### Extension Features

**Current implementation in `extension/chrome-extension/src/`:**

1. **Identity Storage (no generation):**
   - Receives Semaphore identity from client via postMessage
   - Stores commitment + secret in chrome.storage.local
   - Handles CLEAR_IDENTITY for wallet switching

2. **Content script (CSP-safe):**
   - Sets `data-web3ads-extension="true"` attribute on document element
   - No inline script injection (avoids CSP violations)
   - Relays messages between page and background via postMessage

3. **Popup UI:**
   - Show linked wallet address with SWITCH button
   - Display accumulated earnings and ads viewed count
   - SWITCH button clears identity and opens client for re-linking

### Wallet Management

**Key Design Decision: Each wallet has its own separate earnings.**

- **No earnings transfer** between wallets
- **Switch wallet** = clear identity in extension + clear localStorage + connect new wallet
- If user returns to old wallet on new browser, they get their old earnings (via server)
- Semaphore commitment is tied to browser (localStorage), wallet is tied to earnings (server)

| Scenario | Behavior |
|----------|----------|
| Same browser + same wallet | ✅ Idempotent - returns existing viewer |
| Same browser + different wallet | ❌ Must use SWITCH to clear identity first |
| Different browser + same wallet | ✅ Server updates commitment for new browser |
| SWITCH wallet | Clears identity, creates fresh one for new wallet |

### Anti-Fraud Measures

1. **Semaphore nullifier** - Each identity can only signal once per ad
2. **Viewability check** - IntersectionObserver confirms visibility
3. **Time threshold** - Minimum 1 second in viewport
4. **Rate limiting** - Max impressions per identity per hour
5. **Cross-validation** - Backend verifies zkProof matches on-chain group

---

## Phase 4: Gasless Transactions

### Implementation on Base

**Use Coinbase Paymaster or custom paymaster:**

1. User initiates transaction (e.g., claim rewards)
2. Check user's ad earning balance
3. If sufficient, platform sponsors gas via paymaster
4. Deduct equivalent from user's ad balance

**Smart contract addition:**

```solidity
function sponsoredClaim(
    UserOperation calldata userOp,
    uint256 adBalanceToSpend
) external
```

---

## Phase 5: MCP Protocol for x402

### Integration with HeyElsa

**Create MCP server: `packages/mcp-server/`**

**Tools exposed:**

```typescript
// Check user's ad monetization balance
tool: "web3ads_check_balance"
params: { zkProofCommitment: string }
returns: { balanceUSDC: number, canPayFor: string[] }

// Use ad balance to pay for x402 call
tool: "web3ads_pay_x402"
params: { commitment: string, amount: number, recipient: string }
returns: { txHash: string, newBalance: number }
```

**Use case flow:**

1. AI agent checks if user has web3ads balance
2. Agent requests x402 API call (e.g., swap quote)
3. web3ads MCP deducts from user's ad earnings
4. Agent receives x402 response

---

## Implementation Steps (Priority Ordered)

> **📌 COMMIT DISCIPLINE**: Make atomic commits after each numbered step or logical group. Don't bundle unrelated changes. Use conventional commit prefixes: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

---

### PHASE A: Core Monetization Flow (MVP)

**Goal:** Advertisers can create campaigns → Publishers can show ads and earn → Viewers with extension can earn

#### A1: Smart Contracts & Infrastructure

1. **Setup contracts project** — Foundry with Base Sepolia deployment
   - `Web3AdsCore.sol` — Registry, campaign management, reward pools
   - `SemaphoreVerifier.sol` — Integration with Semaphore for zkProof verification
     > 📌 `git commit -m "feat(contracts): add Web3AdsCore smart contracts with Foundry"`

2. **Database schema** — PostgreSQL with Prisma (Supabase)
   - Tables: advertisers, campaigns, publishers, impressions, rewards
     > 📌 `git commit -m "feat(server): add Prisma schema for web3ads database"`

3. **Wallet integration in client** — wagmi + viem + RainbowKit
   > 📌 `git commit -m "feat(client): add wallet connection with wagmi and RainbowKit"`

#### A2: Advertiser Flow

4. **Advertiser registration** — Connect wallet, create advertiser profile
5. **Campaign creation** — Select ad type, upload media (Supabase Storage), set budget
6. **USDC deposit** — Approve + deposit to smart contract

   > 📌 `git commit -m "feat(client): add advertiser dashboard and campaign creation"`

7. **Campaign dashboard** — View spend, impressions, remaining budget
   > 📌 `git commit -m "feat(client): add campaign analytics dashboard"`

#### A3: Publisher Flow

8. **Publisher registration** — Connect wallet, create publisher profile

   > 📌 `git commit -m "feat(client): add publisher registration flow"`

9. **Create `@web3ads/react` package** — Ad component for embedding

   > 📌 `git commit -m "feat(packages): create @web3ads/react publisher SDK"`

10. **Ad serving API** — `/api/ads/serve` returns ad based on type/category

    > 📌 `git commit -m "feat(server): add ad serving API endpoint"`

11. **Impression tracking** —
    - IntersectionObserver for viewability (50% visible, 1s minimum)
    - Browser fingerprinting for basic fraud prevention (without extension)
    - Rate limiting per publisher
      > 📌 `git commit -m "feat(server): add impression tracking with fraud prevention"`

12. **Publisher dashboard** — View earnings, get embed code, withdrawal
    > 📌 `git commit -m "feat(client): add publisher earnings dashboard"`

#### A4: Viewer Flow (Extension) ✅ IMPLEMENTED

> **Architecture Note:** Semaphore identity is generated in the CLIENT APP (not extension) due to service worker WASM limitations.

13. ✅ **Semaphore identity setup** — Generate identity in CLIENT app, store in localStorage, send to extension

    > Implemented: `client/src/pages/Viewer.tsx` uses `@semaphore-protocol/core`

14. ✅ **Extension content script** — Detect web3ads components, set data attribute (CSP-safe)

15. ✅ **Identity storage** — Extension stores commitment + secret from client via postMessage

16. ✅ **Wallet switching** — SWITCH button clears identity, opens client for new wallet link

    > Implemented: Each wallet has own earnings, no transfer between wallets

17. **Backend verification** — Verify zkProof, credit viewer earnings

    > 📌 `git commit -m "feat(server): add zkProof verification for viewer earnings"`

18. **Viewer dashboard in extension** — Show accumulated earnings
    > 📌 `git commit -m "feat(extension): add viewer earnings popup UI"`

#### A5: Reward Distribution

19. **Revenue split logic** —
    - With extension proof: Publisher 50%, Viewer 20%, Platform 30%
    - Without extension: Publisher 50%, Platform 50%
      > 📌 `git commit -m "feat(server): implement revenue split logic"`

20. **Claim function** — Publishers/Viewers can claim accumulated USDC
21. **Minimum threshold** — $10 minimum for withdrawal
    > 📌 `git commit -m "feat(contracts): add reward claim functions with threshold"`

---

### PHASE B: Spending Features (Post-MVP)

**Goal:** Let users spend their ad earnings without withdrawal

#### B1: Gasless Transactions

22. **Paymaster contract** — Sponsor gas using user's ad balance
23. **ERC-4337 integration** — UserOperation support

    > 📌 `git commit -m "feat(contracts): add paymaster for gasless transactions"`

24. **Frontend integration** — "Pay with ad balance" option
    > 📌 `git commit -m "feat(client): add gasless transaction UI"`

#### B2: x402 MCP Integration

25. **Create MCP server** — `packages/mcp-server/`
26. **Balance check tool** — `web3ads_check_balance`
27. **Payment tool** — `web3ads_pay_x402`

    > 📌 `git commit -m "feat(packages): create MCP server for x402 integration"`

28. **HeyElsa integration** — Connect for agent payments
    > 📌 `git commit -m "feat(packages): add HeyElsa x402 payment flow"`

---

### Implementation Order (Detailed)

```
Week 1: Foundation
├── Day 1-2: Smart contracts (Web3AdsCore, basic functions)
├── Day 3: Database schema + Prisma setup
├── Day 4-5: API scaffolding + wallet integration
└── Day 6-7: Basic client pages (landing, connect wallet)

Week 2: Advertiser + Publisher
├── Day 1-2: Advertiser dashboard + campaign creation
├── Day 3: USDC payment flow
├── Day 4-5: @web3ads/react package creation
├── Day 6: Ad serving API + component
└── Day 7: Publisher dashboard

Week 3: Tracking + Extension
├── Day 1-2: Impression tracking with fraud prevention
├── Day 3-4: Semaphore integration in extension
├── Day 5-6: zkProof generation + verification
└── Day 7: Extension popup UI

Week 4: Polish + Phase B Start
├── Day 1-2: Testing, bug fixes
├── Day 3-4: Gasless transactions
├── Day 5-6: MCP server for x402
└── Day 7: Final integration testing
```

---

## Technical Stack Summary

| Layer        | Technology                    | Rationale                         |
| ------------ | ----------------------------- | --------------------------------- |
| Frontend     | React 19 + Vite + TypeScript  | Already in codebase               |
| Styling      | TailwindCSS                   | Already configured                |
| Extension    | Chrome Extension MV3          | Boilerplate ready                 |
| Backend      | Express + Prisma + PostgreSQL | Simple, scalable                  |
| Blockchain   | Base (L2)                     | Low gas, hackathon sponsor        |
| Contracts    | Solidity + Foundry            | Faster tests, native fuzzing      |
| Privacy      | Semaphore V4                  | Best zkProof protocol             |
| Payments     | USDC on Base                  | Stable, widely adopted            |
| Agent        | x402/MCP                      | HeyElsa hackathon sponsor         |
| Wallet       | wagmi + viem                  | Modern Web3 stack                 |
| Database     | Supabase (PostgreSQL)         | User's choice, already configured |
| File Storage | Supabase Storage              | Unified with DB, simple SDK       |

---

## Confirmed Decisions

1. **Token economy:** USDC only for MVP
2. **Extension policy:** Recommended but not required
   - With extension: Viewer earns 20%, Publisher earns 50%, Platform earns 30%
   - Without extension: Viewer gets 0%, Publisher earns 50%, Platform earns 50%
   - Publisher still gets paid, fraud prevention still applies
3. **Priority order:**
   - Phase A: Full monetization flow (advertiser → publisher → viewer)
   - Phase B: Spending features (gasless txs, x402 MCP)
4. **File storage:** Supabase Storage for ad media
5. **Publisher approval:** Auto-approve with fraud monitoring

---

## Verification Steps

1. **Smart contracts:** Deploy to Base Sepolia, verify on Basescan
2. **Ad serving:** Create test campaign, verify ad appears
3. **Impressions:** Confirm tracking updates advertiser spend
4. **zkProofs:** Generate proof in extension, verify on-chain
5. **Payouts:** Claim rewards to wallet
6. **Gasless:** Sponsor transaction from ad balance
7. **MCP:** Connect Claude Desktop, check balance via tool

---

## Files to Modify/Create

**New directories:**

- `contracts/` - Solidity smart contracts
- `packages/web3ads-react/` - Publisher NPM package
- `packages/mcp-server/` - x402 MCP integration

**Client modifications:**

- `client/src/pages/` - Dashboard, Advertiser, Publisher, Viewer pages
- `client/src/components/` - Ad components, wallet connection
- `client/src/hooks/` - useContract, useWallet, useSemaphore

**Server modifications:**

- `server/src/routes/` - API route handlers
- `server/src/services/` - Business logic
- `server/src/db/` - Prisma schema and migrations

**Extension modifications:**

- `extension/chrome-extension/src/content/` - Ad detection, proof generation
- `extension/pages/popup/` - Earnings UI
- `extension/packages/storage/` - Semaphore identity storage

---

## Environment Variables Required

### Server (`server/.env`)

```env
DATABASE_URL="..."  # ✅ Already configured
DIRECT_URL="..."    # ✅ Already configured
SUPABASE_URL="https://csipfcbhrfaebzpgnvob.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_KEY="eyJ..."
BASE_SEPOLIA_RPC_URL="https://sepolia.base.org"
DEPLOYER_PRIVATE_KEY="0x..."
JWT_SECRET="your-random-secret-here"
```

### Client (`client/.env`)

```env
VITE_SUPABASE_URL="https://csipfcbhrfaebzpgnvob.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJ..."
VITE_BASE_SEPOLIA_RPC="https://sepolia.base.org"
VITE_API_URL="http://localhost:3000"
```

### Extension (`extension/.env`)

```env
VITE_API_URL="http://localhost:3000"
```
