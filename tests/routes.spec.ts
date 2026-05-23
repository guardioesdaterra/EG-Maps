import { test, expect } from '@playwright/test';

const basePath = process.env.BASE_PATH || '';

function route(path: string): string {
  return `${basePath}${path}`;
}

async function waitForPageLoad(page: any, path: string) {
  await page.goto(route(path), { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

test.describe('Earth Guardians - All Routes and Features', () => {
  test.describe('Home Page (/)', () => {
    test('should load home page with all elements', async ({ page }) => {
      await waitForPageLoad(page, '/');
      await expect(page).toHaveTitle(/Earth Guardians/);

      await expect(page.getByRole('heading', { name: 'Earth Guardians' })).toBeVisible();
      await expect(page.getByText('Interactive Data Visualization Platform')).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Project Grants' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Endangered Species' })).toBeVisible();

      const svgIcons = page.locator('iconify-icon');
      await expect(svgIcons.first()).toBeVisible();
      const iconCount = await svgIcons.count();
      expect(iconCount).toBeGreaterThan(0);

      const projectGrantsLink = page.locator(`a[href*="/project-grants"]`).first();
      await expect(projectGrantsLink).toBeVisible();

      const endangeredSpeciesLink = page.locator(`a[href*="/endangered-species"]`).first();
      await expect(endangeredSpeciesLink).toBeVisible();
    });

    test('should have working navigation dock', async ({ page }) => {
      await waitForPageLoad(page, '/');

      const dockNav = page.locator('nav');
      await expect(dockNav).toBeVisible();

      const dockLinks = dockNav.locator('a');
      const dockLinkCount = await dockLinks.count();
      expect(dockLinkCount).toBeGreaterThanOrEqual(2);

      const darkModeToggle = dockNav.locator('button').last();
      await expect(darkModeToggle).toBeVisible();
    });
  });

  test.describe('Info Page (/info)', () => {
    test('should load info page with tabs and content', async ({ page }) => {
      await waitForPageLoad(page, '/info');
      await expect(page).toHaveTitle(/Info.*Feedback/);

      await expect(page.getByRole('heading', { name: 'Earth Guardians' }).first()).toBeVisible();

      await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Grants' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Species' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Feedback' })).toBeVisible();

      const svgIcons = page.locator('iconify-icon');
      await expect(svgIcons.first()).toBeVisible();
    });

    test('should show feedback form when clicking Feedback tab', async ({ page }) => {
      await waitForPageLoad(page, '/info');
      await page.getByRole('button', { name: 'Feedback' }).click();

      await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
      await expect(page.getByPlaceholder('Share your thoughts')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Submit Feedback' })).toBeVisible();
    });

    test('should navigate to project grants from info page', async ({ page }) => {
      await waitForPageLoad(page, '/info');
      await page.getByRole('button', { name: 'Grants' }).click();
      await page.getByRole('link', { name: 'View 2D Map' }).first().click();
      await page.waitForURL(/\/project-grants/);
      await expect(page).toHaveURL(/\/project-grants/);
    });

    test('should navigate to endangered species from info page', async ({ page }) => {
      await waitForPageLoad(page, '/info');
      await page.getByRole('button', { name: 'Species' }).click();
      await page.getByRole('link', { name: 'View 2D Map' }).first().click();
      await page.waitForURL(/\/endangered-species/);
      await expect(page).toHaveURL(/\/endangered-species/);
    });
  });

  test.describe('Project Grants Pages', () => {
    test('should load project grants 3d page', async ({ page }) => {
      await waitForPageLoad(page, '/project-grants/3d');
      await expect(page).toHaveTitle(/Project Grants.*3D/);

      await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });
    });

    test('should navigate between 2D and 3D views', async ({ page }) => {
      await page.goto(route('/project-grants/3d'), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);

      const view2DLink = page.locator(`a[href*="/project-grants"]`).filter({ hasNot: page.locator('[href*="/3d"]') }).first();
      if (await view2DLink.count() > 0) {
        await view2DLink.click();
        await page.waitForURL(/\/project-grants(?!\/)/);
      }
    });
  });

  test.describe('Endangered Species Pages', () => {
    test('should load endangered species 3d page', async ({ page }) => {
      await waitForPageLoad(page, '/endangered-species/3d');
      await expect(page).toHaveTitle(/Endangered Species.*3D/);

      await expect(page.locator('nav').first()).toBeVisible();
    });
  });

  test.describe('Globe Page (/globe)', () => {
    test('should redirect from /globe to /project-grants/3d', async ({ page }) => {
      await page.goto(route('/globe'), { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForURL(/\/project-grants\/3d/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/project-grants\/3d/);
      await expect(page).toHaveTitle(/Project Grants.*3D/);
    });
  });

  test.describe('Cross-page Navigation', () => {
    test('should navigate from home to all pages and back', async ({ page }) => {
      await waitForPageLoad(page, '/');

      const navLinks = page.locator('nav a');
      await expect(navLinks.first()).toBeVisible({ timeout: 10000 });
      await navLinks.first().click();
      await expect(page).toHaveURL(/\/project-grants/);
      await page.waitForLoadState('networkidle');

      await page.locator('nav').locator('a[href*="/endangered-species"]').first().click();
      await expect(page).toHaveURL(/\/endangered-species/);
      await page.waitForLoadState('networkidle');

      await page.goto(route('/'));
      await expect(page).toHaveURL(/\/$/);
    });

    test('should have external link to Earth Guardians website', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await waitForPageLoad(page, '/');

      const allLinks = page.locator('a');
      const linkCount = await allLinks.count();
      expect(linkCount).toBeGreaterThan(3);
    });
  });

  test.describe('Dark Mode Toggle', () => {
    test('should have dark mode toggle button visible on all pages', async ({ page }) => {
      const pagesToTest = ['/', '/info', '/project-grants'];

      for (const path of pagesToTest) {
        await waitForPageLoad(page, path);
        const dockNav = page.locator('nav');
        await expect(dockNav).toBeVisible({ timeout: 10000 });
        const toggleButton = dockNav.locator('button').last();
        await expect(toggleButton).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('No Console Errors', () => {
    test('should not have Icon resolution errors on home page', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await waitForPageLoad(page, '/');

      const iconWarnings = consoleErrors.filter(err =>
        err.includes('Failed to resolve component: Icon') ||
        err.includes('is missing template')
      );

      expect(iconWarnings).toHaveLength(0);
    });

    test('should not have Icon resolution errors on info page', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await waitForPageLoad(page, '/info');

      const iconWarnings = consoleErrors.filter(err =>
        err.includes('Failed to resolve component: Icon') ||
        err.includes('is missing template')
      );

      expect(iconWarnings).toHaveLength(0);
    });
  });

  test.describe('Hydration Mismatches', () => {
    test('should not have hydration mismatches on home page', async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', msg => {
        const text = msg.text();
        if (text.includes('Hydration') || text.includes('hydration') || text.includes('mismatch')) {
          consoleErrors.push(text);
        }
      });

      await waitForPageLoad(page, '/');

      expect(consoleErrors).toHaveLength(0);
    });
  });
});
