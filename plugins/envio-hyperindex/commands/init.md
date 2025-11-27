---
description: Initialize a new HyperIndex indexer project with guided setup
argument-hint: [contract-address-or-type]
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, AskUserQuestion, WebSearch
---

Initialize a new Envio HyperIndex indexer project using `envio init` with **non-interactive CLI flags**.

IMPORTANT: The interactive CLI does not work well with agents. Always use the fully-specified command-line flags to avoid interactive prompts.

## Step 1: Gather Required Information

Check $ARGUMENTS for:
- A contract address (starts with `0x`)
- A template name (e.g., `erc20`, `greeter`)

**If NO contract address or template provided:**
1. Ask the user what protocol/contract they want to index
2. If they provide a name (e.g., "Uniswap V2", "Aave V3"), use WebSearch to find the contract address:
   - Search for: "[protocol name] [network] contract address"
   - Example: "Uniswap V2 Factory ethereum mainnet contract address"
3. Ask which network (default: `eth` for Ethereum mainnet)
4. Ask for project directory name (default: `envio-indexer`)

**If contract address IS provided:**
- Proceed directly to Step 2

## Step 2: Initialize with Contract Import (Primary Method)

Use the fully non-interactive command with all flags specified:

```bash
pnpx envio init contract-import explorer \
  -c <CONTRACT_ADDRESS> \
  -b <NETWORK_ID> \
  -n <PROJECT_NAME> \
  -l typescript \
  -d <DIRECTORY_NAME> \
  --single-contract \
  --all-events \
  --api-token ""
```

### Example - Uniswap V2 Factory on Ethereum:
```bash
pnpx envio init contract-import explorer \
  -c 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f \
  -b ethereum-mainnet \
  -n uniswap-v2-indexer \
  -l typescript \
  -d uniswap-v2-indexer \
  --single-contract \
  --all-events \
  --api-token ""
```

### CLI Flag Reference:
| Flag | Description | Required |
|------|-------------|----------|
| `-c, --contract-address` | Contract address to import | Yes |
| `-b, --blockchain` | Network ID (see network list below) | Yes |
| `-n, --name` | Project name | Yes |
| `-l, --language` | Handler language: `typescript`, `javascript`, `rescript` | Yes |
| `-d, --directory` | Output directory for the project | Yes |
| `--single-contract` | Skip prompt for additional contracts | Recommended |
| `--all-events` | Index all events without prompting | Recommended |
| `--api-token` | HyperSync API token (use `""` for public access) | Recommended |

## Step 3: Fallback - Template Initialization

If contract import fails (e.g., unverified contract, network issues), use template initialization:

```bash
pnpx envio init template \
  -t erc20 \
  -n <PROJECT_NAME> \
  -l typescript \
  -d <DIRECTORY_NAME> \
  --api-token ""
```

### Available Templates:
| Template | Description | Use Case |
|----------|-------------|----------|
| `erc20` | ERC20 token transfers | Token tracking, balances |
| `greeter` | Simple example | Learning, testing |

After template init, you'll need to manually update `config.yaml` with the actual contract address and network.

## Step 4: Post-Initialization Setup

After init completes successfully:

```bash
cd <DIRECTORY_NAME>
pnpm install
pnpm codegen
```

## Step 5: Verify Generated Files

Check that these files were created:
- `config.yaml` - Contract addresses, networks, events
- `schema.graphql` - GraphQL entity definitions
- `src/EventHandlers.ts` - Event handler stubs

Read and review each file to understand what was generated.

## Step 6: Start Development

```bash
pnpm dev
```

This starts the indexer locally with hot reload and Hasura GraphQL console.

---

## Network IDs

Use these values for the `-b` / `--blockchain` flag.

### Mainnets
| Network | CLI Value |
|---------|-----------|
| Ethereum | `ethereum-mainnet` |
| Polygon | `polygon` |
| Arbitrum One | `arbitrum-one` |
| Arbitrum Nova | `arbitrum-nova` |
| Optimism | `optimism` |
| Base | `base` |
| Avalanche | `avalanche` |
| BSC | `bsc` |
| Gnosis | `gnosis` |
| Fantom | `fantom` |
| Linea | `linea` |
| Scroll | `scroll` |
| zkSync Era | `zksync-era` |
| Blast | `blast` |
| Mode | `mode` |
| Manta | `manta` |
| Mantle | `mantle` |
| Moonbeam | `moonbeam` |
| Celo | `celo` |
| Aurora | `aurora` |
| Harmony | `harmony` |
| Sonic | `sonic` |
| Berachain | `berachain` |
| Monad | `monad` |
| Abstract | `abstract` |
| Worldchain | `worldchain` |
| Unichain | `unichain` |
| Zora | `zora` |

### Testnets
| Network | CLI Value |
|---------|-----------|
| Sepolia | `sepolia` |
| Holesky | `holesky` |
| Base Sepolia | `base-sepolia` |
| Arbitrum Sepolia | `arbitrum-sepolia` |
| Optimism Sepolia | `optimism-sepolia` |
| Scroll Sepolia | `scroll-sepolia` |
| Linea Sepolia | `linea-sepolia` |
| Blast Sepolia | `blast-sepolia` |
| Mode Sepolia | `mode-sepolia` |
| Monad Testnet | `monad-testnet` |
| Polygon Amoy | `amoy` |

### Full List
Run `pnpx envio init contract-import explorer --help` to see all supported networks.

## Common Contract Addresses

**Ethereum Mainnet:**
- Uniswap V2 Factory: `0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f`
- Uniswap V3 Factory: `0x1F98431c8aD98523631AE4a59f267346ea31F984`
- WETH: `0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2`
- USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- USDT: `0xdAC17F958D2ee523a2206206994597C13D831ec7`
- DAI: `0x6B175474E89094C44Da98b954EescdeCB5BE3bE`

**Polygon:**
- Uniswap V3 Factory: `0x1F98431c8aD98523631AE4a59f267346ea31F984`
- QuickSwap Factory: `0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32`

**Arbitrum:**
- Uniswap V3 Factory: `0x1F98431c8aD98523631AE4a59f267346ea31F984`
- GMX Vault: `0x489ee077994B6658eAfA855C308275EAd8097C4A`

**Base:**
- Uniswap V3 Factory: `0x33128a8fC17869897dcE68Ed026d694621f6FDfD`
- Aerodrome Factory: `0x420DD381b31aEf6683db6B902084cB0FFECe40Da`

**Always verify addresses** with the user or official documentation before indexing.

---

## Troubleshooting

### Contract Import Fails
1. Check if the contract is verified on the block explorer
2. Try using a different block explorer or network
3. Fall back to template init and manually add the ABI

### Network Not Found
- Check the full network list: `pnpx envio init contract-import explorer --help`
- Use the exact CLI value from the list (e.g., `ethereum-mainnet`, `arbitrum-one`)

### ABI Not Available
Use local ABI import instead:
```bash
pnpx envio init contract-import local \
  -a ./path/to/abi.json \
  -c <CONTRACT_ADDRESS> \
  -b <NETWORK_ID> \
  --contract-name <NAME> \
  -n <PROJECT_NAME> \
  -l typescript \
  -d <DIRECTORY_NAME> \
  --single-contract \
  --all-events \
  --api-token ""
```
