# DAO Treasury - Sui Blockchain Demo

A comprehensive decentralized autonomous organization (DAO) treasury application built on the Sui blockchain, featuring transparent fund management with proposal-based voting mechanisms.

## Overview

This project demonstrates a full-stack DAO treasury implementation consisting of:

* **Smart Contract**: Move-based treasury contract on Sui blockchain with robust voting mechanisms
* **Frontend Interface**: React-based web application for interacting with the treasury
* **Comprehensive Testing**: Extensive test suite covering edge cases and security scenarios

The DAO treasury enables transparent management of shared funds through a democratic proposal and voting system, where members can create spending proposals, vote on them, and execute approved proposals.

## Architecture

### Project Structure

```
sui-demo/
├── dao_treasury/                 # Move smart contract
│   ├── sources/
│   │   └── dao_treasury.move    # Main treasury contract
│   ├── tests/
│   │   └── dao_treasury_tests.move # Comprehensive test suite
│   ├── Move.toml                # Move package configuration
│   └── Move.lock                # Move dependencies lock file
├── dao-frontend/                # React frontend application
│   ├── src/
│   │   ├── components/          # React components
│   │   │   ├── TreasuryManager.tsx
│   │   │   ├── DAOTreasuryInterface.tsx
│   │   │   ├── WalletConnection.tsx
│   │   │   └── ProposalTimeline.tsx
│   │   ├── hooks/
│   │   │   └── useTreasury.ts   # Custom React hook for treasury operations
│   │   ├── utils/
│   │   │   └── suiUtils.ts      # Utility functions for Sui interactions
│   │   └── App.tsx              # Main application component
│   ├── package.json             # Node.js dependencies
│   ├── tsconfig.json            # TypeScript configuration
│   └── tailwind.config.js       # Tailwind CSS configuration
└── README.md                    # This file
```

### Smart Contract Architecture

The DAO treasury smart contract (`dao_treasury.move`) implements:

#### Core Data Structures
- **Treasury**: Main object containing balance, members, and proposals
- **Proposal**: Individual spending proposals with voting data
- **AdminCap**: Administrative capability for member management

#### Key Features
- **Member Management**: Add/remove DAO members with administrative controls
- **Proposal System**: Create, vote on, and execute spending proposals
- **Voting Mechanics**: 51% approval threshold with 33% minimum quorum
- **Security Features**: Race condition protection, arithmetic overflow prevention, double-voting prevention
- **Time-based Voting**: 7-day voting periods with automatic finalization

#### Security Considerations
- **Access Control**: Only members can create proposals and vote
- **Fund Safety**: Proposals cannot exceed available treasury balance
- **Anti-manipulation**: Prevents double voting and ensures proper quorum
- **Administrative Safeguards**: Cannot remove the last member to prevent DAO lockout

### Frontend Architecture

The React frontend provides a user-friendly interface built with:

#### Technology Stack
- **React 19**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first CSS framework
- **Sui dApp Kit**: Official Sui blockchain integration
- **Lucide React**: Modern icon library

#### Key Components
- **TreasuryManager**: Main dashboard for selecting/creating treasuries
- **DAOTreasuryInterface**: Core interface for treasury operations
- **WalletConnection**: Wallet integration and connection management
- **ProposalTimeline**: Visual timeline of proposal activities

## Prerequisites

Before setting up the project, ensure you have:

### System Requirements (macOS)
- **Node.js**: Version 16 or higher
- **npm**: Version 8 or higher (comes with Node.js)
- **Sui CLI**: Latest version for Move development
- **Git**: For version control

### Installation Commands

```bash
# Install Node.js (using Homebrew)
brew install node

# Install Sui CLI
brew install sui

# Verify installations
node --version
npm --version
sui --version
```

## Setup Instructions

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sui-demo
```

### 2. Smart Contract Setup

```bash
# Navigate to the Move project
cd dao_treasury

# Build the Move contract
sui move build

# Run tests to verify everything works
sui move test

# Publish to Sui testnet (optional)
sui client publish --gas-budget 50000000
```

### 3. Frontend Setup

```bash
# Navigate to the frontend directory
cd ../dao-frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will be available at `http://localhost:3000`.

### 4. Configuration

Update the package ID in the frontend configuration:

1. After publishing the contract, note the package ID
2. Update `PACKAGE_ID` in `dao-frontend/src/utils/suiUtils.ts`
3. Restart the frontend application

## Usage Guide

### 1. Connect Your Wallet

1. Open the application in your browser
2. Click "Connect Wallet" to connect your Sui wallet
3. Ensure you're connected to Sui testnet

### 2. Create or Select a Treasury

#### Creating a New Treasury
1. Click "Create New Treasury" on the main dashboard
2. Confirm the transaction in your wallet
3. Wait for the transaction to complete

#### Selecting an Existing Treasury
1. Browse available treasuries on the dashboard
2. Click "Select" on the treasury you want to interact with
3. Or use "Search Treasury by ID" if you know the specific treasury ID

### 3. Treasury Operations

