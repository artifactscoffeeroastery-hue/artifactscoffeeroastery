# fix-bugs.ps1
# 1. Fixes scrollTo naming conflict (recursive call bug)
# 2. Wires up dp-1080.png in Discovery Pack section

$file = Join-Path $PSScriptRoot "index.html"
$content = [System.IO.File]::ReadAllText($file, [System.Text.Encoding]::UTF8)
$changes = 0

# ── 1. Rename custom scrollTo → scrollToSection ──
# Function definition
$old1 = 'function scrollTo(target, replace=false) {'
$new1 = 'function scrollToSection(target, replace=false) {'
if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1); $changes++
    Write-Host "✅ 1a. scrollTo function renamed" -ForegroundColor Green
} else { Write-Host "⚠️  1a. scrollTo definition not found" -ForegroundColor Yellow }

# Nav link click handler
$old2 = 'scrollTo(a.getAttribute(''href'')); dd && dd.classList.remove(''open'')'
$new2 = 'scrollToSection(a.getAttribute(''href'')); dd && dd.classList.remove(''open'')'
if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2); $changes++
    Write-Host "✅ 1b. Nav click handler updated" -ForegroundColor Green
} else { Write-Host "⚠️  1b. Nav click handler not found" -ForegroundColor Yellow }

# navigateMob call
$old3 = 'closeMobInternal(); scrollTo(target,history.state&&history.state.menu===''open''); }'
$new3 = 'closeMobInternal(); scrollToSection(target,history.state&&history.state.menu===''open''); }'
if ($content.Contains($old3)) {
    $content = $content.Replace($old3, $new3); $changes++
    Write-Host "✅ 1c. navigateMob call updated" -ForegroundColor Green
} else { Write-Host "⚠️  1c. navigateMob call not found" -ForegroundColor Yellow }

# ── 2. Discovery Pack visual panel ──
# Try exact match first
$old4 = '<section id="discovery-pack" class="product-section gt-theme">
  <div class="p-info reveal" style="flex:1 1 100%;width:100%;border-left:none;">'
$new4 = '<section id="discovery-pack" class="product-section gt-theme">
  <div class="p-visual"><div class="p-close" style="background-image:url(''images/dp-1080.png'');"></div><div class="p-accent"></div><span class="p-code">DP &middot; 004</span></div>
  <div class="p-info reveal">'

if ($content.Contains($old4)) {
    $content = $content.Replace($old4, $new4); $changes++
    Write-Host "✅ 2. Discovery Pack image panel added" -ForegroundColor Green
} elseif ($content.Contains('dp-1080.png')) {
    Write-Host "✅ 2. Discovery Pack image already wired — ensure dp-1080.png is in images/" -ForegroundColor Cyan
} else {
    # Regex fallback
    $pattern = 'id="discovery-pack"[^>]*>\s*<div class="p-info reveal"[^>]*style="[^"]*100%[^"]*"[^>]*>'
    $match = [System.Text.RegularExpressions.Regex]::Match($content, $pattern)
    if ($match.Success) {
        $replacement = 'id="discovery-pack" class="product-section gt-theme">
  <div class="p-visual"><div class="p-close" style="background-image:url(''images/dp-1080.png'');"></div><div class="p-accent"></div><span class="p-code">DP &middot; 004</span></div>
  <div class="p-info reveal">'
        $content = $content.Substring(0, $match.Index) + $replacement + $content.Substring($match.Index + $match.Length)
        $changes++
        Write-Host "✅ 2. Discovery Pack image panel added (regex)" -ForegroundColor Green
    } else {
        Write-Host "❌ 2. Could not locate Discovery Pack section" -ForegroundColor Red
    }
}

# ── Write ──
if ($changes -gt 0) {
    [System.IO.File]::WriteAllText($file, $content, [System.Text.Encoding]::UTF8)
    Write-Host ""
    Write-Host "✅ $changes change(s) applied. Hard-refresh localhost." -ForegroundColor Green
} else {
    Write-Host "⚠️  No changes applied." -ForegroundColor Yellow
}

Read-Host "Press Enter to exit"
