# Plan: Web3Ads Full Platform Implementation

## TL;DR

Build a Web3 ad network where publishers show ads, advertisers pay in USDC (Base), and users earn via a browser extension with privacy-preserving BitGo wallets. Manual claim system for payouts.

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client App    │     │  Browser Ext    │     │   Server API    │
│  (Dashboards)   │     │  (Viewer Earn)  │     │  (Core Logic)   │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ • Publisher UI  │     │ • Ad detection  │     │ • Auth (JWT)    │
│ • Advertiser UI │     │ • View tracking │     │ • Campaign CRUD │
│ • Analytics     │     │ • BitGo wallet  │     │ • Ad serving    │
│ • Wallet connect│     │ • Earnings UI   │     │ • View logging  │
└────────┬────────┘     └────────┬────────┘     │ • BitGo SDK     │
         │                       │              │ • Payout queue  │
         └───────────────────────┴──────────────┤                 │
                                                └────────┬────────┘
                                                         │
                              ┌───────────────────────────┴───────────────────────────┐
                              │                     Base L2                            │
                              │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
                              │  │ Ad Escrow   │  │ Publisher   │  │ User Claim  │    │
                              │  │ Contract    │  │ Payout      │  │ Contract    │    │
                              │  └─────────────┘  └─────────────┘  └─────────────┘    │
                              └───────────────────────────────────────────────────────┘
```

---

## Phase 1: Core Infrastructure (Backend + Database)

### 1.1 Database Schema Setup

- **Users table**: id, email, role (publisher/advertiser/viewer), wallet_address, created_at
- **Publishers table**: id, user_id, website_url, verification_status, ad_unit_ids
- **Ad Units table**: id, publisher_id, placement_type, dimensions, selector_config
- **Advertisers table**: id, user_id, company_name, escrow_balance
- **Campaigns table**: id, advertiser_id, budget, cpm_rate, targeting, status, creative_url
- **Ad Views table**: id, campaign_id, ad_unit_id, viewer_wallet_hash, timestamp, attestation
- **Earnings table**: id, wallet_address, amount, type (publisher/viewer), claimed_at
- **Payouts table**: id, wallet_address, amount, tx_hash, status

_Recommended: PostgreSQL with Prisma ORM_

### 1.2 Server API Endpoints

- `POST /auth/register` — Email/password + role
- `POST /auth/login` — JWT token
- `POST /publishers/register` — Submit website for verification
- `GET /publishers/:id/ad-units` — Get ad unit configurations
- `POST /ad-units` — Create new ad placement
- `POST /campaigns` — Advertiser creates campaign
- `POST /campaigns/:id/fund` — Deposit USDC to escrow
- `GET /ads/serve` — Fetch ad for given placement (called by SDK/extension)
- `POST /views/log` — Record ad view with attestation
- `GET /earnings/:wallet` — Get pending earnings
- `POST /payouts/claim` — Trigger payout to BitGo wallet

### 1.3 BitGo Integration (Server-side)

- Initialize BitGo SDK with API credentials
- Implement wallet creation endpoint (for extension users)
- Implement USDC transfer function for payouts
- Store wallet IDs encrypted, never expose private keys

---

## Phase 2: Smart Contracts (Base L2)

### 2.1 Ad Escrow Contract

```
- deposit(campaignId, amount) — Advertiser locks USDC
- recordSpend(campaignId, amount) — Server deducts from escrow
- withdrawRemaining(campaignId) — Advertiser claims unused funds
- Events: Deposited, SpendRecorded, Withdrawn
```

### 2.2 Payout Contract (Optional optimization)

```
- batchPayout(recipients[], amounts[]) — Gas-efficient multi-send
- Used for daily settlement if scale requires
```

### 2.3 Deployment

- Deploy to Base Sepolia (testnet) first
- Verify contracts on Basescan
- Use USDC on Base: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (mainnet)

---

## Phase 3: Publisher Dashboard (Client)

### 3.1 Pages

- `/dashboard` — Overview stats (views, earnings, payouts)
- `/sites` — Register websites, view verification status
- `/ad-units` — Create/manage ad placements
- `/payouts` — View earnings history, claim funds
- `/settings` — Wallet connection, profile

### 3.2 Key Components

- **WalletConnect button** — Connect existing wallet (for publishers/advertisers)
- **Site verification flow** — DNS TXT or meta tag verification
- **Ad unit builder** — Select ad size, generate embed code
- **Analytics charts** — Views, revenue over time

### 3.3 Integration

- Use `wagmi` + `viem` for wallet connection
- Call server API for all data operations
- Real-time updates via WebSocket (optional)

---

## Phase 4: Advertiser Flow (Client)

### 4.1 Pages

- `/campaigns` — List all campaigns
- `/campaigns/new` — Create campaign with targeting
- `/campaigns/:id` — Campaign details, stats, budget management
- `/billing` — Deposit USDC, view spend history

### 4.2 Key Features

- **Creative upload** — Image ads (300x250, 728x90, etc.)
- **Targeting config** — Website categories, geo (start simple)
- **Budget controls** — Daily cap, total budget, CPM bid
- **Escrow deposit** — Direct contract interaction to fund campaign

---

## Phase 5: Browser Extension (User Earnings)

### 5.1 Background Script

- **BitGo wallet creation** — On first install, create wallet via server
- **Wallet storage** — Store wallet ID in `chrome.storage.local` (encrypted)
- **Session management** — Track active viewing sessions
- **API communication** — Send view attestations to server

### 5.2 Content Script

- **Ad detection** — Identify Web3Ads placements on page (via data attributes)
- **View tracking** — Intersection Observer for viewability
- **Attestation generation** — Sign view events with timestamp + page context
- **Anti-fraud signals** — Mouse movement, scroll depth, tab focus

### 5.3 Popup UI

- **Earnings display** — Total earned, pending, claimed
- **Wallet info** — BitGo wallet address (for withdrawals)
- **Claim button** — Request payout (calls server, server pays from BitGo)
- **History** — Past claims and transactions
- **Withdraw to external** — Transfer from BitGo to user's real wallet

### 5.4 Privacy Architecture

```
User Identity → BitGo Pseudonymous Wallet → Ad View Tracking
                         ↓
              User withdraws to real wallet (no link to views)
