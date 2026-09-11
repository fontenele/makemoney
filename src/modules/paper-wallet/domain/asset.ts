export const PAPER_WALLET_ASSETS = ['BTC', 'USDT'] as const;

export type Asset = (typeof PAPER_WALLET_ASSETS)[number];
