# x402 MCP Integration — Implementation Plan

> Phase B2 from `plan-web3Ads.prompt.md` (Steps 25-28)
> Branch: `x402-integration`

---

## What We're Building

An MCP server (`packages/mcp-server/`) that lets AI agents check a user's web3ads earnings and spend that balance to pay for x402-protected API calls. The platform wallet makes the actual on-chain payment; the user's ad balance gets debited internally.

---

## Step 25: Create MCP Server Package

**Create `packages/mcp-server/`** with this structure:

```
packages/mcp-server/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # MCP server entry point (stdio transport)
│   ├── tools/
│   │   ├── check-balance.ts   # web3ads_check_balance tool
│   │   └── pay-x402.ts        # web3ads_pay_x402 tool
│   ├── x402/
│   │   └── client.ts          # x402 payment client (viem + x402-axios)
│   └── api/
│       └── web3ads.ts         # HTTP client for web3ads backend API
└── .env.example
```

**Dependencies:**

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x",
    "x402-axios": "^0.x",
    "axios": "^1.x",
    "viem": "^2.x",
    "dotenv": "^17.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsup": "^8.x",
    "@types/node": "^25.x"
  }
}
```

**Config (`tsconfig.json`):** Match server pattern — `ES2022`, `NodeNext`, strict.

**Entry point (`src/index.ts`):**
- Create MCP `Server` with name `"web3ads-x402"` and version `"1.0.0"`
- Register two tools: `web3ads_check_balance`, `web3ads_pay_x402`
- Use `StdioServerTransport` (works with Claude Desktop, Cursor, etc.)

**Scripts:**
- `dev`: `tsx src/index.ts` (for local testing)
- `build`: `tsup src/index.ts --format esm`
- `start`: `node dist/index.js`

> `git commit -m "feat(packages): scaffold MCP server for x402 integration"`

---

## Step 26: `web3ads_check_balance` Tool

**Purpose:** AI agent asks "does this user have ad earnings to spend?"

**Input schema:**
```typescript
{
  walletAddress?: string;  // Check by wallet (publisher + viewer balance)
  commitment?: string;     // Check by semaphore commitment (viewer only)
}
// At least one required
```

**Handler logic:**
1. If `walletAddress` provided → `GET {API_URL}/api/rewards/balance?walletAddress={addr}`
2. If `commitment` provided → `GET {API_URL}/api/rewards/balance-by-commitment?commitment={c}`
3. Return formatted balance info:
   ```json
   {
     "balance": 0.45,
     "canSpend": true,
     "breakdown": { "publisher": 0.30, "viewer": 0.15 }
   }
   ```

**Backend endpoint used:** Already exists — `/api/rewards/balance` and `/api/rewards/balance-by-commitment` in `server/src/routes/rewards.ts`.

> `git commit -m "feat(mcp-server): add web3ads_check_balance tool"`

---

## Step 27: `web3ads_pay_x402` Tool

**Purpose:** AI agent spends user's ad earnings to call an x402-protected API.

**Input schema:**
```typescript
{
  walletAddress: string;   // Who's paying (from their ad balance)
  url: string;             // The x402-protected URL to call
  method?: string;         // HTTP method (default: "POST")
  body?: object;           // Request body to send
  maxCost?: number;        // Max USDC willing to spend (safety cap)
}
```

**Handler logic:**
1. Check user balance via `/api/rewards/balance?walletAddress={addr}`
2. If balance < `maxCost` (or insufficient), return error
3. Make the x402 call using `x402-axios` + platform wallet:
   ```typescript
   const walletClient = createWalletClient({
     account: privateKeyToAccount(PLATFORM_PRIVATE_KEY),
     chain: baseSepolia,
     transport: http(RPC_URL)
   });
   const client = withPaymentInterceptor(axios.create(), walletClient);
   const response = await client({ url, method, data: body });
   ```
4. On success, debit the user's balance via `POST {API_URL}/api/x402/spend`:
   ```json
   { "walletAddress": "0x...", "amount": 0.01, "description": "x402: get_portfolio" }
   ```
5. Return x402 API response data + cost deducted + new balance

**New backend endpoint needed:** `POST /api/x402/spend` (see Step 27b below).

> `git commit -m "feat(mcp-server): add web3ads_pay_x402 tool"`

---

### Step 27b: Server-Side `/api/x402/spend` Route

**Create `server/src/routes/x402.ts`:**

```typescript
// POST /api/x402/spend
// Body: { walletAddress, amount, description }
// 1. Find user by wallet
// 2. Sum pendingBalance from publisher + viewer
// 3. If total < amount → 400 "Insufficient ad balance"
// 4. Deduct from viewer first, then publisher (or proportionally)
// 5. Create Payout record with payoutType: "x402_payment"
// 6. Return { success, amountSpent, newBalance, payoutId }
```

**Mount in `server/src/app.ts`:**
```typescript
import x402Router from "./routes/x402.js";
app.use("/api/x402", x402Router);
```

> `git commit -m "feat(server): add /api/x402/spend endpoint for MCP balance deduction"`

---

## Step 28: Integration & Config

**Environment variables (`packages/mcp-server/.env.example`):**
```env
# Web3Ads backend URL
WEB3ADS_API_URL=http://localhost:3001

# Platform wallet (same as BACKEND_SIGNER_PRIVATE_KEY from server)
# This wallet needs USDC on Base Sepolia to make x402 payments
PLATFORM_PRIVATE_KEY=0x...

# Base Sepolia RPC
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

**Claude Desktop / Cursor config:**
```json
{
  "mcpServers": {
    "web3ads-x402": {
      "command": "node",
      "args": ["S:/web3ads/packages/mcp-server/dist/index.js"],
      "env": {
        "WEB3ADS_API_URL": "http://localhost:3001",
        "PLATFORM_PRIVATE_KEY": "0x...",
        "BASE_SEPOLIA_RPC_URL": "https://sepolia.base.org"
      }
    }
  }
}
```

> `git commit -m "feat(packages): add MCP server config and env setup"`

---

## Files Changed / Created Summary

| Action | File | Notes |
|--------|------|-------|
| **CREATE** | `packages/mcp-server/package.json` | New package |
| **CREATE** | `packages/mcp-server/tsconfig.json` | ES2022 / NodeNext |
| **CREATE** | `packages/mcp-server/src/index.ts` | MCP server + tool registration |
| **CREATE** | `packages/mcp-server/src/tools/check-balance.ts` | Step 26 |
| **CREATE** | `packages/mcp-server/src/tools/pay-x402.ts` | Step 27 |
| **CREATE** | `packages/mcp-server/src/x402/client.ts` | x402-axios + viem wallet |
| **CREATE** | `packages/mcp-server/src/api/web3ads.ts` | HTTP client for backend |
| **CREATE** | `packages/mcp-server/.env.example` | Env template |
| **CREATE** | `server/src/routes/x402.ts` | New `/api/x402/spend` endpoint |
| **MODIFY** | `server/src/app.ts` | Mount x402 router |
| NO CHANGE | `pnpm-workspace.yaml` | Already includes `packages/*` |

---

## Verification (from plan step 7)

> ⏳ **MCP:** Connect Claude Desktop, check balance via tool

1. Start backend: `cd server && pnpm dev`
2. Build MCP server: `cd packages/mcp-server && pnpm build`
3. Add MCP config to Claude Desktop / Cursor
4. Test: ask Claude "check my web3ads balance for wallet 0x..."
5. Test: ask Claude "use my ad balance to get a token price via x402"
