# Shadow Memory System

An AI memory management system that maintains awareness of past memories through activation scoring without loading complete memory content into active context.

## Features

- Multi-dimensional similarity computation (embeddings, metadata, summaries)
- Configurable activation thresholds
- Property-based testing for correctness guarantees
- Benchmark integration for performance validation
- Temporal decay and memory lifecycle management

## Project Structure

```
├── src/
│   ├── types/          # Core type definitions
│   ├── interfaces/     # Component interfaces
│   └── index.ts        # Main entry point
├── tests/              # Test files
├── dist/               # Compiled output
└── coverage/           # Test coverage reports
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Development mode
npm run dev
```

## Testing

The project uses Jest for unit testing and fast-check for property-based testing. All property tests run with a minimum of 100 iterations to ensure comprehensive coverage.

## Architecture

The system follows a layered architecture with clear separation between:
- Memory storage and indexing
- Similarity computation
- Activation scoring and ranking
- Memory awareness interface
- Benchmark management