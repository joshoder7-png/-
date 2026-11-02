# sync-whatsapp.ps1
# מסנכרן שאלות חדשות מיצוא WhatsApp לאתר "נכנסים בשאלה"
# הפעלה: לחץ פעמיים על sync-whatsapp.bat

param(
  [string]$ZipPath = ""   # אם ריק: מחפש אוטומטית בתיקיית Downloads
)

$ErrorActionPreference = "Stop"
$projectPath = $PSScriptRoot
$dataJsPath  = "$projectPath\data.js"

Write-Host "=== סנכרון נכנסים בשאלה ===" -ForegroundColor Cyan

# ------- 1. מצא את קובץ ה-ZIP -------
if (-not $ZipPath) {
  $downloadsPath = "$env:USERPROFILE\Downloads"
  $candidates = Get-ChildItem $downloadsPath -Filter "*.zip" | Where-Object {
    $_.Name -match "WhatsApp" -or $_.Name -match "נכנסים" -or $_.Name -match "chat"
  } | Sort-Object LastWriteTime -Descending
  if ($candidates.Count -eq 0) {
    Write-Host "לא נמצא קובץ WhatsApp ZIP בתיקיית Downloads." -ForegroundColor Yellow
    Write-Host "גרור/הכנס קובץ ZIP ידנית כארגומנט: .\sync-whatsapp.ps1 -ZipPath 'C:\...'"
    exit 1
  }
  $ZipPath = $candidates[0].FullName
  Write-Host "נמצא: $ZipPath" -ForegroundColor Green
}

# ------- 2. חלץ את הצ'אט -------
$tempDir = "$env:TEMP\nichnasim_sync_$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $tempDir | Out-Null
Expand-Archive -Path $ZipPath -DestinationPath $tempDir -Force

$chatFile = Get-ChildItem $tempDir -Recurse -Filter "_chat.txt" | Select-Object -First 1
if (-not $chatFile) {
  $chatFile = Get-ChildItem $tempDir -Recurse -Filter "*.txt" | Select-Object -First 1
}
if (-not $chatFile) {
  Write-Host "לא נמצא קובץ txt בתוך ה-ZIP." -ForegroundColor Red
  exit 1
}
$chatLines = [System.IO.File]::ReadAllLines($chatFile.FullName, [System.Text.Encoding]::UTF8)
Write-Host "קראתי $($chatLines.Count) שורות מהצ'אט"

# ------- 3. מצא את מספר השאלה האחרון ב-data.js -------
$currentData = [System.IO.File]::ReadAllText($dataJsPath, [System.Text.Encoding]::UTF8)
$lastNumMatch = [regex]::Matches($currentData, '"q":"שאלה (\d+)')
$lastNum = 0
foreach ($m in $lastNumMatch) { $n = [int]$m.Groups[1].Value; if ($n -gt $lastNum) { $lastNum = $n } }
Write-Host "מספר שאלה אחרון בקובץ: $lastNum" -ForegroundColor Cyan

# ------- 4. פרס שאלות חדשות -------
$catRules = [ordered]@{
  'מלחמה ואמונה לאומית'          = @('מלחמה','חיילים','צבא','חטופים','גיוס','חייל','ארץ ישראל')
  'מיניות צניעות ויצר'           = @('אוננות','פורנו','יצר הרע','צניעות','נגיעה באישה','נגיעה בבנות','הרהורים','מיני','בנות','תאווה')
  'ימים מיוחדים שבת מועדים ואבלות' = @('שבת','פורים','פסח','סוכות','חנוכה','ראש השנה','יום כיפור','ספירת העומר','שבועות','תשעה באב','אבלות','קדיש','חג','מועד','משלוח מנות','מגילה','לולב','אתרוג','מצה','מנורה')
  'תפילה וכוונה'                 = @('תפילה','להתפלל','שמונה עשרה','ברכת','ברכה','קריאת שמע','שחרית','מנחה','ערבית','מוסף','כוונה בתפילה','סידור','חזן','אמן','תהילים','תחנון')
  'הלכה מעשית'                   = @('כשרות','בשר בחלב','ברכה על','הלכה למעשה','נטילת ידיים','מזוזה','תפילין','ציצית','מלאכה','פסק הלכה')
  'אמונה ושאלות על ה'            = @('אמונה','אלוקים','השגחה','ניסיון','כפירה','בורא','בחירה חופשית','יסורים','הקב"ה','ספק באמונה','אלוהים')
  'תשובה רוחניות ועבודת ה אישית' = @('תשובה','חרטה','לחזור בתשובה','רוחניות','עבודת ה','להתחזק','קרבה לה','כוחות רוחניים','יצר הרע','חיזוק','מוטיבציה')
  'חינוך ישיבה ואישיות'          = @('ישיבה','בית מדרש','לימוד תורה','רב מחנך','ריב עם חבר','לגדול','שיחה עם רב','מחנך','שיעור')
  'שונות / כללי'                 = @()
}

