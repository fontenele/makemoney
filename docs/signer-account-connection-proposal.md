# Withdrawn read-only signer-account proposal

The operator keeps exclusively the existing project-linked Agentic Wallet through the local API/CLI. No alternative wallet, injected-browser connector, mobile pairing, or funds migration is offered. The browser connector has been removed and `signerAccountAccessAuthorized` is false. The selected `enforceable_native_fee_ceiling` remains required; pinned CLI 1.10.0 cannot enforce it, so real execution remains blocked. Read-only and paper features remain available. No signature or financial transaction is authorized.

The previously authorized click-only account/network connector was evaluated and then removed after the operator chose to retain only the existing mobile Agentic Wallet. Its implementation and tests were removed with the feature. It cannot reconnect the CLI wallet or establish fee-bound execution capability. Earlier account-access authorization does not authorize an alternative signer under the current decision.
