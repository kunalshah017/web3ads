# Web3Ads Platform - Comprehensive Plan

## Overview

Web3Ads is a decentralized advertising platform where users can advertise, publish ads, or earn by viewing ads. The platform uses zkProofs for privacy-preserving ad tracking and integrates with x402 for AI agent payments.

**Target Hackathon:** ETHMumbai 2026
**Prize Pool Target:** Multiple tracks - Privacy ($500), DeFi ($500), AI ($500), HeyElsa x402 ($1,000), Base AI×Onchain ($350)

---

## Implementation Progress

### ✅ Completed

| Component                  | Status  | Notes                                                                 |
| -------------------------- | ------- | --------------------------------------------------------------------- |
| **Server API**             | ✅ Done | Express + Prisma 7 + Supabase PostgreSQL                              |
| **Viewer Registration**    | ✅ Done | `/api/viewers/register`, `/api/viewers/profile`, `/api/viewers/stats` |
| **Client Web App**         | ✅ Done | React + Vite + wagmi + RainbowKit                                     |
| **Viewer Page**            | ✅ Done | Semaphore identity generation, wallet linking                         |
| **Chrome Extension**       | ✅ Done | Identity storage, popup UI, switch wallet                             |
| **web3ads-react SDK**      | ✅ Done | Published to npm v0.1.0, Ad component, extension detection            |
| **Smart Contracts V1**     | ✅ Done | Web3AdsCore (USDC) deployed to Base Sepolia                           |
| **Smart Contracts V2**     | ✅ Done | Web3AdsCoreV2 (ETH) + Forwarder for gasless                           |
| **Backend Signing**        | ✅ Done | EIP-712 signatures for impressions and withdrawals                    |
| **Viewer Withdrawal**      | ✅ Done | Backend calls contract directly (pays gas)                            |
| **zkProof Verification**   | ✅ Done | Simplified nullifier-based (commitment + secret hash per ad)          |
| **Impression Tracking**    | ✅ Done | Rate limiting, fraud prevention, viewability (IntersectionObserver)   |
| **Publisher Dashboard**    | ✅ Done | Earnings from server, embed code, withdrawal UI                       |
| **Advertiser Dashboard**   | ✅ Done | Campaign creation, server sync, analytics (impressions/spent)         |
| **Info Page**              | ✅ Done | Demo vs Production pricing tables, technical specs                    |
| **Gasless Transactions**   | ✅ Done | Backend pays gas for viewer withdrawals (simplified for hackathon)    |
| **Gasless Payment Page**   | ✅ Done | `/gasless` - Send ETH to any address using ad earnings, $0 gas        |
| **Publisher Gasless**      | ✅ Done | `withdrawPublisherTo()` contract function for publisher gasless       |
| **V2 Contract Deployment** | ✅ Done | Web3AdsCoreV2 + Forwarder deployed & verified on Base Sepolia         |
| **Client V2 Update**       | ✅ Done | Advertiser page uses ETH-based V2 hooks, no USDC approval needed      |
| **x402 MCP Server**        | ✅ Done | `packages/mcp-server/` with balance, payment, earnings tools          |

### 🔄 In Progress / Remaining

| Component                | Status     | Notes                                            |
| ------------------------ | ---------- | ------------------------------------------------ |
| **Publish MCP Package**  | ⏳ Optional| Publish `web3ads-mcp` to npm                     |

### 🏗️ Key Architecture Decisions Made

1. **Semaphore in Client, Not Extension**: Service workers can't use WASM, so identity generation happens in client app
2. **CSP-Safe Extension Detection**: Uses `data-web3ads-extension` attribute instead of inline script injection
3. **Wallet = Earnings Bucket**: Each wallet has separate earnings, no transfer between wallets
4. **Switch Wallet Flow**: Clears identity entirely, creates fresh one for new wallet
5. **Unscoped npm Package**: Published as `web3ads-react` (not `@web3ads/react`) to avoid npm organization requirements
6. **ETH-Based Payments (V2)**: Switched from USDC to native ETH to simplify faucet requirements
7. **Backend-Paid Gas**: For hackathon demo, backend pays gas directly instead of full ERC-4337 paymaster

### 📋 Deployed Addresses (Base Sepolia)

