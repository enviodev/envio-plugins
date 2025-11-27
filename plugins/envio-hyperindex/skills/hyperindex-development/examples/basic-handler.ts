/**
 * Basic HyperIndex Event Handler Example
 *
 * This example demonstrates the fundamental patterns for handling
 * blockchain events with HyperIndex.
 */

import { MyContract } from "generated";

// Simple event handler - creates a new entity for each event
MyContract.Transfer.handler(async ({ event, context }) => {
  // Create unique ID using chainId, transaction hash, and log index
  const id = `${event.chainId}-${event.transaction.hash}-${event.logIndex}`;

  // Create the entity object with all required fields
  const transfer = {
    id,
    from: event.params.from,
    to: event.params.to,
    amount: event.params.amount,
    token_id: event.srcAddress, // Relationship to Token entity
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
    transactionHash: event.transaction.hash,
  };

  // Save the entity
  context.Transfer.set(transfer);
});

// Handler that updates existing entities
MyContract.Approval.handler(async ({ event, context }) => {
  // Load existing token entity
  const tokenId = `${event.chainId}-${event.srcAddress}`;
  const token = await context.Token.get(tokenId);

  if (token) {
    // Update entity using spread operator (entities are immutable)
    const updatedToken = {
      ...token,
      lastApprovalTime: BigInt(event.block.timestamp),
      approvalCount: token.approvalCount + BigInt(1),
    };

    context.Token.set(updatedToken);
  }

  // Create approval record
  const approval = {
    id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
    owner: event.params.owner,
    spender: event.params.spender,
    amount: event.params.value,
    token_id: tokenId,
    blockTimestamp: BigInt(event.block.timestamp),
  };

  context.Approval.set(approval);
});

// Get-or-create pattern for entities that may not exist
MyContract.Mint.handler(async ({ event, context }) => {
  const tokenId = `${event.chainId}-${event.srcAddress}`;

  // Try to load existing token
  let token = await context.Token.get(tokenId);

  if (!token) {
    // Create new token with default values
    token = {
      id: tokenId,
      address: event.srcAddress,
      name: "Unknown",
      symbol: "???",
      decimals: BigInt(18),
      totalSupply: BigInt(0),
      transferCount: BigInt(0),
    };
  }

  // Update with new values
  const updatedToken = {
    ...token,
    totalSupply: token.totalSupply + event.params.amount,
  };

  context.Token.set(updatedToken);
});
