# fix-discovery-visual.ps1
# Checks current state then applies the fix

$file = Join-Path $PSScriptRoot "index.html"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)

# Check current state
if ($content.Contains('id="discovery-pack"')) {
    Write-Host "✅ Discovery Pack section found" -ForegroundColor Green
} else {
    Write-Host "❌ Discovery Pack section NOT found - wrong file?" -ForegroundColor Red
    Read-Host "Press Enter to exit"; exit
}

if ($content.Contains('dp-1080.png')) {
    Write-Host "✅ Image already wired up - check if image file exists in images/ folder" -ForegroundColor Green
    Read-Host "Press Enter to exit"; exit
}

if ($content.Contains('flex:1 1 100%')) {
    Write-Host "⚠️  Full-width layout detected - applying fix..." -ForegroundColor Yellow
    
    # Use regex to handle whitespace variations
    $pattern = '(<section id="discovery-pack"[^>]*>)\s*<div class="p-info reveal"[^>]*style="flex:1 1 100%[^"]*"[^>]*>'
    $replacement = '<section id="discovery-pack" class="product-section gt-theme">
  <div class="p-visual"><div class="p-close" style="background-image:url(''images/dp-1080.png'');"></div><div class="p-accent"></div><span class="p-code">DP &middot; 004</span></div>
  <div class="p-info reveal">'

    $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement)
    
    if ($newContent -eq $content) {
        Write-Host "❌ Regex also failed - printing the actual discovery-pack lines for diagnosis:" -ForegroundColor Red
        $lines = $content -split "`n"
        $idx = 0
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match 'discovery-pack') { $idx = $i; break }
        }
        for ($i = $idx; $i -lt [Math]::Min($idx+4, $lines.Count); $i++) {
            Write-Host "LINE $($i+1): $($lines[$i])" -ForegroundColor Cyan
        }
    } else {
        [System.IO.File]::WriteAllText($file, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "✅ Fixed! Reload localhost to check." -ForegroundColor Green
    }
} else {
    Write-Host "ℹ️  Layout already modified - check if dp-1080.png is in the images/ folder" -ForegroundColor Cyan
}

Read-Host "Press Enter to exit"
