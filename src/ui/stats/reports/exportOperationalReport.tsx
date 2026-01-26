'use client'

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { OperationalReportExport } from './OperationalReportExport'
import { OperationalReport } from '@/domain/reports/operationalTypes'

export async function exportOperationalReport(report: OperationalReport) {
    const { default: jsPDF } = await import('jspdf')
    // 1. Create PDF instance (A4, points)
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'pt',
        format: 'a4'
    })

    // 2. Render Component to Static HTML String
    const htmlString = renderToStaticMarkup(
        <OperationalReportExport report={report} />
    )

    // 3. Convert HTML to PDF using .html method
    // Note: This relies on the browser's ability to render the HTML into canvas context.
    // jsPDF .html() is robust but requires a container or specific width settings.
    doc.html(htmlString, {
        callback: function (doc: any) {
            const fileName = `Reporte_Operativo_${report.current.period.label.replace(/\s/g, '_')}.pdf`
            doc.save(fileName)
        },
        x: 40,
        y: 40,
        width: 515, // A4 width (~595pt) - margins (80pt) = 515pt
        windowWidth: 800, // Virtual window width for rendering CSS
        autoPaging: 'text'
    })
}
