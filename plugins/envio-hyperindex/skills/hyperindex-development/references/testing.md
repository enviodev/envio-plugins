# Testing HyperIndex Indexers

Unit test handlers with MockDb and simulated events.

## Setup

1. Install test framework:
```bash
pnpm i mocha @types/mocha
```

2. Create test folder and file: `test/test.ts`

3. Add to `package.json`:
```json
"test": "mocha"
```

4. Generate test helpers:
```bash
pnpm codegen
```

## Basic Test Structure

```typescript
import assert from "assert";
import { TestHelpers, UserEntity } from "generated";

const { MockDb, Greeter, Addresses } = TestHelpers;

describe("Greeter Indexer", () => {
  it("NewGreeting creates User entity", async () => {
    // 1. Create mock database
    const mockDb = MockDb.createMockDb();

    // 2. Create mock event
    const mockEvent = Greeter.NewGreeting.createMockEvent({
      greeting: "Hello",
      user: Addresses.defaultAddress,
    });

    // 3. Process event
    const updatedDb = await mockDb.processEvents([mockEvent]);

    // 4. Assert result
    const user = updatedDb.entities.User.get(Addresses.defaultAddress);
    assert.equal(user?.latestGreeting, "Hello");
  });
});
```

## MockDb API

### Create Empty Database

```typescript
const mockDb = MockDb.createMockDb();
```

### Add Entities

```typescript
const mockDb = MockDb.createMockDb();
const dbWithEntity = mockDb.entities.User.set({
  id: "user-1",
  balance: BigInt(1000),
  name: "Alice",
});
```

### Get Entities

```typescript
const user = updatedDb.entities.User.get("user-1");
```

### Process Events

```typescript
const updatedDb = await mockDb.processEvents([event1, event2, event3]);
```

## Creating Mock Events

### Basic Event

```typescript
const mockEvent = MyContract.Transfer.createMockEvent({
  from: "0x123...",
  to: "0x456...",
  value: BigInt(1000),
});
```

### With Custom Metadata

```typescript
const mockEvent = MyContract.Transfer.createMockEvent(
  {
    from: "0x123...",
    to: "0x456...",
    value: BigInt(1000),
  },
  {
    chainId: 1,
    srcAddress: "0xContractAddress",
    logIndex: 0,
    block: {
      number: 12345678,
      timestamp: 1699000000,
      hash: "0xblockhash...",
    },
    transaction: {
      hash: "0xtxhash...",
    },
  }
);
```

## Test Patterns

### Entity Creation

```typescript
it("creates entity on event", async () => {
  const mockDb = MockDb.createMockDb();

  const event = MyContract.Created.createMockEvent({
    id: "token-1",
    name: "Token",
  });

  const updatedDb = await mockDb.processEvents([event]);

  const token = updatedDb.entities.Token.get("token-1");
  assert.ok(token, "Token should exist");
  assert.equal(token.name, "Token");
});
```

### Entity Updates

```typescript
it("updates entity on subsequent events", async () => {
  const mockDb = MockDb.createMockDb();
  const userAddress = Addresses.defaultAddress;

  // First event
  const event1 = Greeter.NewGreeting.createMockEvent({
    greeting: "Hello",
    user: userAddress,
  });

  // Second event
  const event2 = Greeter.NewGreeting.createMockEvent({
    greeting: "Hi again",
    user: userAddress,
  });

  const updatedDb = await mockDb.processEvents([event1, event2]);

  const user = updatedDb.entities.User.get(userAddress);
  assert.equal(user?.numberOfGreetings, 2);
  assert.equal(user?.latestGreeting, "Hi again");
});
```

### Pre-existing Entities

```typescript
it("updates existing entity", async () => {
  // Start with entity in database
  const mockDb = MockDb.createMockDb()
    .entities.Token.set({
      id: "token-1",
      totalSupply: BigInt(1000),
    });

  const event = MyContract.Mint.createMockEvent({
    tokenId: "token-1",
    amount: BigInt(500),
  });

  const updatedDb = await mockDb.processEvents([event]);

  const token = updatedDb.entities.Token.get("token-1");
  assert.equal(token?.totalSupply, BigInt(1500));
});
```

### Multiple Event Types

```typescript
it("handles multiple event types", async () => {
  const mockDb = MockDb.createMockDb();

  const mintEvent = MyContract.Mint.createMockEvent({ ... });
  const transferEvent = MyContract.Transfer.createMockEvent({ ... });
  const burnEvent = MyContract.Burn.createMockEvent({ ... });

  const updatedDb = await mockDb.processEvents([
    mintEvent,
    transferEvent,
    burnEvent,
  ]);

  // Assert final state
});
```

## Debugging Tests

### Log Entity State

```typescript
const user = updatedDb.entities.User.get(userId);
console.log(JSON.stringify(user, null, 2));
```

### Check Entity Exists

```typescript
assert.ok(
  updatedDb.entities.User.get(userId),
  `User ${userId} should exist`
);
```

## Common Issues

### "Cannot read properties of undefined"
- Entity doesn't exist - check IDs match
- Entity wasn't created - verify handler logic

### Type Mismatch
- Match schema types (BigInt vs number)
- Use BigInt() for BigInt fields

### Missing Imports
```typescript
import { TestHelpers, EntityType } from "generated";
const { MockDb, ContractName, Addresses } = TestHelpers;
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm mocha test/transfers.test.ts

# Watch mode (with nodemon)
pnpm mocha --watch test/
```

## Test Template

```typescript
import assert from "assert";
import { TestHelpers, TokenEntity } from "generated";

const { MockDb, MyContract, Addresses } = TestHelpers;

describe("MyContract Indexer", () => {
  describe("Transfer events", () => {
    it("creates Transfer entity", async () => {
      const mockDb = MockDb.createMockDb();

      const event = MyContract.Transfer.createMockEvent({
        from: Addresses.defaultAddress,
        to: "0x456...",
        value: BigInt(1000),
      });

      const updatedDb = await mockDb.processEvents([event]);

      // Add assertions
    });
  });
});
```
