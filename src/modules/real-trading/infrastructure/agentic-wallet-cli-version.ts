export const REQUIRED_AGENTIC_WALLET_CLI_VERSION = '1.10.0';

export function buildAgenticWalletCliVersionCheckArguments(): readonly string[] {
  return [
    'cli-check',
    '--required-version',
    REQUIRED_AGENTIC_WALLET_CLI_VERSION,
    '--json',
  ];
}

export function validateAgenticWalletCliVersion(
  value: unknown,
  operation: 'quote' | 'status lookup',
): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      `Agentic Wallet ${operation} CLI version response is invalid`,
    );
  }
  const envelope = value as Record<string, unknown>;
  if (
    envelope.success !== true ||
    typeof envelope.data !== 'object' ||
    envelope.data === null ||
    Array.isArray(envelope.data)
  ) {
    throw new Error(
      `Agentic Wallet ${operation} CLI version response is invalid`,
    );
  }
  const data = envelope.data as Record<string, unknown>;
  if (
    data.currentCliVersion !== REQUIRED_AGENTIC_WALLET_CLI_VERSION ||
    data.needUpdateCli !== false
  ) {
    throw new Error(
      `Agentic Wallet ${operation} CLI version does not match the pinned version`,
    );
  }
}
