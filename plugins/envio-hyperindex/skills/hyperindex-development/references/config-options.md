# HyperIndex Configuration Reference

Complete reference for `config.yaml` options.

## Basic Structure

```yaml
# yaml-language-server: $schema=./node_modules/envio/evm.schema.json
name: indexer-name

# Global options
preload_handlers: true  # Enable preload optimizations
unordered_multichain_mode: true  # For multichain indexing

networks:
  - id: 1  # Chain ID
    start_block: 12345678
    contracts:
      - name: ContractName
        address: 0x...
        handler: src/EventHandlers.ts
        events:
          - event: EventSignature(...)
```

## Network Configuration

### start_block

The `start_block` field specifies where indexing begins.

**With HyperSync (default):** Setting `start_block: 0` is perfectly fine. HyperSync is extremely fast and can sync millions of blocks in minutes, so there's no performance penalty for starting from genesis.

**With RPC:** If using RPC as the data source (for unsupported networks), consider setting `start_block` to the contract deployment block to avoid slow sync times.

```yaml
networks:
  - id: 1
    start_block: 0  # Fine with HyperSync - it's fast!
    contracts:
      - name: MyContract
        address: 0xContractAddress
```

### Single Network

```yaml
networks:
  - id: 1
    start_block: 0
    contracts:
      - name: MyContract
        address: 0xContractAddress
        handler: src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)
```

### Multiple Networks (Multichain)

```yaml
# Global contract definitions
contracts:
  - name: Factory
    handler: src/factory.ts
    events:
      - event: ContractCreated(address indexed contract, address indexed token)

networks:
  - id: 1  # Ethereum
    start_block: 12345678
    contracts:
      - name: Factory
        address:
          - 0xFactoryAddress1
  - id: 10  # Optimism
    start_block: 98765432
    contracts:
      - name: Factory
        address:
          - 0xFactoryAddress2
```

**Important:** When using multichain, define handlers and events in global `contracts` section. Network sections only specify addresses.

## Contract Configuration

### Single Address

```yaml
contracts:
  - name: MyContract
    address: 0xContractAddress
    handler: src/EventHandlers.ts
    events:
      - event: Transfer(...)
```

### Multiple Addresses

```yaml
contracts:
  - name: MyContract
    address:
      - 0xAddress1
      - 0xAddress2
      - 0xAddress3
    handler: src/EventHandlers.ts
    events:
      - event: Transfer(...)
```

### Dynamic Contracts (No Address)

For contracts created by factories, omit the address field:

```yaml
contracts:
  - name: Pair
    handler: src/core.ts
    events:
      - event: Mint(address sender, uint256 amount0, uint256 amount1)
      - event: Burn(address sender, uint256 amount0, uint256 amount1)
```

Register dynamically in handler:

```typescript
Factory.PairCreated.contractRegister(({ event, context }) => {
  context.addPair(event.params.pair);
});
```

## Event Configuration

### Basic Event

```yaml
events:
  - event: Transfer(address indexed from, address indexed to, uint256 value)
```

### With Transaction Fields

```yaml
events:
  - event: Transfer(address indexed from, address indexed to, uint256 value)
    field_selection:
      transaction_fields:
        - hash
        - from
        - to
        - value
```

### With Block Fields

```yaml
events:
  - event: Transfer(...)
    field_selection:
      block_fields:
        - number
        - timestamp
        - hash
```

## Advanced Options

### Preload Handlers

Enable for Effect API usage and performance optimization:

```yaml
preload_handlers: true
```

When enabled:
- Handlers run twice (preload + execution)
- External calls MUST use Effect API
- Use `!context.isPreload` to skip logic during preload

### Unordered Multichain Mode

For multichain indexing without cross-chain ordering:

```yaml
unordered_multichain_mode: true
```

Benefits:
- Faster indexing
- Each chain processes independently

Tradeoffs:
- No guaranteed cross-chain event order
- Use when chains are independent

### Wildcard Indexing

Index by event signature across all addresses:

```yaml
contracts:
  - name: ERC20
    handler: src/erc20.ts
    events:
      - event: Transfer(address indexed from, address indexed to, uint256 value)
    # No address = wildcard indexing
```

## Common Configurations

### DEX Indexer

```yaml
name: dex-indexer
preload_handlers: true
unordered_multichain_mode: true

contracts:
  - name: Factory
    handler: src/factory.ts
    events:
      - event: PairCreated(address indexed token0, address indexed token1, address pair)

  - name: Pair
    handler: src/core.ts
    events:
      - event: Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)
      - event: Mint(address sender, uint256 amount0, uint256 amount1)
      - event: Burn(address sender, uint256 amount0, uint256 amount1)
      - event: Sync(uint112 reserve0, uint112 reserve1)
        field_selection:
          transaction_fields:
            - hash

networks:
  - id: 1
    start_block: 10000835
    contracts:
      - name: Factory
        address: 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f
```

### Token Tracker

```yaml
name: token-tracker

networks:
  - id: 1
    start_block: 12345678
    contracts:
      - name: ERC20
        address:
          - 0xToken1
          - 0xToken2
        handler: src/EventHandlers.ts
        events:
          - event: Transfer(address indexed from, address indexed to, uint256 value)
            field_selection:
              transaction_fields:
                - hash
          - event: Approval(address indexed owner, address indexed spender, uint256 value)
```

## Validation

Use the schema for validation:

```yaml
# yaml-language-server: $schema=./node_modules/envio/evm.schema.json
```

Run codegen to validate:

```bash
pnpm codegen
```
