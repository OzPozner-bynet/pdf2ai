# Start server in background
npx pm2 start server.js --name bedrock-server

# Wait for server to initialize
Start-Sleep -Seconds 3

# Define test prompts
$tests = @(
    "What is the capital of France?",
    "Tell me a joke about AI.",
    ""
)

# Loop through tests
foreach ($prompt in $tests) {
    Write-Host "`nSending prompt: $prompt"
    try {
        $response  = Invoke-WebRequest -Uri "https://localhost:8443/prompt" `
            -Method POST `
            -Body $prompt `
            -ContentType "text/plain" `
            -SkipCertificateCheck

        Write-Host "24 Status Code: $($response.StatusCode)"
        Write-Host "25 Response Body:`n$($response.Content)"
    } catch {
        Write-Host "27 Request failed: $($_.Exception.Message)"
        Write-Host "28 Status Code: $($response.StatusCode)"
        Write-Host "29 Response Body:`n$($response.Content)"
    }
}

# Stop server after tests
npx pm2 stop bedrock-server
npx pm2 delete bedrock-server