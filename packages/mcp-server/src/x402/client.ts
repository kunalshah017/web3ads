import axios from "axios";
import { createSigner, withPaymentInterceptor } from "x402-axios";
import { privateKeyToAccount } from "viem/accounts";

const PLATFORM_PRIVATE_KEY = process.env.PLATFORM_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

/**
 * Create an axios client that auto-handles x402 (HTTP 402) payment flows.
 *
 * When a request returns 402 Payment Required, the interceptor:
 * 1. Reads the payment requirements from the response header
 * 2. Signs an EIP-712 authorization using the platform wallet
 * 3. Retries the request with a PAYMENT-SIGNATURE header
 * 4. On-chain USDC transfer settles automatically via the facilitator
 */
export async function createX402Client() {
  if (!PLATFORM_PRIVATE_KEY) {
    throw new Error(
      "PLATFORM_PRIVATE_KEY is required for x402 payments. " +
        "This wallet needs USDC on Base Sepolia.",
    );
  }

  const account = privateKeyToAccount(PLATFORM_PRIVATE_KEY);

  // createSigner(network, privateKey) → creates a wallet client for x402 signing
  const signer = await createSigner("base-sepolia", PLATFORM_PRIVATE_KEY);

  const client = withPaymentInterceptor(axios.create(), signer);

  return { client, payerAddress: account.address };
}
