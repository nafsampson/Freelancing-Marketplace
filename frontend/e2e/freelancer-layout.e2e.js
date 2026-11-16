import { test, expect } from '@playwright/test';

for (const width of [1280, 390]) {
    test(`freelancer finance spacing and action sizes at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(() => {
            localStorage.setItem('token', 'layout-fixture-only');
            localStorage.setItem('user', JSON.stringify({ id: 'f-layout', name: 'Demo Studio', role: 'Freelancer' }));
        });
        await page.route('**/api/auth/profile', route => route.fulfill({ json: {
            data: { id: 'f-layout', name: 'Demo Studio', role: 'Freelancer' }
        } }));
        await page.route('**/api/gigs', route => route.fulfill({ json: { data: [{
            id: 'g-layout', title: 'Responsive website development', description: 'A detailed, responsive website for your next project.',
            category: 'Web Development', price: 10000, freelancer: { id: 'f-layout' }
        }] } }));
        await page.route('**/api/bookings', route => route.fulfill({ json: { data: [] } }));
        await page.route('**/api/transactions/income', route => route.fulfill({ json: { data: {
            taxYear: 2027, totalIncome: 0, estimatedTax: 0, incomeAfterTax: 0, transactionCount: 0
        } } }));
        await page.goto('/freelancer/dashboard');
        await expect(page.getByRole('heading', { name: 'Your income and tax summary' })).toBeVisible();
        const panel = await page.locator('.financial-dashboard').boundingBox();
        const heading = await page.locator('.financial-heading').boundingBox();
        const label = await page.locator('.financial-heading .hero-label').boundingBox();
        const title = await page.locator('.financial-heading h2').boundingBox();
        expect(heading.x - panel.x).toBeGreaterThanOrEqual(16);
        expect(heading.y - panel.y).toBeGreaterThanOrEqual(18);
        expect(title.y - label.y - label.height).toBeGreaterThanOrEqual(10);
        const actions = page.locator('.freelancer-gig-links').first().locator('a, button');
        await expect(actions).toHaveCount(3);
        const boxes = await Promise.all([0, 1, 2].map(i => actions.nth(i).boundingBox()));
        for (const box of boxes) {
            expect(box.height).toBeGreaterThanOrEqual(44);
            expect(Math.abs(box.height - boxes[0].height)).toBeLessThanOrEqual(1);
            expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(1);
            expect(Math.abs(box.y - boxes[0].y)).toBeLessThanOrEqual(1);
        }
    });
}
