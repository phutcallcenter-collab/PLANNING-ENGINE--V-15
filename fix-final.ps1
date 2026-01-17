# Final cleanup - remaining files
$files = @(
    'src/ui/settings/SettingsMenu.tsx',
    'src/ui/reports/ExecutiveReportView.tsx',
    'src/ui/logs/DailyEventsList.tsx',
    'src/ui/components/VacationConfirmation.tsx',
    'src/ui/components/HelpPanel.tsx'
)

foreach ($file in $files) {
    if (Test-Path $file) {
        $content = Get-Content $file -Raw
        $content = $content -replace "background: 'white'", "background: 'var(--bg-panel)'"
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

Write-Host "`nDone! Final cleanup complete."
