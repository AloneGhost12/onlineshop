# E2E Testing Guide - Playwright

## Overview

End-to-end (E2E) tests validate complete user journeys through the application, ensuring critical flows like checkout work correctly across different browsers.

## Setup

### Installation

Playwright is already added to `frontend/package.json`:

```bash
npm install --save-dev @playwright/test
```

This installs test runner and browsers (Chromium, Firefox, WebKit).

### Configuration

**File**: `frontend/playwright.config.js`

```javascript
export default defineConfig({
  testDir: './e2e',
  baseURL: 'http://localhost:3000',
  workers: 1, // Serial execution
  retries: 2, // Retry failed tests
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] },
    { name: 'firefox', use: devices['Desktop Firefox'] },
    { name: 'webkit', use: devices['Desktop Safari'] },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
```

## Test Files

### 1. Authentication & Product Browsing (`auth-products-cart.spec.js`)

Tests covering:
- User registration
- User login/logout
- Product browsing
- Product filtering by category
- Product detail pages
- Reviews viewing
- Shopping cart operations

**Key Tests**:
- ✅ Register new user
- ✅ Login with valid credentials
- ✅ Error handling for invalid credentials
- ✅ Logout flow
- ✅ Product filtering
- ✅ Add to cart
- ✅ Update cart quantity
- ✅ Remove from cart
- ✅ View cart summary

### 2. Checkout Flow (`checkout-flow.spec.js`)

Critical revenue-impacting tests:
- Complete checkout with credit card
- Shipping information validation
- Payment processing
- Order confirmation
- Promo code application
- Order history & tracking
- Order cancellation

**Key Tests**:
- ✅ Complete purchase flow
- ✅ Shipping validation
- ✅ Payment validation
- ✅ Promo code application
- ✅ Order summary display
- ✅ Network error handling
- ✅ Order history retrieval
- ✅ Order cancellation

## Running Tests

### All Tests (All Browsers)

```bash
npm run test:e2e
```

Runs tests in parallel across Chromium, Firefox, WebKit.

### Specific Test File

```bash
npm run test:e2e -- e2e/checkout-flow.spec.js
```

### Specific Test Case

```bash
npm run test:e2e -- -g "should complete full checkout"
```

### Interactive UI Mode

```bash
npm run test:e2e:ui
```

Opens Playwright UI browser for visual debugging.

### Debug Mode

```bash
npm run test:e2e:debug
```

Launches Inspector for step-by-step debugging.

### Single Browser

```bash
npx playwright test --project=chromium
```

### With HTML Report

```bash
npm run test:e2e
npx playwright show-report
```

Opens interactive HTML report with videos and screenshots.

## Test Structure

### Setup & Teardown

```javascript
test.beforeEach(async ({ page }) => {
  // Login before each test
  await page.goto('/login');
  // ... login steps ...
});

test.afterEach(async ({ page }) => {
  // Cleanup after each test
  await page.close();
});
```

### Page Object Model (Recommended for Larger Suites)

```javascript
// pages/LoginPage.js
export class LoginPage {
  constructor(page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email, password) {
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button:has-text("Login")');
  }
}

// In test file:
import { LoginPage } from '../pages/LoginPage';

test('should login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('test@example.com', 'password');
});
```

## Best Practices

### 1. **Use Data Attributes for Selection**

```html
<!-- In component -->
<button data-testid="add-to-cart">Add to Cart</button>

<!-- In test -->
await page.click('[data-testid="add-to-cart"]');
```

Much more reliable than text selectors.

### 2. **Wait for Elements**

```javascript
// ❌ Bad - can fail with timing issues
await page.click('button');

// ✅ Good - waits for element
await page.waitForSelector('[data-testid="product-card"]');
await page.click('[data-testid="product-card"]');

// ✅ Better - waits automatically
await page.locator('[data-testid="add-to-cart"]').click();
```

### 3. **Use Meaningful Assertions**

```javascript
// ❌ Weak
expect(await page.locator('h1').count()).toBeGreaterThan(0);

// ✅ Strong
await expect(page.locator('[data-testid="product-title"]')).toBeVisible();
await expect(page.locator('[data-testid="price"]')).toHaveText('$99.99');
```

### 4. **Avoid Flaky Tests**