| Contract         | Address                                      | Notes           |
| ---------------- | -------------------------------------------- | --------------- |
| Web3AdsCore V1   | `0x94f31c33b675Ac968dAda3F5E22f6dBC22A7F872` | USDC-based (old)|
| Web3AdsCoreV2    | `0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F` | ETH-based (new) |
| Forwarder        | `0x8Bc2D17889EF9d04AA620e7984D7E7f74305215E` | EIP-2771        |
| Backend Signer   | `0x3B2F1274dA63a64bBd22ba801ce449A313192ee6` |                 |

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

### Revenue Distribution
- **Publisher:** 50%
- **Viewer:** 20%
- **Platform:** 30%

### Demo Pricing (Hackathon - 500x inflated)

Goal: Viewer earns ~$1 after viewing 5 banner ads

| Ad Type      | CPM Rate | Cost/Ad | Publisher (5 ads) | Viewer (5 ads) |
| ------------ | -------- | ------- | ----------------- | -------------- |
| Banner       | $1,000   | $1.00   | $2.50             | **$1.00**      |
| Square       | $1,500   | $1.50   | $3.75             | **$1.50**      |
| Sidebar      | $2,000   | $2.00   | $5.00             | **$2.00**      |
| Interstitial | $4,000   | $4.00   | $10.00            | **$4.00**      |

**ETH Values (at $2000/ETH):**
- Banner CPM: 0.5 ETH
- Square CPM: 0.75 ETH
- Sidebar CPM: 1.0 ETH
- Interstitial CPM: 2.0 ETH

### Production Pricing (Real-world)

| Ad Type      | CPM Rate | Cost/Ad  | Publisher Share | Viewer Share |
| ------------ | -------- | -------- | --------------- | ------------ |
| Banner       | $2       | $0.002   | $1.00/1000      | $0.40/1000   |
| Square       | $3       | $0.003   | $1.50/1000      | $0.60/1000   |
| Sidebar      | $4       | $0.004   | $2.00/1000      | $0.80/1000   |
| Interstitial | $8       | $0.008   | $4.00/1000      | $1.60/1000   |

### Withdrawal Thresholds

| Mode       | Min Withdrawal | Notes                              |
| ---------- | -------------- | ---------------------------------- |
| Demo       | 1 wei (~$0)    | Instant withdrawal for any amount  |
| Production | 0.0001 ETH     | ~$0.20 at $2000/ETH                |

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

### Package: `web3ads-react` (npm)

**Component API:**

```tsx
import { Web3Ad } from "web3ads-react";

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

| Scenario                        | Behavior                                          |
| ------------------------------- | ------------------------------------------------- |
| Same browser + same wallet      | ✅ Idempotent - returns existing viewer           |
| Same browser + different wallet | ❌ Must use SWITCH to clear identity first        |
| Different browser + same wallet | ✅ Server updates commitment for new browser      |
| SWITCH wallet                   | Clears identity, creates fresh one for new wallet |

### Anti-Fraud Measures

1. **Semaphore nullifier** - Each identity can only signal once per ad
2. **Viewability check** - IntersectionObserver confirms visibility
3. **Time threshold** - Minimum 1 second in viewport
4. **Rate limiting** - Max impressions per identity per hour
5. **Cross-validation** - Backend verifies zkProof matches on-chain group

---

## Phase 4: Gasless Transactions

### Implementation (Simplified for Hackathon)

**Approach: Backend pays gas directly for viewer withdrawals**

Instead of full ERC-4337 paymaster (complex), we use a simpler model:

```
Viewer clicks "Withdraw" → Server receives request →
Server calls withdrawViewer() on contract → Server wallet pays gas →
Contract sends ETH to viewer's wallet
```

**Why this works:**
- Gas cost on Base L2: ~$0.01 per transaction
- Backend wallet pre-funded with ETH
- No need for viewer to have any ETH at all

**Contract Support (Web3AdsCoreV2):**
- EIP-2771 trusted forwarder pattern (for future full gasless)
- Backend signature verification for withdrawals
- `_msgSender()` override extracts real user from forwarder calls

**Server Implementation:**
```typescript
// server/src/blockchain/index.ts
export async function withdrawViewerOnChain(params: {
  commitment: `0x${string}`;
  recipient: `0x${string}`;
}): Promise<Hash | null> {
  // 1. Sign message: keccak256(commitment + recipient)
  const signature = await signViewerWithdrawal(params);
  
  // 2. Call contract (backend pays gas)
  const hash = await walletClient.writeContract({
    address: WEB3ADS_CORE_V2_ADDRESS,
    abi: WEB3ADS_CORE_V2_ABI,
    functionName: "withdrawViewer",
    args: [commitment, recipient, signature],
  });
  
  return hash;
}
```

---

## Phase 5: x402 MCP Protocol Integration

### Overview

x402 allows AI agents to pay for API calls using crypto. We integrate this so users can spend their Web3Ads earnings through AI agents.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  AI Agent (HeyElsa or any x402-compatible agent)           │
│    ↓                                                        │
│  "Pay for this API call using user's Web3Ads balance"      │
│    ↓                                                        │
│  Web3Ads MCP Server                                         │
│    ├── web3ads_check_balance                               │
│    ├── web3ads_make_payment                                │
│    └── web3ads_get_earnings                                │
│    ↓                                                        │
│  Backend withdraws from contract → Sends to recipient      │
└─────────────────────────────────────────────────────────────┘
```

