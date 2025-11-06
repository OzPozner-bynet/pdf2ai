$roleName = "ServiceNowMidserverRole"
$policyName = "AllowBedrockInvokeModel"
$policyFile = "bedrock-policy.json"

aws iam put-role-policy `
  --role-name $roleName `
  --policy-name $policyName `
  --policy-document file://$policyFile


  $roleArn = "arn:aws:iam::584674137657:role/ServiceNowMidserverRole"
$action = "bedrock:InvokeModel"
$resource = "arn:aws:bedrock:eu-central-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0"

aws iam simulate-principal-policy `
  --policy-source-arn $roleArn `
  --action-names $action `
  --resource-arns $resource




$region = "eu-central-1"
$modelId = "anthropic.claude-3-sonnet-20240229-v1:0"
$responseFile = "bedrock-response.json"

$payload = @{
    anthropic_version = "bedrock-2023-05-31"
    max_tokens = 100
    messages = @(
        @{
            role = "user"
            content = "Hello Claude, can you confirm you're working?"
        }
    )
} | ConvertTo-Json -Depth 3 -Compress


# Set parameters
$region = "eu-central-1"
$modelId = "anthropic.claude-3-sonnet-20240229-v1:0"
$responseFile = "bedrock-response.json"

# Build JSON payload
$payload = @{
    anthropic_version = "bedrock-2023-05-31"
    max_tokens = 100
    messages = @(
        @{ role = "user"; content = "Hello Claude, are you working?" }
    )
} | ConvertTo-Json -Depth 3 -Compress

# Encode payload to base64
$base64Payload = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($payload))

# Invoke Bedrock and save response
aws bedrock-runtime invoke-model `
    --region $region `
    --model-id $modelId `
    --body $base64Payload `
    --content-type application/json `
    --accept application/json `
    $responseFile

    Get-Content $responseFile | ConvertFrom-Json | Format-List