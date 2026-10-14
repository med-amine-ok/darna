$targetDirs = @("frontend/app", "frontend/components", "frontend/lib", "frontend/messages", "frontend/actions", "frontend/hook", "frontend/api", "frontend/public", "frontend/scripts", "frontend/styles")

$emojiRegex = [regex]'[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2300-\u23FF]|[\u2B50\u2B55]|[\u203C\u2049\u2139\u2194-\u2199\u21A9-\u21AA\u2934\u2935\u3030\u303D\u3297\u3299]'

$allFiles = @()
foreach ($d in $targetDirs) {
    if (Test-Path $d) {
        $files = Get-ChildItem -Path $d -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.md
        $allFiles += $files
    }
}

Write-Output "Found $($allFiles.Count) files across target directories."

$results = @()
foreach ($file in $allFiles) {
    $lines = Get-Content -LiteralPath $file.FullName -Encoding UTF8
    for ($i = 0; $i -lt $lines.Length; $i++) {
        $line = $lines[$i]
        if ($emojiRegex.IsMatch($line)) {
            $matches = $emojiRegex.Matches($line)
            $foundEmojis = ($matches | ForEach-Object { $_.Value }) -join " "
            $rel = $file.FullName.Replace("c:\Users\OASIS\Documents\darna\", "").Replace("\", "/")
            $results += [PSCustomObject]@{
                File = $rel
                Line = ($i + 1)
                Emojis = $foundEmojis
                Content = $line.Trim()
            }
        }
    }
}

Write-Output "=== TOTAL EMOJI OCCURRENCES: $($results.Count) ==="
foreach ($r in $results) {
    Write-Output "[$($r.Emojis)] in $($r.File):$($r.Line) -> $($r.Content)"
}

$results | ConvertTo-Json -Depth 5 | Out-File -FilePath "scratch/emoji_audit.json" -Encoding UTF8
