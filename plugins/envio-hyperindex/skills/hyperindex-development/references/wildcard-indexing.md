# Wildcard Indexing & Topic Filtering

Index events by signature without specifying contract addresses.

## Basic Wildcard Indexing

Index all events matching a signature across ALL contracts:

**config.yaml:**
```yaml
networks:
  - id: 1
    start_block: 0
    contracts:
      - name: ERC20
        handler: ./src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)
        # No address = wildcard indexing
```

**Handler:**
```typescript
import { ERC20 } from "generated";

ERC20.Transfer.handler(
  async ({ event, context }) => {
    context.Transfer.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from,
      to: event.params.to,
      token: event.srcAddress,  // The actual contract address
    });
  },
  { wildcard: true }  // Enable wildcard
);
```

## Topic Filtering

Filter wildcard events by indexed parameters:

### Single Filter

Only index mints (from = zero address):

```typescript
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

ERC20.Transfer.handler(
  async ({ event, context }) => {
    // Handle mint event...
  },
  { wildcard: true, eventFilters: { from: ZERO_ADDRESS } }
);
```

### Multiple Filters

Index both mints AND burns:

```typescript
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const WHITELISTED = [
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
];

ERC20.Transfer.handler(
  async ({ event, context }) => {
    // Handle mint or burn...
  },
  {
    wildcard: true,
    eventFilters: [
      { from: ZERO_ADDRESS, to: WHITELISTED },  // Mints to whitelisted
      { from: WHITELISTED, to: ZERO_ADDRESS },  // Burns from whitelisted
    ],
  }
);
```

### Per-Network Filters

Different filters for different chains:

```typescript
const WHITELISTED = {
  1: ["0xEthereumAddress1"],
  137: ["0xPolygonAddress1", "0xPolygonAddress2"],
};

ERC20.Transfer.handler(
  async ({ event, context }) => {
    // Handle transfer...
  },
  {
    wildcard: true,
    eventFilters: ({ chainId }) => [
      { from: ZERO_ADDRESS, to: WHITELISTED[chainId] },
      { from: WHITELISTED[chainId], to: ZERO_ADDRESS },
    ],
  }
);
```

## Wildcard with Dynamic Contracts

Track ERC20 transfers to/from dynamically registered contracts:

**config.yaml:**
```yaml
networks:
  - id: 1
    contracts:
      - name: SafeRegistry
        address: 0xRegistryAddress
        handler: ./src/EventHandlers.ts
        events:
          - event: NewSafe(address safe)

      - name: Safe
        handler: ./src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)
        # No address - dynamically registered
```

**Handler:**
```typescript
// Register Safe addresses dynamically
SafeRegistry.NewSafe.contractRegister(async ({ event, context }) => {
  context.addSafe(event.params.safe);
});

// Track transfers to/from registered Safes
Safe.Transfer.handler(
  async ({ event, context }) => {
    context.Transfer.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from,
      to: event.params.to,
    });
  },
  {
    wildcard: true,
    eventFilters: ({ addresses }) => [
      { from: addresses },  // Transfers FROM Safe addresses
      { to: addresses },    // Transfers TO Safe addresses
    ],
  }
);
```

## Filter in Handler

Additional filtering inside handler:

```typescript
const USDC = {
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
};

Safe.Transfer.handler(
  async ({ event, context }) => {
    // Only process USDC transfers
    if (event.srcAddress !== USDC[event.chainId]) {
      return;
    }

    context.USDCTransfer.set({
      id: `${event.chainId}_${event.block.number}_${event.logIndex}`,
      from: event.params.from,
      to: event.params.to,
      amount: event.params.value,
    });
  },
  {
    wildcard: true,
    eventFilters: ({ addresses }) => [{ from: addresses }, { to: addresses }],
  }
);
```

## Contract Register with Filters

Filter factory events when registering contracts:

```typescript
const DAI = "0x6B175474E89094C44Da98b954EedeAC495271d0F";

// Only register pools containing DAI
UniV3Factory.PoolCreated.contractRegister(
  async ({ event, context }) => {
    context.addUniV3Pool(event.params.pool);
  },
  { eventFilters: [{ token0: DAI }, { token1: DAI }] }
);
```

## Use Cases

- **Index all ERC20 transfers** - Track any token transfer
- **Index all NFT mints** - Track mints across collections
- **Track protocol interactions** - Monitor transfers to/from your contracts
- **Cross-contract analysis** - Analyze patterns across all contracts
- **Factory-created contracts** - Index contracts created by factories

## Limitations

- Only one wildcard per event signature per network
- Either `contractRegister` OR `handler` can have eventFilters, not both
- RPC data source supports only single wildcard event with topic filtering
