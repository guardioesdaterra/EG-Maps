import { test, expect } from '@playwright/test';

const basePath = process.env.BASE_PATH || '';

function route(path: string): string {
  return `${basePath}${path}`;
}

test.describe('Earth Guardians - All Routes and Features', () => {
  test.describe('Home Page (/)', () => {
    test('should load home page with all elements', async ({ page }) => {
      await page.goto(route('/'));
      await expect(page).toHaveTitle(/Earth Guardians/);

      await expect(page.getByText('Earth Guardians', { exact: true })).toBeVisible();
      await expect(page.getByText('Interactive Data Visualization Platform')).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Project Grants' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Endangered Species' })).toBeVisible();

      const svgIcons = page.locator('iconify-icon');
      await expect(svgIcons.first()).toBeVisible();
      const iconCount = await svgIcons.count();
      expect(iconCount).toBeGreaterThan(0);

      const projectGrantsLink = page.locator(`a[href="${route('/project-grants')}"]`).first();
      await expect(projectGrantsLink).toBeVisible();

      const endangeredSpeciesLink = page.locator(`a[href="${route('/endangered-species')}"]`).first();
      await expect(endangeredSpeciesLink).toBeVisible();
    });

    test('should have working navigation dock', async ({ page }) => {
      await page.goto(route('/'));

      const dockNav = page.locator('nav.fixed');
      await expect(dockNav).toBeVisible();

      await expect(page.locator(`nav a[href="${route('/info')}"]`).first()).toBeVisible();
      await expect(page.locator(`nav a[href="${route('/project-grants')}"]`).first()).toBeVisible();
      await expect(page.locator(`nav a[href="${route('/endangered-species')}"]`).first()).toBeVisible();
      await expect(page.locator('nav a[href="https://www.earthguardians.org/crews"]').first()).toBeVisible();

      const darkModeToggle = page.locator('nav button').first();
      await expect(darkModeToggle).toBeVisible();
    });
  });

  test.describe('Info Page (/info)', () => {
    test('should load info page with feedback form', async ({ page }) => {
      await page.goto(route('/info'));
      await expect(page).toHaveTitle(/Info.*Feedback/);

      await expect(page.locator('h1 span').first()).toBeVisible();

      await expect(page.getByRole('heading', { name: 'Project Grants' }).first()).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Endangered Species' }).first()).toBeVisible();

      const svgIcons = page.locator('iconify-icon');
      await expect(svgIcons.first()).toBeVisible();

      await expect(page.getByText('Feedback', { exact: true })).toBeVisible();
      await expect(page.getByPlaceholder('Enter your name')).toBeVisible();
      await expect(page.getByPlaceholder('Share your thoughts')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Submit Feedback' })).toBeVisible();

      await expect(page.getByText('Want to Make a Difference?')).toBeVisible();
      await expect(page.locator('a[href="https://www.earthguardians.org/crews"]').first()).toBeVisible();
    });

    test('should navigate to project grants from info page', async ({ page }) => {
      await page.goto(route('/info'));
      await page.getByRole('link', { name: 'View 2D Map' }).first().click();
      await page.waitForURL(/\/project-grants/);
      await expect(page).toHaveURL(/\/project-grants/);
    });

    test('should navigate to endangered species from info page', async ({ page }) => {
      await page.goto(route('/info'));
      const speciesLinks = page.getByRole('link', { name: 'View 2D Map' });
      await speciesLinks.nth(1).click();
      await page.waitForURL(/\/endangered-species/);
      await expect(page).toHaveURL(/\/endangered-species/);
    });
  });

  test.describe('Project Grants Pages', () => {
    test('should load project grants index page', async ({ page }) => {
      await page.goto(route('/project-grants'));
      await expect(page).toHaveTitle(/Project Grants/);

      await page.waitForSelector('nav', { state: 'visible', timeout: 20000 });

      await expect(page.locator('nav').first()).toBeVisible();

      const svgIcons = page.locator('iconify-icon');
      const iconCount = await svgIcons.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('should load project grants 3d page', async ({ page }) => {
      await page.goto(route('/project-grants/3d'));
      await expect(page).toHaveTitle(/Project Grants.*3D/);

      await expect(page.locator('nav').first()).toBeVisible({ timeout: 15000 });
    });

    test('should navigate between 2D and 3D views', async ({ page }) => {
      await page.goto(route('/project-grants'));
      await page.waitForSelector('nav', { state: 'visible', timeout: 20000 });

      const view3DLink = page.locator(`a[href="${route('/project-grants/3d')}"]`);
      if (await view3DLink.count() > 0) {
        await view3DLink.first().click();
        await expect(page).toHaveURL(/\/project-grants\/3d/);
      }
    });
  });

  test.describe('Endangered Species Pages', () => {
    test('should load endangered species index page', async ({ page }) => {
      await page.goto(route('/endangered-species'));

      await page.waitForSelector('nav', { state: 'visible', timeout: 20000 });

      await expect(page.locator('nav').first()).toBeVisible();

      const svgIcons = page.locator('iconify-icon');
      const iconCount = await svgIcons.count();
      expect(iconCount).toBeGreaterThan(0);
    });

    test('should load endangered species 3d page', async ({ page }) => {
      await page.goto(route('/endangered-species/3d'));

      await page.waitForSelector('nav', { state: 'visible', timeout: 20000 });

      await expect(page.locator('nav').first()).toBeVisible();
    });
  });

  test.describe('Globe Page (/globe)', () => {
    test('should load globe page', async ({ page }) => {
      await page.goto(route('/globe'));
      await expect(page).toHaveTitle(/Globe/);

      await expect(page.locator('nav').first()).toBeVisible();
    });
  });

  test.describe('Cross-page Navigation', () => {
    test('should navigate from home to all pages and back', async ({ page }) => {
      await page.goto(route('/'));

      await page.locator(`nav a[href="${route('/info')}"]`).first().click();
      await expect(page).toHaveURL(/\/info/);

      await page.waitForSelector('nav', { state: 'visible', timeout: 15000 });

      await page.locator(`nav a[href="${route('/project-grants')}"]`).first().click();
      await expect(page).toHaveURL(/\/project-grants/);

      await page.waitForSelector('nav', { state: 'visible', timeout: 15000 });

      await page.locator(`nav a[href="${route('/endangered-species')}"]`).first().click();
      await expect(page).toHaveURL(/\/endangered-species/);

      await page.goto(route('/'));
      await expect(page).toHaveURL(route('/'));
    });

    test('external link should open in new tab', async ({ page }) => {
      await page.goto(route('/'));

      const externalLink = page.locator('a[href="https://www.earthguardians.org/crews"]').first();
      await expect(externalLink).toHaveAttribute('target', '_blank');
      await expect(externalLink).toHaveAttribute('rel', /noopener/);
    });
  });

  test.describe('Dark Mode Toggle', () => {
    test('should have dark mode toggle button visible on all pages', async ({ page }) => {
      const pagesToTest = ['/', '/info', '/project-grants', '/globe'];

      for (const path of pagesToTest) {
        await page.goto(route(path));
        await page.waitForSelector('nav', { state: 'visible', timeout: 15000 });
        const toggleButton = page.locator('nav button').first();
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

      await page.goto(route('/'));

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

      await page.goto(route('/info'));

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

      await page.goto(route('/'));

      expect(consoleErrors).toHaveLength(0);
    });
  });
});