#### Deposit Funds
1. Click "Deposit Funds" in the treasury interface
2. Enter the amount of SUI to deposit
3. Confirm the transaction

#### Create a Proposal
1. Click "Create Proposal" (only available to DAO members)
2. Fill in the proposal details:
   - **Title**: Brief description of the proposal
   - **Description**: Detailed explanation
   - **Amount**: SUI amount to transfer
   - **Recipient**: Address to receive the funds
3. Submit the proposal

#### Vote on Proposals
1. View active proposals in the proposals section
2. Click "Yes" or "No" to cast your vote
3. Confirm the transaction

#### Execute Proposals
1. Once a proposal passes (>51% approval with >33% quorum), it can be executed
2. Click "Execute" on passed proposals
3. Funds will be transferred to the specified recipient

### 4. Member Management

Treasury administrators can manage DAO membership:

#### Add Members
```typescript
// Using the admin capability
dao_treasury::add_member(&mut treasury, &admin_cap, new_member_address, ctx);
```

#### Remove Members
```typescript
// Using the admin capability (cannot remove last member)
dao_treasury::remove_member(&mut treasury, &admin_cap, member_address, ctx);
```

## Development

### Running Tests

#### Smart Contract Tests
```bash
cd dao_treasury
sui move test
```

The test suite covers:
- Basic treasury operations
- Proposal creation and voting
- Edge cases and error conditions
- Security scenarios
- Race condition prevention

#### Frontend Development
```bash
cd dao-frontend

# Start development server with hot reload
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Code Structure

#### Smart Contract Constants
- **Voting Period**: 7 days (604,800,000 milliseconds)
- **Approval Threshold**: 51% of votes cast
- **Minimum Quorum**: 33% of total members

#### Frontend Configuration
- **Network**: Sui testnet by default
- **Package ID**: Configured in `suiUtils.ts`
- **Gas Budget**: Automatically managed by dApp Kit

## API Reference

### Smart Contract Functions

#### Public Functions
- `create_treasury()`: Initialize a new treasury
- `add_member()`: Add a member to the DAO (admin only)
- `remove_member()`: Remove a member from the DAO (admin only)
- `deposit_funds()`: Deposit SUI into the treasury
- `create_proposal()`: Create a new spending proposal (members only)
- `vote_on_proposal()`: Vote on an active proposal (members only)
- `execute_proposal()`: Execute a passed proposal

#### View Functions
- `get_balance()`: Get current treasury balance
- `get_members()`: Get list of DAO members
- `get_proposal_count()`: Get total number of proposals
- `get_proposal()`: Get details of a specific proposal

### Frontend Hooks

#### useTreasury Hook
```typescript
const {
  balance,
  proposals,
  members,
  isLoading,
  error,
  refreshData,
  createProposalTx,
  voteOnProposalTx,
  executeProposalTx
} = useTreasury(treasuryId);
```

## Security Features

### Smart Contract Security
- **Access Control**: Role-based permissions for all operations
- **Input Validation**: Comprehensive validation of all inputs
- **Arithmetic Safety**: Overflow protection in calculations
- **Race Condition Prevention**: Status checks before execution
- **Reentrancy Protection**: State updates before external calls

### Frontend Security
- **Wallet Integration**: Secure connection through official Sui dApp Kit
- **Transaction Verification**: All transactions signed by user wallet
- **Input Sanitization**: Proper validation of user inputs
- **Error Handling**: Comprehensive error handling and user feedback

## Troubleshooting

### Common Issues

#### Contract Build Errors
```bash
# Ensure Sui CLI is up to date
sui --version

# Clean and rebuild
sui move clean
sui move build
```

#### Frontend Connection Issues
1. Ensure wallet is connected to Sui testnet
2. Check that the package ID is correctly configured
3. Verify sufficient gas balance for transactions

#### Transaction Failures
- **Insufficient Gas**: Ensure wallet has enough SUI for gas fees
- **Network Issues**: Check testnet connectivity
- **Permission Errors**: Verify you're a DAO member for restricted operations

### Getting Help

- **Sui Documentation**: [https://docs.sui.io/](https://docs.sui.io/)
- **Move Language**: [https://move-language.github.io/move/](https://move-language.github.io/move/)
- **React Documentation**: [https://react.dev/](https://react.dev/)

## Contract Information

- **Network**: Sui Testnet
- **Package ID**: `0x0ae29b6c03c9151219c92a18e34561b47493f384ec479aa47bcc988ca7b40952`
- **Module**: `dao_treasury`
- **Framework Version**: Sui 2024.beta

## License

This project is for demonstration purposes. Please review and modify security settings before any production use.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Future Enhancements

Potential improvements for production use:
- **Multi-token Support**: Support for various token types beyond SUI
- **Advanced Voting**: Weighted voting based on stake or contribution
- **Proposal Categories**: Different types of proposals with varying requirements
- **Time-locks**: Additional security with time-locked executions
- **Governance Token**: Integration with governance tokens for voting rights
- **Proposal Templates**: Predefined templates for common proposal types