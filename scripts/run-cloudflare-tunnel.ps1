$talentaCloudflared = Join-Path $env:LOCALAPPDATA 'Programs\cloudflared\cloudflared.exe'

if (-not (Test-Path -LiteralPath $talentaCloudflared)) {
  throw "cloudflared tidak ditemukan di $talentaCloudflared"
}

& $talentaCloudflared tunnel run 'talenta-local-test'
