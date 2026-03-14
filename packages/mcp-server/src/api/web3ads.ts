import axios, { type AxiosInstance } from "axios";

const API_URL = process.env.WEB3ADS_API_URL || "http://localhost:3001";

const client: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

export interface BalanceResponse {
  publisher: {
    pending: number;
    claimed: number;
    total: number;
  } | null;
  viewer: {
    pending: number;
    claimed: number;
    total: number;
  } | null;
  total: {
    pending: number;
    claimed: number;
    total: number;
  };
  canWithdraw: boolean;
  minWithdrawal: number;
}

export interface CommitmentBalanceResponse {
  found: boolean;
  balance: number;
  totalEarnings: number;
  totalAdsViewed: number;
  canWithdraw?: boolean;
}

export interface SpendResponse {
  success: boolean;
  amountSpent: number;
  newBalance: number;
  payoutId: string;
}

/** Get balance by wallet address (publisher + viewer combined) */
export async function getBalanceByWallet(
  walletAddress: string,
): Promise<BalanceResponse> {
  const { data } = await client.get<BalanceResponse>("/api/rewards/balance", {
    params: { walletAddress },
  });
  return data;
}

/** Get balance by semaphore commitment (viewer only) */
export async function getBalanceByCommitment(
  commitment: string,
): Promise<CommitmentBalanceResponse> {
  const { data } = await client.get<CommitmentBalanceResponse>(
    "/api/rewards/balance-by-commitment",
    { params: { commitment } },
  );
  return data;
}

/** Deduct from user's ad balance to pay for an x402 call */
export async function spendBalance(params: {
  walletAddress: string;
  amount: number;
  description: string;
}): Promise<SpendResponse> {
  const { data } = await client.post<SpendResponse>(
    "/api/x402/spend",
    params,
  );
  return data;
}
