# Batch replace hardcodes script
$files = @(
    'src/ui/stats/StatsView.tsx',
    'src/ui/stats/StatsTabs.tsx',
    'src/ui/stats/overview/StatCard.tsx',
    'src/ui/stats/overview/StatsOverview.tsx',
    'src/ui/stats/monthly/MonthlySummaryView.tsx',
    'src/ui/stats/history/HistoryView.tsx',
    'src/ui/stats/coverage/CoverageRiskView.tsx',
    'src/ui/stats/reports/PointsReportView.tsx',
    'src/ui/stats/reports/ExecutiveReportView.tsx',
    'src/ui/planning/MixedShiftConfirmModal.tsx',
    'src/ui/planning/MixedOverrideModal.tsx',
    'src/ui/planning/CalendarDayModal.tsx',
    'src/ui/coverage/CoverageRuleRow.tsx',
    'src/ui/coverage/CoverageRuleModal.tsx',
    'src/ui/settings/RepresentativeManagement.tsx',
    'src/ui/settings/HolidayManagement.tsx',
    'src/ui/settings/components/SpecialScheduleWizard.tsx',
    'src/ui/settings/components/SpecialScheduleForm.tsx',
    'src/ui/settings/components/SortableRepCard.tsx',
    'src/ui/logs/DailyLogView.tsx'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "background: 'white'", "background: 'var(--bg-panel)'"
        $content = $content -replace "background: '#FFFFFF'", "background: 'var(--bg-panel)'"
        $content = $content -replace "background: '#ffffff'", "background: 'var(--bg-panel)'"
        $content = $content -replace "border: '1px solid #e5e7eb'", "border: '1px solid var(--border-subtle)'"
        $content = $content -replace "border: '1px solid #d1d5db'", "border: '1px solid var(--border-strong)'"
        $content = $content -replace "color: '#1F2937'", "color: 'var(--text-main)'"
        $content = $content -replace "color: '#111827'", "color: 'var(--text-main)'"
        $content = $content -replace "color: '#374151'", "color: 'var(--text-main)'"
        $content = $content -replace "color: '#6b7280'", "color: 'var(--text-muted)'"
        Set-Content $file -Value $content
        Write-Host "Processed: $file"
    }
}

Write-Host "`nDone! Processed $($files.Count) files."
