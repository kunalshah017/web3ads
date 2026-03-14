# Web3Ads OpenClaw Skill

OpenClaw skill-pack for Web3Ads - decentralized advertising platform with x402 micropayments.

This skill enables OpenClaw agents to:

- Check Web3Ads earnings balance (from viewing/publishing ads)
- Create and fund ad campaigns using x402 payments
- Pay for any x402 API using Web3Ads earnings (gasless!)
- Get platform and pricing information

## Unique Value

**Web3Ads earnings as universal x402 payment source**: Users earn ETH by viewing/publishing ads, and AI agents can use those earnings to pay for any x402-compatible API - including HeyElsa!

## Tools

### Read-Only Tools (Always Available)

| Tool                     | Description                    | Cost |
| ------------------------ | ------------------------------ | ---- |
| `web3ads_check_balance`  | Check Web3Ads earnings balance | Free |
| `web3ads_get_earnings`   | Detailed earnings breakdown    | Free |
| `web3ads_platform_info`  | Platform info and pricing      | Free |
| `web3ads_payment_info`   | x402 payment requirements      | Free |
| `web3ads_list_campaigns` | List user's ad campaigns       | Free |
| `web3ads_budget_status`  | Check remaining budget         | Free |

### Execution Tools (Opt-In)

When `WEB3ADS_ENABLE_EXECUTION=true`:

| Tool                      | Description                     | Cost           |
| ------------------------- | ------------------------------- | -------------- |
| `web3ads_create_campaign` | Create and fund ad campaign     | Budget amount  |
| `web3ads_fund_campaign`   | Add budget to existing campaign | Fund amount    |
| `web3ads_pay_x402`        | Pay any x402 API using earnings | Payment amount |

## Installation

```bash
git clone https://github.com/web3ads/web3ads-openclaw.git
cd web3ads-openclaw
npm install
```

## Configuration

Edit `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/web3ads-openclaw"]
    },
    "entries": {
      "web3ads": {
        "env": {
          "WEB3ADS_WALLET_ADDRESS": "0xYourWalletAddress"
        }
      }
    }
  }
}
```

With execution enabled:

```json
{
  "skills": {
    "entries": {
      "web3ads": {
        "env": {
          "WEB3ADS_WALLET_ADDRESS": "0x...",
          "WEB3ADS_ENABLE_EXECUTION": "true"
        }
      }
    }
  }
}
```

## Environment Variables

| Variable                 | Required | Default                 | Description                               |
| ------------------------ | -------- | ----------------------- | ----------------------------------------- |
| WEB3ADS_WALLET_ADDRESS   | Yes      | -                       | Your wallet address with Web3Ads earnings |
| WEB3ADS_API_URL          | No       | https://api.web3ads.wtf | Web3Ads API endpoint                      |
| WEB3ADS_ENABLE_EXECUTION | No       | false                   | Enable campaign creation/funding          |
| WEB3ADS_MAX_USD_PER_CALL | No       | 1.00                    | Max USD per operation                     |
| WEB3ADS_MAX_USD_PER_DAY  | No       | 10.00                   | Max daily spend                           |

## Usage Examples

```
YOU: "What's my Web3Ads balance?"
→ web3ads_check_balance

YOU: "Show my earnings breakdown"
→ web3ads_get_earnings

YOU: "Create a banner ad campaign for my DeFi app with 0.01 ETH budget"
→ web3ads_create_campaign (requires execution enabled)

YOU: "Use my Web3Ads earnings to pay for this Elsa API call"
→ web3ads_pay_x402
```

## x402 Integration

Web3Ads implements the Coinbase x402 protocol. Your ad earnings can be used to pay for:

- Web3Ads campaign creation
- Any x402-compatible API (HeyElsa, etc.)
- Cross-platform micropayments

## Network

- **Network**: Base Sepolia (Testnet)
- **Currency**: ETH
- **Contract**: 0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F

## Links

- Website: https://web3ads.wtf
- x402 Info: https://x402.org
- GitHub: https://github.com/web3ads/web3ads-openclaw
