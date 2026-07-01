param(
  [string]$Path,
  [string]$Culture = "de-DE"
)

Add-Type -AssemblyName System.Speech
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Json($obj) {
  $json = $obj | ConvertTo-Json -Compress
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

if (-not (Test-Path $Path)) {
  Write-Json @{ type = "error"; message = "Audiodatei nicht gefunden: $Path" }
  exit 1
}

try {
  try {
    $culture = New-Object System.Globalization.CultureInfo($Culture)
    $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
  } catch {
    $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
  }

  $grammar = New-Object System.Speech.Recognition.DictationGrammar
  $recognizer.LoadGrammar($grammar)
  $recognizer.SetInputToWaveFile($Path)

  $results = $recognizer.RecognizeAll()
  $text = ($results | ForEach-Object { $_.Text }) -join " "

  Write-Json @{ type = "transcript"; text = $text }
} catch {
  Write-Json @{ type = "error"; message = $_.Exception.Message }
  exit 1
}
