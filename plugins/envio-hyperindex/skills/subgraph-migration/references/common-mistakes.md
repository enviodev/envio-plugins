# Common Migration Mistakes and Solutions

Common pitfalls when migrating from TheGraph to HyperIndex, with solutions.

## 1. Missing async/await

**Problem:** Entity loading returns empty object `{}` instead of entity.

```typescript
// WRONG - Missing await
const token = context.Token.get(tokenId);
if (token) {
  // token is {} not the actual entity
}

// CORRECT
const token = await context.Token.get(tokenId);
if (token) {
  // token is the actual entity
}
```

**Note:** `context.Entity.set()` does NOT need await - it's synchronous.

## 2. Entity Arrays Without @derivedFrom

**Problem:** Codegen fails with error "EE211: Arrays of entities is unsupported"

```graphql
# WRONG - Missing @derivedFrom
type Token {
  transfers: [Transfer!]!
}

# CORRECT - Must have @derivedFrom
type Token {
  transfers: [Transfer!]! @derivedFrom(field: "token")
}

type Transfer {
  token_id: String!  # Field referenced in @derivedFrom
}
```

**Important:** @derivedFrom arrays are virtual fields - they exist only in GraphQL API, not in handlers.

## 3. Accessing @derivedFrom Arrays in Handlers

**Problem:** Trying to access virtual arrays in handlers.

```typescript
// WRONG - derivedFrom arrays don't exist in handlers
const transfers = token.transfers;  // undefined

// CORRECT - Query using the relationship field
// Use indexed field operations if available:
const transfers = await context.Transfer.getWhere.token_id.eq(tokenId);

// Or query by ID if you know specific transfer IDs
const transfer = await context.Transfer.get(transferId);
```

## 4. Mutating Entities Directly

**Problem:** Entities are read-only, direct mutation doesn't work.

```typescript
// WRONG - Entities are immutable
token.totalSupply = newSupply;
context.Token.set(token);  // Changes not saved

// CORRECT - Use spread operator
context.Token.set({
  ...token,
  totalSupply: newSupply,
});
```

## 5. Missing Field Selection for Transaction Data

**Problem:** `event.transaction.hash` is undefined.

```yaml
# WRONG - No field selection
events:
  - event: Transfer(address indexed from, address indexed to, uint256 value)

# CORRECT - Add field_selection
events:
  - event: Transfer(address indexed from, address indexed to, uint256 value)
    field_selection:
      transaction_fields:
        - hash
```

## 6. Direct Relationship References

**Problem:** Using entity objects instead of ID strings.

```typescript
// WRONG - TheGraph style
const transfer = {
  token: tokenObject,  // Direct reference
};

// CORRECT - HyperIndex uses _id fields
const transfer = {
  token_id: tokenObject.id,  // String ID reference
};
```

Schema must also use `_id` suffix:
```graphql
type Transfer {
  token_id: String!  # Not token: Token!
}
```

## 7. Bytes vs String Type Mismatch

**Problem:** Using Bytes type which doesn't exist in HyperIndex.

```graphql
# WRONG - TheGraph type
sender: Bytes!
transactionHash: Bytes!

# CORRECT - HyperIndex uses String
sender: String!
transactionHash: String!
```

## 8. Missing Multichain ID Prefixes

**Problem:** ID collisions across chains in multichain indexers.

```typescript
// WRONG - ID collision between chains
const id = event.params.tokenId.toString();

// CORRECT - Prefix with chainId
const id = `${event.chainId}-${event.params.tokenId}`;

// For chain-specific singleton entities
const bundleId = `${event.chainId}-1`;  // Not just "1"
```

## 9. Contract Address in Dynamic Contract Config

**Problem:** Including address for dynamically registered contracts.

```yaml
# WRONG - Dynamic contract shouldn't have address
contracts:
  - name: Pair
    address: 0xSomeAddress  # Remove this!
    handler: src/pair.ts
    events:
      - event: Swap(...)

# CORRECT - No address field
contracts:
  - name: Pair
    handler: src/pair.ts
    events:
      - event: Swap(...)
```

## 10. Missing contractRegister

**Problem:** Dynamic contracts not being indexed.

```typescript
// WRONG - Only handler, no registration
Factory.PairCreated.handler(async ({ event, context }) => {
  // Pairs won't be indexed!
});

// CORRECT - Register before handler
Factory.PairCreated.contractRegister(({ event, context }) => {
  context.addPair(event.params.pair);
});

Factory.PairCreated.handler(async ({ event, context }) => {
  // Now pairs will be indexed
});
```

