$frontendDir = "c:\Users\OASIS\Documents\darna\frontend"
$skipDirs = @("node_modules", ".next", ".git", "dist", "build", ".vercel")

function Get-SourceFiles($dir) {
    $files = [System.Collections.Generic.List[string]]::new()
    try {
        foreach ($sub in [System.IO.Directory]::EnumerateDirectories($dir)) {
            $name = [System.IO.Path]::GetFileName($sub)
            if ($skipDirs -contains $name) { continue }
            $files.AddRange((Get-SourceFiles $sub))
        }
        foreach ($f in [System.IO.Directory]::EnumerateFiles($dir)) {
            $ext = [System.IO.Path]::GetExtension($f).ToLower()
            if ($ext -in @(".ts", ".tsx", ".js", ".jsx", ".json", ".md")) {
                $files.Add($f)
            }
        }
    } catch {}
    return $files
}

$allFiles = Get-SourceFiles $frontendDir
Write-Output "Found $($allFiles.Count) source files to inspect."

# Regex matching surrogate pairs (standard emojis in UTF-16) and misc symbols
$emojiRegex = [regex]'[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2300-\u23FF]|[\u2B50\u2B55]'

$results = @()

foreach ($f in $allFiles) {
    try {
        $lines = [System.IO.File]::ReadAllLines($f, [System.Text.Encoding]::UTF8)
        for ($i = 0; $i -lt $lines.Length; $i++) {
            $line = $lines[$i]
            if ($emojiRegex.IsMatch($line)) {
                $matches = $emojiRegex.Matches($line)
                $foundEmojis = ($matches | ForEach-Object { $_.Value }) -join " "
                $relPath = $f.Substring("c:\Users\OASIS\Documents\darna\".Length).Replace("\", "/")
                $results += [PSCustomObject]@{
                    File = $relPath
                    Line = ($i + 1)
                    Emojis = $foundEmojis
                    Content = $line.Trim()
                }
            }
        }
    } catch {}
}

$jsonPath = "c:\Users\OASIS\Documents\darna\scratch\emoji_audit.json"
$results | ConvertTo-Json -Depth 5 | Out-File -FilePath $jsonPath -Encoding UTF8

Write-Output "=== AUDIT RESULTS ==="
Write-Output "Total emoji occurrences: $($results.Count)"
foreach ($r in $results) {
    Write-Output "$($r.File):$($r.Line) [ $($r.Emojis) ] -> $($r.Content)"
}
