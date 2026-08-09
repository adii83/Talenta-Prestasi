$talentaCloudflared = Join-Path $env:LOCALAPPDATA 'Programs\cloudflared\cloudflared.exe'
$talentaConfig = Join-Path $env:USERPROFILE '.cloudflared\config.yml'

if (-not (Test-Path -LiteralPath $talentaCloudflared)) {
  throw "cloudflared tidak ditemukan di $talentaCloudflared"
}

if (-not (Test-Path -LiteralPath $talentaConfig)) {
  throw "Konfigurasi Cloudflare Tunnel tidak ditemukan di $talentaConfig"
}

& $talentaCloudflared tunnel --no-autoupdate --config $talentaConfig run