### MCP Server Tools

Create: `packages/mcp-server/src/index.ts`

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({
  name: "web3ads",
  version: "1.0.0",
});

// Tool 1: Check balance
server.tool(
  "web3ads_check_balance",
  "Check user's Web3Ads earnings balance",
  {
    walletAddress: { type: "string", description: "User's wallet address" },
  },
  async ({ walletAddress }) => {
    const response = await fetch(`${API_URL}/api/rewards/balance?walletAddress=${walletAddress}`);
    const data = await response.json();
    return {
      balanceETH: data.total.pending,
      balanceUSD: data.total.pending * 2000, // Approximate
      canWithdraw: data.canWithdraw,
    };
  }
);

// Tool 2: Make payment using ad earnings
server.tool(
  "web3ads_make_payment",
  "Pay for x402 API call using Web3Ads balance",
  {
    walletAddress: { type: "string" },
    amountETH: { type: "number" },
    recipientAddress: { type: "string" },
  },
  async ({ walletAddress, amountETH, recipientAddress }) => {
    const response = await fetch(`${API_URL}/api/rewards/withdraw`, {
      method: "POST",
      body: JSON.stringify({
        walletAddress,
        amount: amountETH,
        payoutType: "viewer",
        recipient: recipientAddress, // x402 payment recipient
      }),
    });
    return await response.json();
  }
);

// Tool 3: Get earnings breakdown
server.tool(
  "web3ads_get_earnings",
  "Get detailed earnings breakdown for user",
  {
    walletAddress: { type: "string" },
  },
  async ({ walletAddress }) => {
    const response = await fetch(`${API_URL}/api/rewards/balance?walletAddress=${walletAddress}`);
    return await response.json();
  }
);
```

### Use Case Flow

1. User views ads → Earns ETH in Web3Ads
2. User asks AI: "Use my ad earnings to pay for token swap quote"
3. AI agent calls `web3ads_check_balance` → Has 0.001 ETH
4. AI agent calls `web3ads_make_payment` → 0.0005 ETH to x402 API provider
5. Backend executes withdrawal to API provider
6. AI receives API response, user gets swap quote

---

## Implementation Steps (Priority Ordered)

> **📌 COMMIT DISCIPLINE**: Make atomic commits after each numbered step or logical group. Don't bundle unrelated changes. Use conventional commit prefixes: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`

---

### PHASE A: Core Monetization Flow (MVP)

**Goal:** Advertisers can create campaigns → Publishers can show ads and earn → Viewers with extension can earn

#### A1: Smart Contracts & Infrastructure ✅ COMPLETED

1. ✅ **Setup contracts project** — Foundry with Base Sepolia deployment
   - `Web3AdsCore.sol` — Registry, campaign management, reward pools
   - Deployed to: `0x94f31c33b675Ac968dAda3F5E22f6dBC22A7F872`

2. ✅ **Database schema** — PostgreSQL with Prisma (Supabase)
   - Tables: advertisers, campaigns, publishers, impressions, viewers

3. ✅ **Wallet integration in client** — wagmi + viem + RainbowKit

4. ✅ **Backend blockchain module** — `server/src/blockchain/index.ts`
   - EIP-712 signing for impressions and withdrawals
   - On-chain balance queries for viewers/publishers

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

9. ✅ **Create `web3ads-react` package** — Published to npm v0.1.0
   - Ad component for embedding with viewability tracking
   - Extension detection via data attribute

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

18. ✅ **Viewer dashboard in extension** — Shows accumulated earnings

19. ✅ **Viewer withdrawal UI** — Balance display + withdraw button in client

#### A5: Reward Distribution

20. **Revenue split logic** —
    - With extension proof: Publisher 50%, Viewer 20%, Platform 30%
    - Without extension: Publisher 50%, Platform 50%
      > 📌 `git commit -m "feat(server): implement revenue split logic"`

