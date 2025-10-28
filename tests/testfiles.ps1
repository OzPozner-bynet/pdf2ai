# ================================
# Load AWS credentials from .env
# ================================
Get-Content .env | ForEach-Object {
    if ($_ -match "^(.*?)=(.*)$") {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2])
    }
}

$AWS_REGION = "eu-central-1"
$modelId    = "anthropic.claude-3-sonnet-20240229-v1:0"

# ================================
# Variables
# ================================
$filePath    = "./public/363040_Scan.pdf"
$mappingPath = "./mapping.json"
$outputPath  = "./public/output.json"
$prompt      = "convert the upload file to json, show validity score, detected language, use headers from the attach mapping.json to map the results headers to service now s2p \n`
, show invoice lines as array or table show totals, dont show the mapping you used, add time and date to output file .json. show all tokens"

# Read mapping JSON
$mappingJson = Get-Content -Raw -Path $mappingPath

# ================================
# Prepare request body for Claude
# ================================
$fileBytes  = [System.IO.File]::ReadAllBytes($filePath)
$fileBase64 = [System.Convert]::ToBase64String($fileBytes)

$body = @{
    anthropic_version = "bedrock-2023-05-31"
    max_tokens        = 10000
    messages          = @(
        @{
            role    = "user"
            content = @(
                @{
                    type = "text"
                    text = "$prompt`n`nMapping JSON:`n$mappingJson`n`nFile (base64): $fileBase64"
                }
            )
        }
    )
} | ConvertTo-Json -Depth 20 -Compress

# Save body to temp file
$tempPayloadFile = New-TemporaryFile
$body | Set-Content -Path $tempPayloadFile -Encoding UTF8

# ================================
# Invoke Bedrock model
# ================================
Write-Host "Invoking Bedrock model '$modelId' in region '$AWS_REGION'..."

aws bedrock-runtime invoke-model `
    --region $AWS_REGION `
    --model-id $modelId `
    --body fileb://$tempPayloadFile `
    $outputPath

# ================================
# Show final results
# ================================
Write-Host "`n=== Model Output ==="
Get-Content $outputPath | Out-String | Write-Host

# Cleanup
Remove-Item $tempPayloadFile -Force
