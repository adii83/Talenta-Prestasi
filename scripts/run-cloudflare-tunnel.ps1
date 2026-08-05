$talentaCloudflared = Join-Path $env:LOCALAPPDATA 'Programs\cloudflared\cloudflared.exe'

if (-not (Test-Path -LiteralPath $talentaCloudflared)) {
  throw "cloudflared tidak ditemukan di $talentaCloudflared"
}

# Menggunakan token agar teman Anda bisa langsung menjalankan tunnel ini tanpa perlu login!
& $talentaCloudflared tunnel --no-autoupdate run --url http://127.0.0.1:8080 --token 'eyJhIjoiZDI1NWFjMDQ3OTg5YTdlYzg5MjRiMWU2ZWZkMTgwODciLCJzIjoiRFlYdnpNaGUyVTJLUUxXZzE2TnpUTTNaUDhqUW13VkFsQThua0lPLzN6ST0iLCJ0IjoiMjAzNTI5ZDItOTc2Zi00YmJlLWFmZjgtZmNkMzllMWIyNDBlIn0='
