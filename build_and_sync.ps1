$baseDir = "C:\Users\Lenovo\.gemini\antigravity\scratch\office-daily-worksheet"

# 1. Copy assets to public directory
Copy-Item (Join-Path $baseDir "admin.html") (Join-Path $baseDir "public\admin.html") -Force
Copy-Item (Join-Path $baseDir "index.html") (Join-Path $baseDir "public\index.html") -Force
Copy-Item (Join-Path $baseDir "js\*") (Join-Path $baseDir "public\js") -Recurse -Force
Copy-Item (Join-Path $baseDir "css\*") (Join-Path $baseDir "public\css") -Recurse -Force

if (Test-Path (Join-Path $baseDir "favicon.ico")) {
  Copy-Item (Join-Path $baseDir "favicon.ico") (Join-Path $baseDir "public\favicon.ico") -Force
}
if (Test-Path (Join-Path $baseDir "favicon.svg")) {
  Copy-Item (Join-Path $baseDir "favicon.svg") (Join-Path $baseDir "public\favicon.svg") -Force
}
if (Test-Path (Join-Path $baseDir "manifest.json")) {
  Copy-Item (Join-Path $baseDir "manifest.json") (Join-Path $baseDir "public\manifest.json") -Force
}

# 2. Read CSS & JS using UTF8 encoding
$utf8 = [System.Text.Encoding]::UTF8

$cssMain = [System.IO.File]::ReadAllText((Join-Path $baseDir "css\main.css"), $utf8)
$cssComp = [System.IO.File]::ReadAllText((Join-Path $baseDir "css\components.css"), $utf8)
$cssResp = [System.IO.File]::ReadAllText((Join-Path $baseDir "css\responsive.css"), $utf8)

$jsAuth = [System.IO.File]::ReadAllText((Join-Path $baseDir "js\authManager.js"), $utf8)
$jsSample = [System.IO.File]::ReadAllText((Join-Path $baseDir "js\sampleData.js"), $utf8)
$jsCloud = [System.IO.File]::ReadAllText((Join-Path $baseDir "js\cloudStorage.js"), $utf8)
$jsMgr = [System.IO.File]::ReadAllText((Join-Path $baseDir "js\worksheetManager.js"), $utf8)
$jsUI = [System.IO.File]::ReadAllText((Join-Path $baseDir "js\uiRenderer.js"), $utf8)
$jsIE = [System.IO.File]::ReadAllText((Join-Path $baseDir "js\importExport.js"), $utf8)
$jsAdmin = [System.IO.File]::ReadAllText((Join-Path $baseDir "js\adminManager.js"), $utf8)
$jsApp = [System.IO.File]::ReadAllText((Join-Path $baseDir "js\app.js"), $utf8)

$html = [System.IO.File]::ReadAllText((Join-Path $baseDir "index.html"), $utf8)

# 3. Replace CSS link tags with inline <style>
$allCss = "<style>`n$cssMain`n$cssComp`n$cssResp`n</style>"
$html = $html -replace '<link rel="stylesheet" href="css/main.css">\s*<link rel="stylesheet" href="css/components.css">\s*<link rel="stylesheet" href="css/responsive.css">', $allCss

# 4. Replace JS script tags with inline <script>
$allJs = "<script>`n$jsAuth`n$jsSample`n$jsCloud`n$jsMgr`n$jsUI`n$jsIE`n$jsAdmin`n$jsApp`n</script>"
$html = $html -replace '<script src="js/authManager.js"></script>\s*<script src="js/sampleData.js"></script>\s*<script src="js/cloudStorage.js"></script>\s*<script src="js/worksheetManager.js"></script>\s*<script src="js/uiRenderer.js"></script>\s*<script src="js/importExport.js"></script>\s*<script src="js/adminManager.js"></script>\s*<script src="js/app.js"></script>', $allJs

# 5. Write standalone html files with UTF8
[System.IO.File]::WriteAllText((Join-Path $baseDir "app-standalone.html"), $html, $utf8)
[System.IO.File]::WriteAllText((Join-Path $baseDir "public\app-standalone.html"), $html, $utf8)

Write-Host "Build complete! All files generated in UTF-8 without mojibake."