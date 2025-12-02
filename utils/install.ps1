# install-poppler.ps1
# Installs Poppler for Windows and configures system PATH

function Ensure-Admin {
    $IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $IsAdmin) {
        Write-Error "This script must be run as Administrator. Right-click and choose 'Run as Administrator'."
        exit 1
    }
}

function Download-Poppler {
    $url = "https://github.com/oschwartz10612/poppler-windows/releases/download/v25.07.0-0/Release-25.07.0-0.zip"
    $zipPath = "$env:TEMP\poppler.zip"

    Write-Host "Downloading Poppler from GitHub..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing
        Write-Host "Download complete."
        return $zipPath
    } catch {
        Write-Error "Failed to download Poppler: $($_.Exception.Message)"
        exit 1
    }
}

function Extract-Poppler {
    param([string]$zipPath)
    $extractPath = "C:\poppler"
    Write-Host "Extracting Poppler to $extractPath..."
    try {
        Expand-Archive -Path $zipPath -DestinationPath $extractPath -Force
        Write-Host "Extraction complete."
        return "$extractPath\Release-25.07.0-0\bin"
    } catch {
        Write-Error "Failed to extract Poppler: $($_.Exception.Message)"
        exit 1
    }
}

function Add-ToPath {
    param([string]$binPath)
    Write-Host "Adding Poppler to system PATH..."
    try {
        $currentPath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
        if ($currentPath -notlike "*$binPath*") {
            $newPath = "$currentPath;$binPath"
            [System.Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
            Write-Host "PATH updated. You may need to restart your system."
        } else {
            Write-Host "Poppler is already in PATH."
        }
    } catch {
        Write-Error "Failed to update system PATH: $($_.Exception.Message)"
        exit 1
    }
}

function Verify-Poppler {
    Write-Host "Verifying Poppler installation..."
    try {
        $version = & pdftoppm -version
        Write-Host "Poppler is installed: $version"
    } catch {
        Write-Error "Poppler verification failed. Make sure PATH is updated and restart your terminal."
        exit 1
    }
}

# Main Execution
Ensure-Admin
$zip = Download-Poppler
$binPath = Extract-Poppler -zipPath $zip
Add-ToPath -binPath $binPath
Verify-Poppler
Write-Host ""
Write-Host "Poppler setup complete. You are ready to use pdf-poppler in your Node.js project."
npm install aws-sdk


winget install --id OpenJS.NodeJS.LTS -e
winget install --id Git.Git -e
winget install --id Google.CloudSDK -e
winget install --id GraphicsMagick.GraphicsMagick -e
winget install --id ArtifexSoftware.Ghostscript -e

# Authenticate
gcloud auth login

# Initialize project
gcloud init
#gcloud config set project your-project-id

# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Set region
gcloud config set ai/region me-west1
