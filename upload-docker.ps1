param(
  [string]$ImageName = "",
  [string]$Version = "",
  [switch]$AlsoLatest,
  [switch]$NoLogin,
  [switch]$AllowDirty
)

$ErrorActionPreference = "Stop"

function Get-PublishConfig {
  $configPath = Join-Path $PSScriptRoot ".docker-publish.json"
  if (Test-Path $configPath) {
    return Get-Content $configPath -Raw | ConvertFrom-Json
  }

  return $null
}

function Test-CommandExists {
  param([string]$Name)

  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-DockerLogin {
  $configPath = Join-Path $HOME ".docker\config.json"
  if (-not (Test-Path $configPath)) {
    return $false
  }

  try {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    return $null -ne $config.auths -and $config.auths.PSObject.Properties.Count -gt 0
  } catch {
    return $false
  }
}

$config = Get-PublishConfig
$dockerUser = if ($config -and $config.dockerUser) { [string]$config.dockerUser } else { [string]$env:DOCKERHUB_USER }
$projectRoot = $PSScriptRoot
$versionScript = Join-Path $projectRoot "scripts\\prepare-docker-version.js"

if ([string]::IsNullOrWhiteSpace($ImageName)) {
  if ($config -and $config.imageName) {
    $ImageName = [string]$config.imageName
  } else {
    $ImageName = "bizyair2gemini"
  }
}

if ([string]::IsNullOrWhiteSpace($dockerUser)) {
  Write-Error "Missing Docker Hub username. Create .docker-publish.json from .docker-publish.example.json, or set DOCKERHUB_USER."
}

$gitStatus = git -C $projectRoot status --porcelain
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to read git status."
}

if (-not (Test-CommandExists "docker")) {
  Write-Error "Docker CLI is not installed or not in PATH."
}

docker info | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Error "Docker daemon is not available. Start Docker Desktop and try again."
}

if (-not $NoLogin -and -not (Test-DockerLogin)) {
  Write-Error "Docker Hub login not detected. Run 'docker login' first or pass -NoLogin only if you are already authenticated."
}

if (-not $AllowDirty -and -not [string]::IsNullOrWhiteSpace(($gitStatus | Out-String).Trim())) {
  Write-Error "Git working tree is not clean. Commit/stash changes first, or rerun with -AllowDirty."
}

$repo = "$dockerUser/$ImageName"

if ([string]::IsNullOrWhiteSpace($Version)) {
  $Version = node $versionScript
} else {
  $Version = node $versionScript --version $Version
}

if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to prepare version."
}

$versionTag = "$repo`:$Version"

Write-Host "Repository: $repo"
Write-Host "Version tag: $versionTag"

if (-not $NoLogin) {
  Write-Host "Logging in to Docker Hub..."
  docker login
}

Write-Host "Building image $versionTag ..."
docker build -t $versionTag $projectRoot

Write-Host "Pushing image $versionTag ..."
docker push $versionTag

if ($AlsoLatest -and $Version -ne "latest") {
  $latestTag = "$repo`:latest"
  Write-Host "Tagging $versionTag as $latestTag ..."
  docker tag $versionTag $latestTag

  Write-Host "Pushing image $latestTag ..."
  docker push $latestTag
}

Write-Host "Persisting version $Version to package.json ..."
node $versionScript --version $Version --commit | Out-Null

if ($LASTEXITCODE -ne 0) {
  Write-Error "Image publish succeeded, but failed to persist version to package.json."
}

Write-Host "Done."
