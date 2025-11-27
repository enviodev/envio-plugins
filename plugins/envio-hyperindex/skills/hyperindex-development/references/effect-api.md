# Effect API for External Calls

When `preload_handlers: true` is enabled in config.yaml, all external calls (RPC, API, fetch) MUST use the Effect API.

## Why Effect API?

With preload optimizations enabled:
- Handlers run twice (preload phase + execution phase)
- Direct external calls would execute twice
- Effect API caches results and handles preload correctly

## Creating an Effect

```typescript
import { S, createEffect } from "envio";

export const getTokenMetadata = createEffect(
  {
    name: "getTokenMetadata",  // For debugging
    input: S.string,            // Input schema
    output: S.object({          // Output schema
      name: S.string,
      symbol: S.string,
      decimals: S.number,
    }),
    rateLimit: false,           // Disable rate limiting
    cache: true,                // Enable caching
  },
  async ({ input: tokenAddress, context }) => {
    // External call here
    const response = await fetch(`https://api.example.com/token/${tokenAddress}`);
    return response.json();
  }
);
```

## Schema Definition (S module)

The `S` module provides schema builders:

```typescript
import { S } from "envio";

// Primitives
S.string
S.number
S.boolean
S.bigint

// Nullable
S.union([S.string, S.null])

// Objects
S.object({
  name: S.string,
  value: S.number,
})

// Arrays
S.array(S.string)

// Tuples
S.tuple([S.string, S.number])
```

Full schema API: https://raw.githubusercontent.com/DZakh/sury/refs/tags/v9.3.0/docs/js-usage.md

## Using Effects in Handlers

```typescript
import { getTokenMetadata } from "./effects";

MyContract.Event.handler(async ({ event, context }) => {
  // Call effect with context.effect()
  const metadata = await context.effect(getTokenMetadata, event.params.token);

  // Use the result
  const entity = {
    id: event.params.token,
    name: metadata.name,
    symbol: metadata.symbol,
    decimals: BigInt(metadata.decimals),
  };

  context.Token.set(entity);
});
```

## RPC Calls with Viem

For blockchain RPC calls, use viem with Effect API:

```typescript
import { createEffect, S } from "envio";
import { createPublicClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";

const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
]);

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.RPC_URL),
});

export const fetchTokenData = createEffect(
  {
    name: "fetchTokenData",
    input: S.string,
    output: S.object({
      name: S.string,
      symbol: S.string,
      decimals: S.number,
      totalSupply: S.string,
    }),
    cache: true,
  },
  async ({ input: tokenAddress }) => {
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "name",
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "symbol",
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "decimals",
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "totalSupply",
        }),
      ]);

      return {
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
      };
    } catch (error) {
      // Return defaults on error
      return {
        name: "Unknown",
        symbol: "???",
        decimals: 18,
        totalSupply: "0",
      };
    }
  }
);
```

## Multichain RPC

For multichain indexers, pass chainId to select correct RPC:

```typescript
import { createEffect, S } from "envio";
import { createPublicClient, http } from "viem";

const RPC_URLS: Record<number, string> = {
  1: process.env.ETH_RPC_URL!,
  10: process.env.OP_RPC_URL!,
  137: process.env.POLYGON_RPC_URL!,
};

export const fetchBalance = createEffect(
  {
    name: "fetchBalance",
    input: S.object({
      chainId: S.number,
      address: S.string,
    }),
    output: S.string,
    cache: true,
  },
  async ({ input }) => {
    const rpcUrl = RPC_URLS[input.chainId];
    if (!rpcUrl) throw new Error(`No RPC for chain ${input.chainId}`);

    const client = createPublicClient({
      transport: http(rpcUrl),
    });

    const balance = await client.getBalance({
      address: input.address as `0x${string}`,
    });

    return balance.toString();
  }
);

// Usage in handler
MyContract.Event.handler(async ({ event, context }) => {
  const balance = await context.effect(fetchBalance, {
    chainId: event.chainId,
    address: event.params.user,
  });
});
```

## Skipping Preload Logic

Use `!context.isPreload` to skip non-essential logic during preload:

```typescript
MyContract.Event.handler(async ({ event, context }) => {
  // This always runs
  const entity = await context.Token.get(event.params.token);

  if (!context.isPreload) {
    // This only runs during actual execution
    console.log("Processing event:", event.logIndex);
  }

  context.Token.set(entity);
});
```

## Best Practices

1. **Always cache when possible** - Set `cache: true` for idempotent calls
2. **Handle errors gracefully** - Return default values on failure
3. **Batch calls** - Use `Promise.all()` for multiple independent calls
4. **Organize effects** - Create `src/effects/` directory for effect definitions
5. **Use typed inputs** - Define proper schemas for type safety
6. **Document env vars** - List required RPC URLs in `.env.example`

## File Organization

```
src/
├── effects/
│   ├── index.ts          # Export all effects
│   ├── tokenMetadata.ts  # Token-related effects
│   └── pricing.ts        # Price fetching effects
├── EventHandlers.ts
└── utils.ts
```
