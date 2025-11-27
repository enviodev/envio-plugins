/**
 * Factory Pattern Example for HyperIndex
 *
 * This example demonstrates how to handle dynamically created contracts
 * using the factory pattern (e.g., Uniswap pairs, token deployments).
 *
 * In config.yaml, the dynamic contract should have NO address field:
 *
 * contracts:
 *   - name: Factory
 *     address: 0xFactoryAddress
 *     handler: src/factory.ts
 *     events:
 *       - event: PairCreated(address indexed token0, address indexed token1, address pair)
 *
 *   - name: Pair
 *     handler: src/pair.ts
 *     events:
 *       - event: Swap(...)
 *       - event: Mint(...)
 *       - event: Burn(...)
 *     # No address field - registered dynamically
 */

import { Factory, Pair } from "generated";

// Step 1: Register the dynamic contract BEFORE the handler
// This tells HyperIndex to start indexing events from this new contract
Factory.PairCreated.contractRegister(({ event, context }) => {
  // The method name is `add{ContractName}` based on your config.yaml contract name
  context.addPair(event.params.pair);
});

// Step 2: Handle the factory event (runs after contractRegister)
Factory.PairCreated.handler(async ({ event, context }) => {
  // Create token entities if they don't exist
  const token0Id = `${event.chainId}-${event.params.token0}`;
  const token1Id = `${event.chainId}-${event.params.token1}`;

  let token0 = await context.Token.get(token0Id);
  if (!token0) {
    token0 = {
      id: token0Id,
      address: event.params.token0,
      name: "Unknown",
      symbol: "???",
      decimals: BigInt(18),
    };
    context.Token.set(token0);
  }

  let token1 = await context.Token.get(token1Id);
  if (!token1) {
    token1 = {
      id: token1Id,
      address: event.params.token1,
      name: "Unknown",
      symbol: "???",
      decimals: BigInt(18),
    };
    context.Token.set(token1);
  }

  // Create the pair entity
  const pairId = `${event.chainId}-${event.params.pair}`;
  const pair = {
    id: pairId,
    address: event.params.pair,
    token0_id: token0Id,
    token1_id: token1Id,
    reserve0: BigInt(0),
    reserve1: BigInt(0),
    totalSupply: BigInt(0),
    txCount: BigInt(0),
    createdAtTimestamp: BigInt(event.block.timestamp),
    createdAtBlockNumber: BigInt(event.block.number),
  };

  context.Pair.set(pair);

  // Update factory stats
  const factoryId = `${event.chainId}-factory`;
  let factory = await context.Factory.get(factoryId);

  if (!factory) {
    factory = {
      id: factoryId,
      pairCount: BigInt(0),
      totalVolumeUSD: BigInt(0),
    };
  }

  context.Factory.set({
    ...factory,
    pairCount: factory.pairCount + BigInt(1),
  });
});

// Step 3: Handle events from dynamically registered contracts
Pair.Swap.handler(async ({ event, context }) => {
  const pairId = `${event.chainId}-${event.srcAddress}`;
  const pair = await context.Pair.get(pairId);

  if (!pair) {
    // This shouldn't happen if contractRegister worked correctly
    console.error(`Pair not found: ${pairId}`);
    return;
  }

  // Create swap entity
  const swap = {
    id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
    pair_id: pairId,
    sender: event.params.sender,
    to: event.params.to,
    amount0In: event.params.amount0In,
    amount1In: event.params.amount1In,
    amount0Out: event.params.amount0Out,
    amount1Out: event.params.amount1Out,
    blockNumber: BigInt(event.block.number),
    blockTimestamp: BigInt(event.block.timestamp),
  };

  context.Swap.set(swap);

  // Update pair stats
  context.Pair.set({
    ...pair,
    txCount: pair.txCount + BigInt(1),
  });
});

Pair.Sync.handler(async ({ event, context }) => {
  const pairId = `${event.chainId}-${event.srcAddress}`;
  const pair = await context.Pair.get(pairId);

  if (pair) {
    context.Pair.set({
      ...pair,
      reserve0: event.params.reserve0,
      reserve1: event.params.reserve1,
    });
  }
});

Pair.Mint.handler(async ({ event, context }) => {
  const pairId = `${event.chainId}-${event.srcAddress}`;
  const pair = await context.Pair.get(pairId);

  if (pair) {
    const mint = {
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      pair_id: pairId,
      sender: event.params.sender,
      amount0: event.params.amount0,
      amount1: event.params.amount1,
      blockNumber: BigInt(event.block.number),
      blockTimestamp: BigInt(event.block.timestamp),
    };

    context.Mint.set(mint);

    context.Pair.set({
      ...pair,
      txCount: pair.txCount + BigInt(1),
    });
  }
});

Pair.Burn.handler(async ({ event, context }) => {
  const pairId = `${event.chainId}-${event.srcAddress}`;
  const pair = await context.Pair.get(pairId);

  if (pair) {
    const burn = {
      id: `${event.chainId}-${event.transaction.hash}-${event.logIndex}`,
      pair_id: pairId,
      sender: event.params.sender,
      to: event.params.to,
      amount0: event.params.amount0,
      amount1: event.params.amount1,
      blockNumber: BigInt(event.block.number),
      blockTimestamp: BigInt(event.block.timestamp),
    };

    context.Burn.set(burn);

    context.Pair.set({
      ...pair,
      txCount: pair.txCount + BigInt(1),
    });
  }
});
