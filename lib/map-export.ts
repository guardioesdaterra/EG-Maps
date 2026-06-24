import { saveAs } from 'file-saver'

export interface ExportOptions {
  format: 'png' | 'pdf'
  resolution: '1x' | '2x'
  paperSize?: 'a4' | 'letter'
  includeLegend: boolean
  includeTitle: boolean
}

export async function exportMapToImage(
  mapContainer: HTMLElement,
  options: ExportOptions,
  metadata?: { title?: string; filterSummary?: string; date?: string },
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas')
  const scale = options.resolution === '2x' ? 2 : 1

  const canvas = await html2canvas(mapContainer, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#09090b',
    logging: false,
  })

  if (options.format === 'png') {
    canvas.toBlob((blob) => {
      if (blob) {
        const filename = buildFilename('png', metadata)
        saveAs(blob, filename)
      }
    }, 'image/png')
    return
  }

  const { jsPDF } = await import('jspdf')
  const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait'
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: options.paperSize || 'a4',
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()

  if (options.includeTitle) {
    const title = metadata?.title || 'EG-Maps Observatory of Vulcan'
    const date = metadata?.date || new Date().toISOString().split('T')[0]
    pdf.setFontSize(14)
    pdf.setTextColor(30, 30, 30)
    pdf.text(title, 15, 15)
    pdf.setFontSize(9)
    pdf.setTextColor(100, 100, 100)
    pdf.text(`Generated: ${date}`, 15, 22)

    if (metadata?.filterSummary) {
      pdf.setFontSize(8)
      pdf.text(`Filters: ${metadata.filterSummary}`, 15, 28)
    }

    const imgTop = options.includeTitle ? 32 : 10
    const imgHeight = pageHeight - imgTop - 10
    const imgWidth = Math.min(pageWidth - 20, (canvas.width / canvas.height) * imgHeight)
    const imgX = (pageWidth - imgWidth) / 2
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', imgX, imgTop, imgWidth, imgHeight)
  } else {
    const imgWidth = pageWidth - 20
    const imgHeight = Math.min(pageHeight - 20, (canvas.height / canvas.width) * imgWidth)
    const imgY = (pageHeight - imgHeight) / 2
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 10, imgY, imgWidth, imgHeight)
  }

  pdf.setFontSize(7)
  pdf.setTextColor(150, 150, 150)
  pdf.text('Earth Guardians South America — Observatory of Vulcan', 15, pageHeight - 5)
  pdf.text('This document is for research and advocacy purposes.', pageWidth - 15, pageHeight - 5, { align: 'right' })

  const filename = buildFilename('pdf', metadata)
  pdf.save(filename)
}

function buildFilename(ext: string, metadata?: { title?: string; filterSummary?: string }): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const filter = metadata?.filterSummary
    ? '-' + metadata.filterSummary.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 30)
    : ''
  return `EG-Vulcan-${date}${filter}.${ext}`
}
