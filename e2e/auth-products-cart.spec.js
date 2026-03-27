import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should register a new user', async ({ page }) => {
    await page.goto('/register');

    // Fill registration form
    await page.fill('input[name="name"]', 'Test User');
    await page.fill('input[name="email"]', `user-${Date.now()}@example.com`);
    await page.fill('input[name="password"]', 'TestPassword123');
    await page.fill('input[name="confirmPassword"]', 'TestPassword123');

    // Submit form
    await page.click('button:has-text("Register")');

    // Should redirect to dashboard or home
    await expect(page).toHaveURL(/\/(dashboard|home|products)/);
  });

  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123');

    // Submit form
    await page.click('button:has-text("Login")');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/(dashboard|home|products)/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    // Submit form
    await page.click('button:has-text("Login")');

    // Should show error message
    await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials');
  });

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|home|products)/);

    // Click logout button
    await page.click('button:has-text("Logout")');

    // Should redirect to login page
    await expect(page).toHaveURL('/login');
  });
});

test.describe('Product Browsing', () => {
  test('should display products on homepage', async ({ page }) => {
    await page.goto('/');

    // Wait for products to load
    await page.waitForSelector('[data-testid="product-card"]');

    // Should see products
    const products = await page.locator('[data-testid="product-card"]').count();
    expect(products).toBeGreaterThan(0);
  });

  test('should filter products by category', async ({ page }) => {
    await page.goto('/products');

    // Click on category filter (assuming there's a Electronics category)
    await page.click('text=Electronics');

    // Should filter products
    await page.waitForSelector('[data-testid="product-card"]');
    const products = await page.locator('[data-testid="product-card"]');
    expect(await products.count()).toBeGreaterThan(0);
  });

  test('should navigate to product details page', async ({ page }) => {
    await page.goto('/products');

    // Click on first product
    await page.click('[data-testid="product-card"] >> first-child');

    // Should be on product detail page
    await expect(page).toHaveURL(/\/products\/[a-zA-Z0-9]+/);

    // Should display product details
    await page.waitForSelector('[data-testid="product-title"]');
    await expect(page.locator('[data-testid="product-price"]')).toBeVisible();
  });

  test('should display product reviews', async ({ page }) => {
    await page.goto('/products');

    // Click on first product
    await page.click('[data-testid="product-card"] >> first-child');

    // Should see reviews section
    await page.waitForSelector('[data-testid="reviews-section"]');
    await expect(page.locator('[data-testid="reviews-section"]')).toBeVisible();
  });
});

test.describe('Shopping Cart', () => {
  test('should add product to cart', async ({ page }) => {
    await page.goto('/products');

    // Click on first product
    await page.click('[data-testid="product-card"] >> first-child');
    await page.waitForURL(/\/products\/[a-zA-Z0-9]+/);

    // Set quantity
    await page.fill('input[aria-label="Quantity"]', '2');

    // Click add to cart button
    await page.click('button:has-text("Add to Cart")');

    // Should show success message
    await expect(page.locator('[role="alert"]')).toContainText('Added to cart');
  });

  test('should view cart contents', async ({ page }) => {
    // Add product to cart first
    await page.goto('/products');
    await page.click('[data-testid="product-card"] >> first-child');
    await page.fill('input[aria-label="Quantity"]', '1');
    await page.click('button:has-text("Add to Cart")');
    await page.waitForTimeout(1000);

    // Navigate to cart
    await page.click('[data-testid="cart-link"]');

    // Should display cart items
    await expect(page.locator('[data-testid="cart-item"]')).toBeVisible();
  });

  test('should update cart item quantity', async ({ page }) => {
    // Add product and go to cart
    await page.goto('/products');
    await page.click('[data-testid="product-card"] >> first-child');
    await page.fill('input[aria-label="Quantity"]', '1');
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-link"]');

    // Update quantity
    await page.fill('[data-testid="quantity-input"]', '3');

    // Should update quantity
    await expect(page.locator('[data-testid="quantity-input"]')).toHaveValue('3');
  });

  test('should remove item from cart', async ({ page }) => {
    // Add product and go to cart
    await page.goto('/products');
    await page.click('[data-testid="product-card"] >> first-child');
    await page.fill('input[aria-label="Quantity"]', '1');
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-link"]');

    const initialCount = await page.locator('[data-testid="cart-item"]').count();

    // Remove item
    await page.click('button:has-text("Remove") >> first');

    // Should remove from cart
    const updatedCount = await page.locator('[data-testid="cart-item"]').count();
    expect(updatedCount).toBeLessThan(initialCount);
  });

  test('should display cart summary', async ({ page }) => {
    // Add product and go to cart
    await page.goto('/products');
    await page.click('[data-testid="product-card"] >> first-child');
    await page.fill('input[aria-label="Quantity"]', '2');
    await page.click('button:has-text("Add to Cart")');
    await page.click('[data-testid="cart-link"]');

    // Should show cart summary
    await expect(page.locator('[data-testid="cart-subtotal"]')).toBeVisible();
    await expect(page.locator('[data-testid="cart-tax"]')).toBeVisible();
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
  });
});
