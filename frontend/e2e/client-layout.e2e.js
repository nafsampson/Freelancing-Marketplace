import { test, expect } from '@playwright/test';

// Layout fixture only: real booking behaviour is covered by the separate journey.
for (const width of [1280, 768, 390]) {
    test(`client action buttons align at ${width}px with different title lengths`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(() => {
            localStorage.setItem('token', 'layout-fixture-only');
            localStorage.setItem('user', JSON.stringify({ id: 'client-layout', name: 'Demo Client', role: 'Client' }));
        });
        await page.route('**/api/auth/profile', route => route.fulfill({ json: {
            data: { id: 'client-layout', name: 'Demo Client', role: 'Client' }
        } }));
        await page.route('**/api/bookings', route => route.fulfill({ json: { data: [
            { _id: 'b1', gigId: { _id: 'g1', title: 'Logo design' }, amount: 500, status: 'Pending' },
            { _id: 'b2', gigId: { _id: 'g2', title: 'A complete responsive portfolio website with a detailed brand and accessibility review' }, amount: 15000, status: 'Completed' }
        ] } }));
        await page.goto('/client/dashboard');
        const actions = page.getByRole('link', { name: 'View gig', exact: true });
        await expect(actions).toHaveCount(2);
        const rows = page.locator('.client-dashboard .booking-row');
        const list = await page.locator('.client-dashboard .booking-list').boundingBox();
        const rowBoxes = await rows.evaluateAll(items => items.map(item => {
            const { x, y, width, height } = item.getBoundingClientRect();
            return { x, y, width, height };
        }));
        expect(list).not.toBeNull();
        for (const row of rowBoxes) {
            expect(Math.abs(row.width - list.width)).toBeLessThanOrEqual(1);
            expect(Math.abs(row.x - list.x)).toBeLessThanOrEqual(1);
        }
        expect(rowBoxes[1].y).toBeGreaterThanOrEqual(rowBoxes[0].y + rowBoxes[0].height);
        const titleWidth = await rows.nth(1).locator('.booking-row-main').evaluate(el => el.getBoundingClientRect().width);
        expect(titleWidth).toBeGreaterThanOrEqual(200);
        const first = await actions.nth(0).boundingBox();
        const second = await actions.nth(1).boundingBox();
        expect(first).not.toBeNull();
        expect(second).not.toBeNull();
        expect(Math.abs(first.width - second.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(first.height - second.height)).toBeLessThanOrEqual(1);
        expect(Math.abs(first.x + first.width - second.x - second.width)).toBeLessThanOrEqual(1);
        expect(first.height).toBeGreaterThanOrEqual(44);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
}
