import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const captureDirectory = path.resolve('..', 'screenshots', `capture-${Date.now()}`);
async function capture(target, name, fullPage = false) {
  if (process.env.CAPTURE_README_SCREENSHOTS !== '1') return;
  fs.mkdirSync(captureDirectory, { recursive: true });
  await target.screenshot({ path: path.join(captureDirectory, name), animations: 'disabled', ...(fullPage ? { fullPage: true } : {}) });
  console.log(`README screenshot: ${path.join(captureDirectory, name)}`);
}

test.describe('HustleHub+ Page Load & Route Smoke Tests', () => {
  test('Landing page loads and displays brand, navigation, and features', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(/HustleHub|Vite/i);
    await expect(page.locator('text=HustleHub+').first()).toBeVisible();
    await expect(page.locator('text=Great work starts')).toBeVisible();
    await expect(page.getByRole('link', { name: /Explore gigs/i })).toBeVisible();
    await capture(page, '01-home.png');
  });

  test('Public gigs browse page displays search bar and navigation', async ({ page }) => {
    await page.goto('/gigs');

await expect(page.getByRole('heading', { name: /Discover work that moves you forward/i })).toBeVisible();
await expect(page.getByLabel(/Search gigs/i)).toBeVisible();
  });

  test('Registration page renders input controls and validation guards', async ({ page }) => {
    await page.goto('/register');

    await expect(page.getByLabel(/Full name/i)).toBeVisible();
    await expect(page.getByLabel(/Email address/i)).toBeVisible();
    await expect(page.getByLabel(/^Password/i)).toBeVisible();
    await expect(page.getByLabel(/Confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Create account/i })).toBeVisible();
  });

  test('Login page renders authentication form', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByLabel(/Email address/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Log in/i })).toBeVisible();
  });

  test('Protected routes redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/client/dashboard');
    await expect(page).toHaveURL(/.*login.*/);

    await page.goto('/freelancer/dashboard');
    await expect(page).toHaveURL(/.*login.*/);

    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/.*login.*/);
  });
});

