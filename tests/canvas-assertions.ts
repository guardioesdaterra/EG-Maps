import { expect, type Locator } from '@playwright/test'
import { PNG } from 'pngjs'

/** Require a canvas to have a usable size and non-uniform rendered pixels. */
export async function expectCanvasHasRenderedPixels(canvas: Locator): Promise<void> {
  await expect(canvas).toBeVisible({ timeout: 15_000 })

  const dimensions = await canvas.evaluate((element) => {
    const target = element as HTMLCanvasElement
    const bounds = target.getBoundingClientRect()
    return {
      bitmapWidth: target.width,
      bitmapHeight: target.height,
      displayWidth: bounds.width,
      displayHeight: bounds.height,
    }
  })

  expect(dimensions.bitmapWidth).toBeGreaterThan(0)
  expect(dimensions.bitmapHeight).toBeGreaterThan(0)
  expect(dimensions.displayWidth).toBeGreaterThan(100)
  expect(dimensions.displayHeight).toBeGreaterThan(100)

  await expect.poll(async () => {
    const screenshot = await canvas.screenshot()
    const image = PNG.sync.read(screenshot)
    const colors = new Set<string>()
    const stepX = Math.max(1, Math.floor(image.width / 40))
    const stepY = Math.max(1, Math.floor(image.height / 40))

    for (let y = 0; y < image.height; y += stepY) {
      for (let x = 0; x < image.width; x += stepX) {
        const offset = (y * image.width + x) * 4
        if (image.data[offset + 3] === 0) continue
        colors.add(`${image.data[offset]},${image.data[offset + 1]},${image.data[offset + 2]}`)
      }
    }

    return colors.size
  }, { timeout: 20_000, intervals: [250, 500, 1_000] }).toBeGreaterThan(3)
}
