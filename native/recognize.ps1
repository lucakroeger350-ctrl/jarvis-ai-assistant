param(
  [string]$Culture = "de-DE"
)

Add-Type -AssemblyName System.Speech

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Write-Json($obj) {
  $json = $obj | ConvertTo-Json -Compress
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

try {
  $culture = New-Object System.Globalization.CultureInfo($Culture)
  $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine($culture)
} catch {
  try {
    $recognizer = New-Object System.Speech.Recognition.SpeechRecognitionEngine
  } catch {
    Write-Json @{ type = "error"; message = "Keine Spracherkennung fuer diese Sprache installiert: $Culture" }
    exit 1
  }
}

$recognizer.SetInputToDefaultAudioDevice()
$grammar = New-Object System.Speech.Recognition.DictationGrammar
$recognizer.LoadGrammar($grammar)

Register-ObjectEvent -InputObject $recognizer -EventName SpeechRecognized -Action {
  $text = $Event.SourceEventArgs.Result.Text
  $confidence = $Event.SourceEventArgs.Result.Confidence
  $obj = @{ type = "final"; text = $text; confidence = $confidence }
  $json = $obj | ConvertTo-Json -Compress
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
} | Out-Null

Register-ObjectEvent -InputObject $recognizer -EventName SpeechHypothesized -Action {
  $text = $Event.SourceEventArgs.Result.Text
  $obj = @{ type = "partial"; text = $text }
  $json = $obj | ConvertTo-Json -Compress
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
} | Out-Null

Write-Json @{ type = "ready" }

$recognizer.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)

while ($true) {
  Start-Sleep -Seconds 1
}
