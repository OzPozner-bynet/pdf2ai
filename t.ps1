# t.ps1 — AWS Bedrock Claude 3.5 Sonnet Test Script using .env

# Step 1: Load .env file
Write-Host "`n📂 Loading .env file..."
$envPath = ".env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found at $envPath"
    exit 1
}

Get-Content $envPath | ForEach-Object {
    if ($_ -match "^\s*([^#=]+?)\s*=\s*(.+?)\s*$") {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        Write-Host "✅ Loaded $name"
    }
}

# Step 2: Validate required environment variables
Write-Host "`n🔐 Validating AWS credentials..."
$requiredVars = @("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY")
foreach ($var in $requiredVars) {
    $envValue = [System.Environment]::GetEnvironmentVariable($var)
    if (-not $envValue) {
        Write-Host "❌ Missing environment variable: $var"
        exit 1
    }
}

# Step 3: Define prompt and model info
$prompt = "What is the capital of France?"
$modelId = "anthropic.claude-3-5-sonnet-20240620-v1:0"
$region = "eu-central-1"
$responseFile = "out.json"

# Step 4: Build Claude-compatible JSON payload
Write-Host "`n🧠 Building payload..."
$payload = @{
    messages = @(
        @{ role = "user"; content = $prompt }
    )
    max_tokens = 1024
    anthropic_version = "bedrock-2023-05-31"
} | ConvertTo-Json -Depth 3 -Compress


Write-Host "📦 Payload:`n$payload"

# Step 5: Encode payload to base64
Write-Host "`n🔐 Encoding payload to base64..."
$base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($payload))

# Step 6: Invoke AWS Bedrock
Write-Host "`n🚀 Invoking AWS Bedrock Claude 3.5 Sonnet..."
try {
    $rawResponse = aws bedrock-runtime invoke-model `
        --region $region `
        --model-id $modelId `
        --body $base64 `
        --content-type application/json `
        --accept application/json `
        --output json outfile.json

    # Save response to file
    $rawResponse | Out-File -Encoding utf8 $responseFile
    Write-Host "`n✅ Response saved to $responseFile"
    Write-Host "`n📄 Contents of outfile.json:"
    Get-Content .\outfile.json | ForEach-Object { Write-Host $_ }


} catch {
    Write-Host "❌ AWS CLI invocation failed: $($_.Exception.Message)"
    exit 1
}

# Step 7: Display parsed response
Write-Host "`n📖 Parsed Claude response:"
try {
    Get-Content $responseFile | ConvertFrom-Json | Format-List
} catch {
    Write-Host "⚠️ Failed to parse response. Raw output:"
    Get-Content $responseFile
}
