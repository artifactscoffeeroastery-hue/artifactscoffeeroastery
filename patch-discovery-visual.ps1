# patch-discovery-visual.ps1
# Adds the p-visual image panel to the Discovery Pack section
# Run from: C:\Users\dgroo\Documents\Corezality\artifacts_coffee\
# Usage: Right-click > Run with PowerShell

$file = Join-Path $PSScriptRoot "index.html"

if (-not (Test-Path $file)) {
    Write-Host "ERROR: index.html not found at $file" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit
}

$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$changes = 0

# ── Replace full-width p-info with p-visual + p-info layout ──
$old = '<section id="discovery-pack" class="product-section gt-theme">
  <div class="p-info reveal" style="flex:1 1 100%;width:100%;border-left:none;">'

$new = '<section id="discovery-pack" class="product-section gt-theme">
  <div class="p-visual"><div class="p-close" style="background-image:url(''images/dp-1080.png'');"></div><div class="p-accent"></div><span class="p-code">DP &middot; 004</span></div>
  <div class="p-info reveal">'

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    $changes++
    Write-Host "✅ Discovery Pack visual panel added" -ForegroundColor Green
} else {
    Write-Host "⚠️  Target string not found — may already be patched or whitespace differs" -ForegroundColor Yellow
}

if ($changes -gt 0) {
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    Write-Host ""
    Write-Host "✅ $changes change(s) applied. index.html saved." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️  No changes applied." -ForegroundColor Yellow
}

Write-Host ""
Read-Host "Press Enter to exit"