## 11. Duplicate Contract Names in Multichain

**Problem:** Defining handlers in network sections instead of globally.

```yaml
# WRONG - Duplicates contract definition
networks:
  - id: 1
    contracts:
      - name: Factory
        handler: src/factory.ts  # Don't repeat here
        events: [...]
        address: [...]
  - id: 10
    contracts:
      - name: Factory
        handler: src/factory.ts  # Don't repeat here
        events: [...]
        address: [...]

# CORRECT - Global definition, network-specific addresses
contracts:
  - name: Factory
    handler: src/factory.ts
    events:
      - event: PairCreated(...)

networks:
  - id: 1
    contracts:
      - name: Factory
        address: 0xEthereumAddress
  - id: 10
    contracts:
      - name: Factory
        address: 0xOptimismAddress
```

## 12. Losing BigDecimal Precision

**Problem:** Converting financial values to JavaScript numbers.

```typescript
// WRONG - Loses precision
const price = Number(amount) / 10 ** 18;
export const ZERO_BD = 0;  // Wrong type

// CORRECT - Maintain BigDecimal precision
import { BigDecimal } from "generated";
const ZERO_BD = new BigDecimal(0);

function convertToDecimal(amount: bigint, decimals: bigint): BigDecimal {
  return new BigDecimal(amount.toString()).div(
    new BigDecimal((10n ** decimals).toString())
  );
}
```

## 13. Wrong Entity Type Imports

**Problem:** Importing contract handlers instead of entity types.

```typescript
// WRONG - Imports contract
import { Pair, Token } from "generated";

// CORRECT - Import entity types
import { Pair_t, Token_t } from "generated/src/db/Entities.gen";

// Or use inferred types
const pair: Pair_t = {
  id: "...",
  // ...
};
```

## 14. External Calls Without Effect API

**Problem:** Direct RPC calls with preload_handlers enabled.

```typescript
// WRONG - Direct call runs twice during preload
const balance = await client.readContract({
  address: tokenAddress,
  abi: ERC20_ABI,
  functionName: "balanceOf",
});

// CORRECT - Use Effect API
import { createEffect, S } from "envio";

export const getBalance = createEffect({
  name: "getBalance",
  input: S.string,
  output: S.string,
  cache: true,
}, async ({ input: address }) => {
  const balance = await client.readContract({
    address: address as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
  });
  return balance.toString();
});

// In handler
const balance = await context.effect(getBalance, tokenAddress);
```

## 15. Hardcoded Factory Addresses

**Problem:** Using hardcoded addresses instead of constants.

```typescript
// WRONG - Hardcoded address
const factory = await context.Factory.get("0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f");

// CORRECT - Use constants
import { FACTORY_ADDRESS } from "./constants";
const factory = await context.Factory.get(`${event.chainId}-${FACTORY_ADDRESS}`);
```

## 16. Schema Int vs BigInt Mismatch

**Problem:** Using wrong type for numeric fields.

```graphql
# Schema defines
date: Int!        # Expects JavaScript number
amount: BigInt!   # Expects bigint
```

```typescript
// WRONG - Type mismatch
const entity = {
  date: BigInt(timestamp),  // Schema expects number
  amount: 123,              // Schema expects bigint
};

// CORRECT - Match schema types
const entity = {
  date: timestamp,          // number for Int!
  amount: BigInt(123),      // bigint for BigInt!
};
```

## 17. Null vs Undefined for Optional Fields

**Problem:** Using null instead of undefined.

```typescript
// WRONG - TheGraph uses null
const entity = {
  optionalField: null,
};

// CORRECT - HyperIndex uses undefined
const entity = {
  optionalField: undefined,
};

// Or omit the field entirely
const entity = {
  // optionalField not included
};
```

## Migration Validation Checklist

After migrating, verify:

- [ ] `pnpm codegen` runs without errors
- [ ] `pnpm tsc --noEmit` compiles successfully
- [ ] `TUI_OFF=true pnpm dev` runs and indexes events
- [ ] All handlers have async keyword
- [ ] All context.Entity.get() have await
- [ ] All entity updates use spread operator
- [ ] All relationships use _id suffix
- [ ] All entity arrays have @derivedFrom
- [ ] Transaction access has field_selection
- [ ] IDs are prefixed with chainId for multichain
- [ ] Dynamic contracts use contractRegister
- [ ] BigDecimal precision is maintained
- [ ] External calls use Effect API (if preload_handlers enabled)