```

- Server never sees user's real wallet during tracking
- Withdrawal is user-initiated, one-way

---

## Phase 6: Publisher SDK (Ad Serving)

### 6.1 Embed Script

```javascript
<script src="https://cdn.web3ads.wtf/sdk.js"></script>
<div data-web3ads-unit="UNIT_ID"></div>
```

### 6.2 SDK Features

- Fetch ad creative from `/ads/serve?unit=UNIT_ID`
- Render ad in container
- Track impressions (viewability threshold: 50% visible for 1s)
- Report views to server (non-extension users)
- Detect extension presence for enhanced tracking

---

## Relevant Files to Modify/Create

### Server (`server/src/`)

- `index.ts` — Route setup, middleware
- `routes/auth.ts` — Authentication endpoints
- `routes/publishers.ts` — Publisher CRUD
- `routes/advertisers.ts` — Advertiser CRUD
- `routes/campaigns.ts` — Campaign management
- `routes/ads.ts` — Ad serving logic
- `routes/views.ts` — View logging + attestation verification
- `routes/payouts.ts` — Claim handling
- `services/bitgo.ts` — BitGo SDK wrapper
- `services/blockchain.ts` — Contract interactions
- `db/schema.prisma` — Database schema

### Client (`client/src/`)

- `App.tsx` — Router setup
- `pages/Dashboard.tsx` — Publisher dashboard
- `pages/Campaigns.tsx` — Advertiser campaigns
- `pages/AdUnits.tsx` — Ad unit management
- `components/WalletConnect.tsx` — Wallet button
- `hooks/useContract.ts` — Contract interactions
- `lib/api.ts` — Server API client

### Extension (`extension/`)

- `pages/popup/src/Popup.tsx` — Main popup UI
- `chrome-extension/src/background/index.ts` — Background script
- `pages/content/src/index.ts` — Content script (ad detection)
- `packages/storage/lib/` — Wallet storage helpers

### Contracts (new directory: `contracts/`)

- `AdEscrow.sol` — Escrow contract
- `deploy.ts` — Deployment script
- `hardhat.config.ts` — Hardhat setup for Base

---

## Verification Steps

1. **Database**: Run migrations, verify tables in DB GUI
2. **Auth flow**: Register user, login, verify JWT works
3. **Publisher flow**: Register site, create ad unit, get embed code
4. **Advertiser flow**: Create campaign, deposit USDC (testnet), verify escrow
5. **SDK**: Embed ad unit on test page, verify ad renders
6. **Extension**: Install extension, verify BitGo wallet creates
7. **View tracking**: View ad, check view logged in DB
8. **Claim flow**: Accumulate views, claim payout, verify USDC received
9. **Privacy**: Confirm no link between BitGo wallet and view logs in DB export

---

## Decisions & Assumptions

1. **BitGo over embedded wallets** — User's choice for enterprise-grade custody + privacy
2. **Manual claims** — Simpler than streaming, user controls timing
3. **Full flow MVP** — No phased rollout, building complete system
4. **PostgreSQL + Prisma** — Standard, well-documented, good for this scale
5. **Base L2** — Low fees, USDC liquidity, good ecosystem

---

## Open Considerations

1. **BitGo wallet type**: Standard wallet vs MPC wallet? MPC provides better security but adds complexity. _Recommend: Start with standard custodial, upgrade to MPC for production._

2. **Publisher payout timing**: Same claim system as users, or automatic monthly? _Recommend: Same claim system for consistency._

3. **Revenue split**: What % goes to publishers vs users? Common models:
   - 70% publisher / 10% users / 20% platform
   - 60% publisher / 20% users / 20% platform
   - _Need your input on split._

4. **Minimum claim threshold**: To prevent dust claims eating gas. _Recommend: $5 minimum._
