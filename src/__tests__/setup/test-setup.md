# Unit Test Setup Guide

## Prerequisites
```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @vitest/ui
npm install --save-dev @testing-library/user-event msw
```

## Test Database Setup

### Option 1: In-Memory SQLite (Recommended for CI)
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup/setup.ts'],
    globals: true,
  },
});
```

### Option 2: Docker PostgreSQL (Recommended for Local)
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: melodia_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - '5433:5432'
```

## Test Environment Variables
```env
# .env.test
DATABASE_URL=postgresql://test:test@localhost:5433/melodia_test
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Running Tests

### All Tests
```bash
npm run test
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage
```bash
npm run test:coverage
```

### UI Mode
```bash
npm run test:ui
```

## Test Structure

```
src/__tests__/
├── setup/
│   ├── setup.ts              # Global test setup
│   ├── db-setup.ts           # Database test utilities
│   └── test-setup.md         # This file
├── unit/
│   ├── api/                  # API route tests
│   ├── services/             # Service layer tests
│   └── components/           # Component tests
├── integration/              # Integration tests
└── e2e/                      # End-to-end tests
```

## Mock Data Factory

```typescript
// src/__tests__/setup/factories.ts
export const createMockLyricsDraft = (overrides = {}) => ({
  id: 1,
  song_request_id: 1,
  version: 1,
  original_version_id: null,
  generated_text: 'Mock lyrics',
  customer_lyrics: 'Mock customer lyrics',
  song_title: 'Mock Song',
  music_style: 'Pop',
  status: 'draft',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockSongRequest = (overrides = {}) => ({
  id: 1,
  recipient_details: 'John, my friend',
  languages: 'English',
  selected_lyrics_draft_id: null,
  package_id: 1,
  ...overrides,
});
```

## Test Utilities

```typescript
// src/__tests__/setup/test-utils.tsx
import { render } from '@testing-library/react';

export const renderWithProviders = (component: React.ReactElement) => {
  // Add providers (toast, etc.) as needed
  return render(component);
};
```

## Running Specific Test Suite

```bash
# Run only lyrics version tests
npm run test -- lyrics-versions

# Run only API tests
npm run test -- api

# Run only component tests
npm run test -- components
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run migration
        run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}

      - name: Run tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Next Steps

1. **Install dependencies** (see Prerequisites)
2. **Set up test database** (see Test Database Setup)
3. **Run migration**: `npm run db:migrate`
4. **Implement test utilities** (see Mock Data Factory)
5. **Run placeholder tests**: `npm run test`
6. **Replace placeholders** with actual test implementations
7. **Achieve >80% coverage** before production deployment