test.describe('HustleHub+ End-to-End User Journey (Register -> Gig -> Book)', () => {
  const timestamp = Date.now();
  const freelancerEmail = `freelancer_e2e_${timestamp}@hustlehub.test`;
  const clientEmail = `client_e2e_${timestamp}@hustlehub.test`;
  const password = 'Password123!';
  const gigTitle = `Automated Cloud Architecture ${timestamp}`;

  test('Complete platform lifecycle: Freelancer publishes gig, Client books service', async ({ page }) => {
    // 1. Register as Freelancer
    await page.goto('/register');
    await page.getByLabel(/Full name/i).fill('DevOps Engineer');
    await page.getByLabel(/Email address/i).fill(freelancerEmail);
    await page.getByLabel(/^Password/i).fill(password);
    await page.getByLabel(/Confirm password/i).fill(password);
    await page.getByRole('radio', { name: /Offer my skills/i }).check();
    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page.getByText(/Account created successfully|Continue to log in/i)).toBeVisible({ timeout: 10000 });
    await page.goto('/login');

    // 2. Log in as Freelancer
    await page.getByLabel(/Email address/i).fill(freelancerEmail);
    await page.getByLabel(/Password/i).fill(password);
    await page.getByRole('button', { name: /Log in/i }).click();

    await expect(page).toHaveURL(/.*freelancer\/dashboard.*/, { timeout: 10000 });
    await expect(page.getByText(/FREELANCER WORKSPACE/i)).toBeVisible();

    // 3. Create and publish a new Gig
    await page.goto('/freelancer/gigs/create');
    await page.getByLabel(/Gig title \*/i).fill(gigTitle);
    await page.getByLabel(/Description \*/i).fill('End-to-end cloud automation with Docker, Kubernetes and CI/CD pipelines.');
    await page.getByLabel(/Category \*/i).selectOption('Web Development');
    await page.getByLabel(/Price \(ZAR\) \*/i).fill('1850');
    await page.getByLabel(/Skills and expertise/i).fill('Docker, Kubernetes, CI/CD');
    await page.getByRole('button', { name: /Publish gig/i }).click();

    await expect(page).toHaveURL(/.*freelancer\/dashboard.*/, { timeout: 10000 });
    await expect(page.getByText(gigTitle)).toBeVisible({ timeout: 10000 });

    // 4. Log out
    await page.getByRole('button', { name: /Log out/i }).click();
    await expect(page.getByRole('link', { name: /Log in/i })).toBeVisible();

    // 5. Register as Client
    await page.goto('/register');
    await page.getByLabel(/Full name/i).fill('Startup Founder');
    await page.getByLabel(/Email address/i).fill(clientEmail);
    await page.getByLabel(/^Password/i).fill(password);
    await page.getByLabel(/Confirm password/i).fill(password);
    await page.getByRole('radio', { name: /Hire a freelancer/i }).check();
    await page.getByRole('button', { name: /Create account/i }).click();
    await expect(page.getByText(/Account created successfully|Continue to log in/i)).toBeVisible({ timeout: 10000 });

    // 6. Log in as Client
    await page.goto('/login');
    await page.getByLabel(/Email address/i).fill(clientEmail);
    await page.getByLabel(/Password/i).fill(password);
    await page.getByRole('button', { name: /Log in/i }).click();
    await expect(page).toHaveURL(/.*client\/dashboard.*/, { timeout: 10000 });

    // 7. Browse Gigs and book the created gig
    await page.goto('/gigs');
    await expect(page.getByText(gigTitle)).toBeVisible({ timeout: 10000 });
    await capture(page, '02-services.png');
    await page
      .locator('article.gig-card', { hasText: gigTitle })
      .getByRole('link', { name: /View details/i })
      .click();
    await expect(page).toHaveURL(/.*gigs\/[^/]+$/);
    const serviceUrl = page.url();

    await expect(page.getByRole('button', { name: /Book this service/i })).toBeVisible();
    await capture(page, '03-service-details.png', true);
    await page.getByRole('button', { name: /Book this service/i }).click();
    await expect(page.getByText(/Your booking request was submitted successfully/i)).toBeVisible({ timeout: 10000 });

    // 8. Verify booking in Client Dashboard
    await page.goto('/client/dashboard');
    await expect(page.getByText(gigTitle)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Pending', { exact: true })).toBeVisible();
    await capture(page, '04-client-pending.png', true);

    // 9. Assigned freelancer accepts and completes the client's request.
    async function switchAccount(email) {
      await page.getByRole('button', { name: /Log out/i }).click();
      await page.goto('/login');
      await page.getByLabel(/Email address/i).fill(email);
      await page.getByLabel(/Password/i).fill(password);
      await page.getByRole('button', { name: /Log in/i }).click();
      await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 10000 });
    }
    await switchAccount(freelancerEmail);
    const request = page.locator('article.booking-card', { hasText: gigTitle });
    await expect(request.getByText('Pending', { exact: true })).toBeVisible();
    await capture(page.locator('.booking-requests'), '05-freelancer-request.png');
    await request.getByRole('button', { name: 'Accept', exact: true }).click();
    await expect(request.getByText('Accepted', { exact: true })).toBeVisible();
    await request.getByRole('button', { name: 'Mark as Completed', exact: true }).click();
    await expect(request.getByText('Completed', { exact: true })).toBeVisible();
    await expect(page.getByText('1 completed transaction', { exact: true })).toBeVisible();
    await capture(page.locator('.financial-dashboard'), '06-completed-income.png');

    // 10. Completion survives refresh and is visible to the client.
    await switchAccount(clientEmail);

    const bookingStatus = page.locator('.booking-row .booking-status');

    await expect(bookingStatus).toBeVisible();
    await expect(bookingStatus).toHaveText('Completed');

    await page.reload();

    await expect(bookingStatus).toBeVisible();
    await expect(bookingStatus).toHaveText('Completed');
    await capture(page, '07-client-completed.png', true);

    // 11. A second request can be rejected without increasing completed income.
    await page.goto(serviceUrl);
    await page.getByRole('button', { name: /Book this service/i }).click();
    await expect(page.getByRole('status')).toContainText('Your booking request was submitted successfully');
    await switchAccount(freelancerEmail);
    const pendingRequest = page.locator('article.booking-card', { hasText: gigTitle })
      .filter({ has: page.getByText('Pending', { exact: true }) });
    await pendingRequest.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(page.locator('article.booking-card', { hasText: gigTitle })
      .filter({ has: page.getByText('Cancelled', { exact: true }) })).toBeVisible();
    await expect(page.getByText('1 completed transaction', { exact: true })).toBeVisible();
    await capture(page.locator('.booking-requests'), '08-rejected-request.png');
  });
});