```javascript
// ❌ Flaky - hard-coded waits
await page.wait Timeout(2000);

// ✅ Reliable - waits for condition
await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();

// ✅ With timeout override
await expect(page.locator('[data-testid="slow-element"]')).toBeVisible({
  timeout: 10000
});
```

### 5. **Test Real User Behavior**

```javascript
// ✅ Simulate actual user interactions
await page.click('[data-testid="add-to-cart"]');
await page.fill('[name="quantity"]', '2');
await page.click('[data-testid="confirm"]');

// Rather than:
// ❌ Direct API calls (doesn't test UI)
```

### 6. **Use Test Fixtures**

```javascript
const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    // Setup: login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.click('button:has-text("Login")');
    
    // Use the page
    await use(page);
    
    // Teardown: logout
    await page.click('[data-testid="logout"]');
  },
});

test('should view orders', async ({ authenticatedPage: page }) => {
  await page.goto('/orders');
  // ...
});
```

## Debugging

### Screenshot on Failure

```javascript
test('checkout', async ({ page }) => {
  try {
    // test code
  } catch (error) {
    await page.screenshot({ path: 'failure.png' });
    throw error;
  }
});
```

Configured in `playwright.config.js`:
```javascript
use: {
  screenshot: 'only-on-failure',
}
```

### Video Recording

```javascript
use: {
  video: 'retain-on-failure',
}
```

Videos saved to `test-results/` directory.

### Debug Mode

```bash
npm run test:e2e:debug
```

Launches Inspector for step-by-step execution with DOM snapshot.

### Trace Viewer

```javascript
use: {
  trace: 'on-first-retry',
}
```

Captures full trace (network, DOM, screenshots, etc.) on first retry.

```bash
npx playwright show-trace test-results/trace.zip
```

## CI Integration

### GitHub Actions

Add to `.github/workflows/ci.yml`:

```yaml
- name: Install dependencies
  run: npm ci

- name: Install Playwright browsers
  run: npx playwright install --with-deps

- name: Run E2E tests
  run: npm run test:e2e
  env:
    BASE_URL: http://localhost:3000

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 30
```

### Environment Variables

```bash
# Custom base URL for staging/production
BASE_URL=https://staging.example.com npm run test:e2e

# Parallel workers
npx playwright test --workers=4

# Specific browser
npx playwright test --project=chromium
```

## Maintenance

### Update Locators

When UI changes, update selectors:

```javascript
// Before refactor
await page.click('button:nth-child(3)');

// After refactor - use data-testid
await page.click('[data-testid="checkout-button"]');
```

### Add Tests for Bug Fixes

When fixing a bug, add test to prevent regression:

```javascript
test('should not allow negative quantity (bug fix #123)', async ({ page }) => {
  await page.fill('[name="quantity"]', '-5');
  await expect(page.locator('[role="alert"]')).toContainText('positive');
});
```

### Archive Tests

Move infrequently-run tests:

```
e2e/
├── critical/          # Run on every PR
│   ├── checkout-flow.spec.js
│   └── auth.spec.js
├── smoke/            # Run nightly
│   └── basic-navigation.spec.js
└── archived/         # Manual runs
    └── legacy-flows.spec.js
```

## Performance Tips

1. **Minimize test scope** - Test one thing per test
2. **Reduce database setup** - Use API endpoints where possible
3. **Parallel execution** - Use workers (default in CI)
4. **Headless mode** - Faster in CI (automatic)
5. **Reuse browser context** - Share login across tests in suite

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices Guide](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-page)

## Troubleshooting

### Tests timeout

**Solution**: Increase timeout in config or individual test:
```javascript
test.setTimeout(60000); // 60 seconds
```

### Flaky selector behavior

**Solution**: Use `data-testid` attributes
```html
<button data-testid="submit">Submit</button>
```

### Port already in use

**Solution**: Kill existing process
```bash
lsof -i :3000
kill -9 <PID>
```

### Browser crashes in CI

**Solution**: Use `--with-deps` flag
```bash
npx playwright install --with-deps
```

## Next Steps

1. ✅ Run tests locally: `npm run test:e2e`
2. ✅ View report: `npx playwright show-report`
3. ✅ Debug failing test: `npm run test:e2e:debug`
4. ✅ Add more test cases for edge cases
5. ✅ Integrate into CI pipeline (automatic on PR)
6. ✅ Monitor test flakiness with reports