21. ✅ **Claim function** — Viewer withdrawal with EIP-712 signatures
22. **Minimum threshold** — $10 minimum for withdrawal (contract-enforced)

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

1. ✅ **Smart contracts:** Deployed to Base Sepolia at `0x94f31c33b675Ac968dAda3F5E22f6dBC22A7F872`
2. ⏳ **Ad serving:** Create test campaign, verify ad appears
3. ⏳ **Impressions:** Confirm tracking updates advertiser spend
4. ⏳ **zkProofs:** Generate proof in extension, verify on-chain
5. ✅ **Payouts:** Viewer withdrawal UI and backend proof endpoints implemented
6. ⏳ **Gasless:** Sponsor transaction from ad balance
7. ⏳ **MCP:** Connect Claude Desktop, check balance via tool

---

## Files to Modify/Create

**New directories:**

- `contracts/` - ✅ Solidity smart contracts (deployed)
- `packages/react/` - ✅ Publisher NPM package (published as `web3ads-react`)
- `packages/mcp-server/` - x402 MCP integration (pending)

**Client modifications:**

- `client/src/pages/` - Dashboard, Advertiser, Publisher, Viewer pages
- `client/src/components/` - Ad components, wallet connection
- `client/src/hooks/` - useContract, useWallet, useSemaphore

**Server modifications:**

- `server/src/routes/` - ✅ API route handlers (ads, viewers, publishers)
- `server/src/blockchain/` - ✅ Blockchain signing and queries
- `server/src/db/` - ✅ Prisma schema and migrations

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
BACKEND_SIGNER_PRIVATE_KEY="0x..."  # For signing impressions & withdrawals
WEB3ADS_CORE_ADDRESS="0x94f31c33b675Ac968dAda3F5E22f6dBC22A7F872"  # V1 (USDC)
WEB3ADS_CORE_V2_ADDRESS="TBD"  # V2 (ETH) - update after deployment
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

---

## V2 Contract Migration Checklist

After deploying Web3AdsCoreV2 + Forwarder to Base Sepolia:

### ✅ Already Updated

- [x] `contracts/src/Web3AdsCoreV2.sol` - ETH-based contract
- [x] `contracts/src/Forwarder.sol` - EIP-2771 forwarder
- [x] `contracts/script/DeployV2.s.sol` - Deployment script  
- [x] `server/src/blockchain/index.ts` - V2 ABI + withdrawViewerOnChain
- [x] `server/src/routes/rewards.ts` - ETH-based withdrawals
- [x] `client/src/pages/Info.tsx` - Demo vs Production pricing

### ⏳ Pending After Deployment

| File | Change Needed |
|------|---------------|
| `server/.env` | Add `WEB3ADS_CORE_V2_ADDRESS=0x...` |
| `client/src/config/wagmi.ts` | Add `web3AdsCoreV2` address, keep V1 for reference |
| `client/src/contracts/Web3AdsCore.ts` | Update ABI: add `payable` to createCampaign, remove paymentToken |
| `client/src/hooks/useContracts.ts` | Add `useETHDeposit()` hook, keep USDC hooks for V1 compatibility |
| `client/src/pages/Advertiser.tsx` | Use `{ value: amount }` instead of USDC approve flow |

### Deployment Commands

```bash
# 1. Deploy V2 contracts
cd contracts
forge script script/DeployV2.s.sol:DeployV2 \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify

# 2. Update .env files with deployed addresses
# 3. Fund backend signer with ETH for gas
# 4. Create test campaign with ETH deposit
```

---

## Demo Script (Hackathon)

1. **Show Advertiser Flow**
   - Connect wallet → Create campaign → Deposit 0.003 ETH (~$6)
   - Campaign becomes active

2. **Show Publisher Flow**
   - Visit test publisher page with `<Web3Ad />` component
   - Ads display correctly

3. **Show Viewer Flow (Star of Demo)**
   - Install extension → Link wallet on /viewer page
   - View 5 banner ads on publisher site
   - Watch earnings increase: $0 → $0.20 → $0.40 → $0.60 → $0.80 → **$1.00**
   - Click "Withdraw" → Receive ETH instantly (backend pays gas)
   - Show tx on BaseScan!

4. **Show x402 Integration (Bonus)**
   - AI agent checks user's Web3Ads balance
   - Agent uses earnings to pay for API call
   - User gets service without spending their own crypto
