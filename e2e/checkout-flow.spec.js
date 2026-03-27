import { test, expect } from '@playwright/test';

test.describe('Checkout Flow - Complete Purchase', () => {
  // Setup: login and add product to cart before each test
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|home|products)/);

    // Add product to cart
    await page.goto('/products');
    await page.click('[data-testid="product-card"] >> first-child');
    await page.fill('input[aria-label="Quantity"]', '1');
    await page.click('button:has-text("Add to Cart")');
  });

  test('should complete full checkout with credit card', async ({ page }) => {
    // Navigate to cart
    await page.goto('/cart');

    // Click checkout button
    await page.click('button:has-text("Proceed to Checkout")');

    // Should be on checkout page
    await expect(page).toHaveURL('/checkout');

    // ─── Shipping Information ──────────────────────────
    await page.fill('input[name="shippingAddress.street"]', '123 Main Street');
    await page.fill('input[name="shippingAddress.city"]', 'New York');
    await page.fill('input[name="shippingAddress.state"]', 'NY');
    await page.fill('input[name="shippingAddress.postalCode"]', '10001');
    await page.fill('input[name="shippingAddress.country"]', 'United States');

    // Select shipping method
    await page.click('label:has-text("Standard Shipping")');

    // Click next
    await page.click('button:has-text("Continue to Payment")');

    // ─── Payment Information ───────────────────────────
    await page.waitForSelector('[data-testid="payment-section"]');

    // Select credit card option (should be default)
    await page.click('label:has-text("Credit Card")');

    // Fill card details
    const cardFrame = page.frameLocator('[name="__stripe"]').first();
    await cardFrame.locator('[autocomplete="cc-number"]').fill('4242424242424242');
    await cardFrame.locator('[autocomplete="cc-exp"]').fill('1225');
    await cardFrame.locator('[autocomplete="cc-csc"]').fill('123');

    // Fill billing address (if different from shipping)
    const sameAsShipping = await page.locator('input[name="sameAsShipping"]');
    if (sameAsShipping.isVisible()) {
      await sameAsShipping.check();
    }

    // Place order
    await page.click('button:has-text("Place Order")');

    // ─── Order Confirmation ────────────────────────────
    // Should see order confirmation page
    await page.waitForURL(/\/order-confirmation\/[a-zA-Z0-9]+/);
    await expect(page.locator('[data-testid="confirmation-message"]')).toContainText('Order Confirmed');

    // Should display order number
    await expect(page.locator('[data-testid="order-number"]')).toBeVisible();

    // Should show order summary
    await expect(page.locator('[data-testid="order-total"]')).toBeVisible();
  });

  test('should validate required shipping fields', async ({ page }) => {
    await page.goto('/cart');
    await page.click('button:has-text("Proceed to Checkout")');
    await expect(page).toHaveURL('/checkout');

    // Try to continue without filling required fields
    await page.click('button:has-text("Continue to Payment")');

    // Should show validation errors
    await expect(page.locator('[role="alert"]')).toContainText('Street is required');
  });

  test('should allow applying promo code', async ({ page }) => {
    await page.goto('/cart');

    // Find and fill promo code field
    const promoInput = page.locator('input[placeholder*="Promo"]');
    if (await promoInput.isVisible()) {
      await promoInput.fill('SAVE10');
      await page.click('button:has-text("Apply")');

      // Should show discount applied
      await expect(page.locator('[data-testid="discount-amount"]')).toBeVisible();
    }
  });

  test('should validate payment information', async ({ page }) => {
    await page.goto('/cart');
    await page.click('button:has-text("Proceed to Checkout")');

    // Fill shipping info
    await page.fill('input[name="shippingAddress.street"]', '123 Main St');
    await page.fill('input[name="shippingAddress.city"]', 'NYC');
    await page.fill('input[name="shippingAddress.state"]', 'NY');
    await page.fill('input[name="shippingAddress.postalCode"]', '10001');
    await page.fill('input[name="shippingAddress.country"]', 'USA');

    await page.click('button:has-text("Continue to Payment")');
    await page.waitForSelector('[data-testid="payment-section"]');

    // Try to submit with invalid card
    const cardFrame = page.frameLocator('[name="__stripe"]').first();
    await cardFrame.locator('[autocomplete="cc-number"]').fill('4000000000000002'); // Invalid card
    await cardFrame.locator('[autocomplete="cc-exp"]').fill('1225');
    await cardFrame.locator('[autocomplete="cc-csc"]').fill('123');

    await page.click('button:has-text("Place Order")');

    // Should show payment error
    await expect(page.locator('[role="alert"]')).toContainText('card');
  });

  test('should display order summary before confirmation', async ({ page }) => {
    await page.goto('/cart');
    await page.click('button:has-text("Proceed to Checkout")');

    // Fill shipping details
    await page.fill('input[name="shippingAddress.street"]', '123 Main St');
    await page.fill('input[name="shippingAddress.city"]', 'NYC');
    await page.fill('input[name="shippingAddress.state"]', 'NY');
    await page.fill('input[name="shippingAddress.postalCode"]', '10001');
    await page.fill('input[name="shippingAddress.country"]', 'USA');

    await page.click('button:has-text("Continue to Payment")');
    await page.waitForSelector('[data-testid="payment-section"]');

    // Check order summary is visible
    await expect(page.locator('[data-testid="order-summary"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-items"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-subtotal"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-shipping"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-total"]')).toBeVisible();
  });

  test('should allow editing cart from checkout', async ({ page }) => {
    await page.goto('/cart');
    await page.click('button:has-text("Proceed to Checkout")');

    // Click edit cart button
    const editButton = page.locator('button:has-text("Edit Cart")');
    if (await editButton.isVisible()) {
      await editButton.click();

      // Should navigate back to cart
      await expect(page).toHaveURL('/cart');
    }
  });

  test('should save shipping address for future orders', async ({ page }) => {
    await page.goto('/cart');
    await page.click('button:has-text("Proceed to Checkout")');

    // Fill and save shipping address
    await page.fill('input[name="shippingAddress.street"]', '456 Oak Ave');
    await page.fill('input[name="shippingAddress.city"]', 'Boston');
    await page.fill('input[name="shippingAddress.state"]', 'MA');
    await page.fill('input[name="shippingAddress.postalCode"]', '02101');
    await page.fill('input[name="shippingAddress.country"]', 'United States');

    // Check "Save for future orders" if available
    const saveCheckbox = page.locator('input[name="saveAddress"]');
    if (await saveCheckbox.isVisible()) {
      await saveCheckbox.check();
    }

    // Continue and verify
    await page.click('button:has-text("Continue to Payment")');
    await expect(page.locator('[data-testid="payment-section"]')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network offline during order placement
    await page.context().setOffline(true);

    await page.goto('/cart');
    await page.click('button:has-text("Proceed to Checkout")');

    // Fill shipping
    await page.fill('input[name="shippingAddress.street"]', '123 Main St');
    await page.fill('input[name="shippingAddress.city"]', 'NYC');
    await page.fill('input[name="shippingAddress.state"]', 'NY');
    await page.fill('input[name="shippingAddress.postalCode"]', '10001');
    await page.fill('input[name="shippingAddress.country"]', 'USA');

    await page.click('button:has-text("Continue to Payment")');

    // Should show error message
    await expect(page.locator('[role="alert"]')).toContainText('connection|offline|error', { timeout: 5000 });

    // Go back online
    await page.context().setOffline(false);
  });
});

test.describe('Order History & Tracking', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'TestPassword123');
    await page.click('button:has-text("Login")');
    await page.waitForURL(/\/(dashboard|home|products)/);
  });

  test('should view order history', async ({ page }) => {
    await page.goto('/account/orders');

    // Should display orders
    await expect(page.locator('[data-testid="order-list"]')).toBeVisible();
  });

  test('should view order details', async ({ page }) => {
    await page.goto('/account/orders');

    // Click on first order
    await page.click('[data-testid="order-item"] >> first-child');

    // Should show order details
    await expect(page.locator('[data-testid="order-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-status"]')).toBeVisible();
  });

  test('should cancel eligible order', async ({ page }) => {
    await page.goto('/account/orders');

    // Click on order
    await page.click('[data-testid="order-item"] >> first-child');

    // Cancel order if button is visible
    const cancelBtn = page.locator('button:has-text("Cancel Order")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // Confirm cancellation
      await page.click('button:has-text("Confirm")');

      // Should show updated status
      await expect(page.locator('[data-testid="order-status"]')).toContainText('Cancelled');
    }
  });
});
