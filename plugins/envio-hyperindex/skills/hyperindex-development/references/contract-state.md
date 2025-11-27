# Accessing Contract State

Read on-chain contract state (token metadata, balances, etc.) from your event handlers using the Effect API with viem.

## When You Need This

- Token metadata (name, symbol, decimals) not in events
- Current balances or allowances
- Contract configuration values
- Any on-chain data not emitted in events

## Basic Setup

### 1. Create a Viem Client

```typescript
// src/effects/client.ts
import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

export const client = createPublicClient({
  chain: mainnet,
  batch: { multicall: true },  // Enable multicall batching
  transport: http(process.env.RPC_URL, { batch: true }),
});
```

### 2. Create an Effect for RPC Calls

```typescript
// src/effects/tokenMetadata.ts
import { experimental_createEffect, S } from "envio";
import { client } from "./client";

const ERC20_ABI = [
  { name: "name", type: "function", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

export const getTokenMetadata = experimental_createEffect(
  {
    name: "getTokenMetadata",
    input: S.object({
      tokenAddress: S.string,
      chainId: S.number,
    }),
    output: S.object({
      name: S.string,
      symbol: S.string,
      decimals: S.number,
    }),
    cache: true,  // Cache results - same token won't be fetched twice
  },
  async ({ input }) => {
    const address = input.tokenAddress as `0x${string}`;

    const [name, symbol, decimals] = await client.multicall({
      allowFailure: false,
      contracts: [
        { address, abi: ERC20_ABI, functionName: "name" },
        { address, abi: ERC20_ABI, functionName: "symbol" },
        { address, abi: ERC20_ABI, functionName: "decimals" },
      ],
    });

    return { name, symbol, decimals: Number(decimals) };
  }
);
```

### 3. Use in Handler

```typescript
import { getTokenMetadata } from "./effects/tokenMetadata";

UniswapV3Factory.PoolCreated.handler(async ({ event, context }) => {
  // Fetch token metadata via Effect API
  const token0Data = await context.effect(getTokenMetadata, {
    tokenAddress: event.params.token0,
    chainId: event.chainId,
  });

  context.Token.set({
    id: event.params.token0,
    name: token0Data.name,
    symbol: token0Data.symbol,
    decimals: token0Data.decimals,
  });
});
```

## Handling Non-Standard Tokens

Some tokens (like MKR, SAI) return `bytes32` instead of `string` for name/symbol:

```typescript
import { hexToString } from "viem";

export const getTokenMetadata = experimental_createEffect(
  {
    name: "getTokenMetadata",
    input: S.string,
    output: S.object({
      name: S.string,
      symbol: S.string,
      decimals: S.number,
    }),
    cache: true,
  },
  async ({ input: tokenAddress }) => {
    const address = tokenAddress as `0x${string}`;

    // Try standard ERC20 first
    try {
      const [name, symbol, decimals] = await client.multicall({
        allowFailure: false,
        contracts: [
          { address, abi: ERC20_ABI, functionName: "name" },
          { address, abi: ERC20_ABI, functionName: "symbol" },
          { address, abi: ERC20_ABI, functionName: "decimals" },
        ],
      });
      return { name, symbol, decimals: Number(decimals) };
    } catch {
      // Fallback: Try bytes32 variant
      try {
        const [name, symbol, decimals] = await client.multicall({
          allowFailure: false,
          contracts: [
            { address, abi: ERC20_BYTES_ABI, functionName: "name" },
            { address, abi: ERC20_BYTES_ABI, functionName: "symbol" },
            { address, abi: ERC20_BYTES_ABI, functionName: "decimals" },
          ],
        });
        return {
          name: hexToString(name).replace(/\u0000/g, ""),
          symbol: hexToString(symbol).replace(/\u0000/g, ""),
          decimals: Number(decimals),
        };
      } catch {
        // Final fallback
        return { name: "Unknown", symbol: "???", decimals: 18 };
      }
    }
  }
);

const ERC20_BYTES_ABI = [
  { name: "name", type: "function", inputs: [], outputs: [{ type: "bytes32" }] },
  { name: "symbol", type: "function", inputs: [], outputs: [{ type: "bytes32" }] },
  { name: "decimals", type: "function", inputs: [], outputs: [{ type: "uint8" }] },
] as const;
```

## Multichain RPC

For indexers spanning multiple chains:

```typescript
import { createPublicClient, http } from "viem";
import { mainnet, optimism, arbitrum } from "viem/chains";

const CHAINS: Record<number, { chain: any; rpcUrl: string }> = {
  1: { chain: mainnet, rpcUrl: process.env.ETH_RPC_URL! },
  10: { chain: optimism, rpcUrl: process.env.OP_RPC_URL! },
  42161: { chain: arbitrum, rpcUrl: process.env.ARB_RPC_URL! },
};

function getClient(chainId: number) {
  const config = CHAINS[chainId];
  if (!config) throw new Error(`No RPC configured for chain ${chainId}`);

  return createPublicClient({
    chain: config.chain,
    batch: { multicall: true },
    transport: http(config.rpcUrl, { batch: true }),
  });
}

export const getBalance = experimental_createEffect(
  {
    name: "getBalance",
    input: S.object({ chainId: S.number, address: S.string }),
    output: S.string,
    cache: true,
  },
  async ({ input }) => {
    const client = getClient(input.chainId);
    const balance = await client.getBalance({
      address: input.address as `0x${string}`,
    });
    return balance.toString();
  }
);
```

## Important: Current vs Historical State

RPC calls return **current** blockchain state, not historical state at the event's block.

For most use cases (token metadata), this is fine - names/symbols/decimals rarely change.

For historical data (balance at specific block), you'd need archive node access:
```typescript
const balance = await client.getBalance({
  address: "0x...",
  blockNumber: BigInt(event.block.number),  // Requires archive node
});
```

## Error Handling Pattern

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  try {
    const metadata = await context.effect(getTokenMetadata, {
      tokenAddress: event.params.token,
      chainId: event.chainId,
    });

    context.Token.set({
      id: event.params.token,
      ...metadata,
    });
  } catch (error) {
    context.log.error("Failed to fetch token metadata", {
      token: event.params.token,
      error,
    });
    // Create with defaults or skip
    context.Token.set({
      id: event.params.token,
      name: "Unknown",
      symbol: "???",
      decimals: 18,
    });
  }
});
```

## Best Practices

1. **Always use Effect API** - Never call RPC directly in handlers
2. **Enable caching** - `cache: true` prevents duplicate calls
3. **Use multicall** - Batch multiple contract reads into one RPC call
4. **Handle non-standard tokens** - Try string first, fallback to bytes32
5. **Provide fallback values** - Don't let RPC failures crash your indexer
6. **Document required env vars** - List all RPC URLs in `.env.example`

## File Organization

```
src/
├── effects/
│   ├── index.ts           # Export all effects
│   ├── client.ts          # Viem client setup
│   └── tokenMetadata.ts   # Token-related effects
├── EventHandlers.ts
└── .env.example           # RPC_URL=https://...
```