function Get-Category($text) {
  foreach ($cat in $catRules.Keys) {
    if ($catRules[$cat].Count -eq 0) { continue }
    foreach ($kw in $catRules[$cat]) {
      if ($text.Contains($kw)) { return $cat }
    }
  }
  return 'שונות / כללי'
}

function Escape-JS($s) {
  $s = $s -replace '\\', '\\'
  $s = $s -replace '"', '\"'
  $s = $s -replace "`r`n", '\n'
  $s = $s -replace "`n", '\n'
  $s = $s -replace "`r", '\n'
  return $s
}

$newEntries = [System.Collections.Generic.List[hashtable]]::new()
$i = 0
while ($i -lt $chatLines.Count) {
  $line = $chatLines[$i]
  # detect "שאלה XXXX" line
  if ($line -match 'שאלה\s+(\d+)') {
    $qNum = [int]$Matches[1]
    if ($qNum -le $lastNum) { $i++; continue }

    # collect question block until "הרב המשיב:"
    $qLines = [System.Collections.Generic.List[string]]::new()
    $rabbiLine = ""
    $aLines  = [System.Collections.Generic.List[string]]::new()
    $j = $i
    $inAnswer = $false
    while ($j -lt $chatLines.Count) {
      $l = $chatLines[$j]
      if ($j -gt $i -and $l -match 'שאלה\s+\d+') { break }  # next question
      if ($l -match 'הרב המשיב[:\s]*(.*)') {
        $rabbiLine = $l
        $inAnswer = $true
        $j++
        continue
      }
      if (-not $inAnswer) { [void]$qLines.Add($l) } else { [void]$aLines.Add($l) }
      $j++
    }
    # clean question text - strip WhatsApp prefix [date] person:
    $qText = ($qLines | ForEach-Object { $_ -replace '^\[.*?\]\s*(את|ה|אתה|היא|הוא)[:\-]\s*', '' -replace '^\[.*?\]\s*\S+:\s*', '' }) -join ' '
    $qText = $qText.Trim() -replace '\s+', ' '
    $aText = ($aLines | ForEach-Object { $_ -replace '^\[.*?\]\s*\S+:\s*', '' }) -join ' '
    $aText = $aText.Trim() -replace '\s+', ' '

    # extract rabbi name
    $rabbi = ""
    if ($rabbiLine -match 'הרב המשיב[:\s]*(.+)') { $rabbi = $Matches[1].Trim() -replace '[🙏✡️🕍]', '' -replace '\s+', ' ' }

    if ($qText.Length -gt 10 -and $aText.Length -gt 10) {
      $category = Get-Category "$qText $aText"
      $newEntries.Add(@{
        q = "שאלה $qNum - $qText"
        a = $aText
        r = $rabbi
        c = $category
      })
    }
    $i = $j
  } else { $i++ }
}

Write-Host "נמצאו $($newEntries.Count) שאלות חדשות (אחרי שאלה $lastNum)"

if ($newEntries.Count -eq 0) {
  Write-Host "אין שאלות חדשות לסנכרן. האתר עדכני." -ForegroundColor Green
  exit 0
}

# ------- 5. הוסף לdata.js -------
# מצא את סוף ה-array: ];"
$closeIdx = $currentData.LastIndexOf('];')
$insertPos = $closeIdx  # לפני "];"

$sb = [System.Text.StringBuilder]::new()
foreach ($entry in $newEntries) {
  [void]$sb.Append(',{')
  [void]$sb.Append('"q":"' + (Escape-JS $entry.q) + '"')
  [void]$sb.Append(',"a":"' + (Escape-JS $entry.a) + '"')
  [void]$sb.Append(',"r":"' + (Escape-JS $entry.r) + '"')
  [void]$sb.Append(',"c":"' + (Escape-JS $entry.c) + '"')
  [void]$sb.Append('}')
}

$newData = $currentData.Substring(0, $insertPos) + $sb.ToString() + $currentData.Substring($insertPos)
[System.IO.File]::WriteAllText($dataJsPath, $newData, [System.Text.Encoding]::UTF8)
Write-Host "data.js עודכן עם $($newEntries.Count) שאלות חדשות" -ForegroundColor Green

# ------- 6. Git commit ו-push -------
Push-Location $projectPath
try {
  $gitStatus = git status --short 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "לא ניתן לבצע git (אולי git לא מותקן). העדכן את data.js ידנית." -ForegroundColor Yellow
    exit 0
  }
  git add data.js
  $date = Get-Date -Format 'dd/MM/yyyy'
  git commit -m "sync: add $($newEntries.Count) new Q&A from WhatsApp ($date)`n`nCo-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
  git push origin main
  Write-Host "האתר עודכן בהצלחה! השאלות החדשות יופיעו תוך כמה דקות." -ForegroundColor Cyan
} catch {
  Write-Host "שגיאה ב-git: $_" -ForegroundColor Red
  Write-Host "data.js עודכן מקומית. העלה ידנית ל-GitHub."
} finally {
  Pop-Location
}

# ------- ניקוי -------
Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "סיום!" -ForegroundColor Green
