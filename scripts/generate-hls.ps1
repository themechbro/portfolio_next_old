param(
  [Parameter(Mandatory = $false)]
  [string]$InputPath = "public/videos/linkedup.mp4",

  [Parameter(Mandatory = $false)]
  [string]$OutputDir = "public/videos/linkedup-hls"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
  throw "ffmpeg is not available in PATH. Install ffmpeg and try again."
}

if (-not (Test-Path -Path $InputPath)) {
  throw "Input file not found: $InputPath"
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$renditions = @(
  @{
    Name = "1080p"
    Scale = "1920:1080"
    Bitrate = "5000k"
    MaxRate = "5350k"
    BufSize = "7500k"
    Bandwidth = 5500000
    AvgBandwidth = 5000000
    Resolution = "1920x1080"
    Codec = "avc1.640028,mp4a.40.2"
  },
  @{
    Name = "720p"
    Scale = "1280:720"
    Bitrate = "2800k"
    MaxRate = "2996k"
    BufSize = "4200k"
    Bandwidth = 3100000
    AvgBandwidth = 2800000
    Resolution = "1280x720"
    Codec = "avc1.4d401f,mp4a.40.2"
  },
  @{
    Name = "480p"
    Scale = "854:480"
    Bitrate = "1400k"
    MaxRate = "1498k"
    BufSize = "2100k"
    Bandwidth = 1600000
    AvgBandwidth = 1400000
    Resolution = "854x480"
    Codec = "avc1.4d401e,mp4a.40.2"
  }
)

foreach ($rendition in $renditions) {
  $variantDir = Join-Path $OutputDir $rendition.Name
  New-Item -ItemType Directory -Path $variantDir -Force | Out-Null

  $segmentPattern = Join-Path $variantDir "segment_%03d.ts"
  $playlistPath = Join-Path $variantDir "index.m3u8"

  & ffmpeg -y -i $InputPath `
    -vf "scale=$($rendition.Scale):force_original_aspect_ratio=decrease:force_divisible_by=2" `
    -c:v libx264 -profile:v main -preset veryfast `
    -b:v $rendition.Bitrate -maxrate $rendition.MaxRate -bufsize $rendition.BufSize `
    -g 48 -keyint_min 48 -sc_threshold 0 `
    -c:a aac -ar 48000 -b:a 128k -ac 2 `
    -f hls -hls_time 6 -hls_playlist_type vod -hls_flags independent_segments `
    -hls_segment_filename $segmentPattern `
    $playlistPath

  if ($LASTEXITCODE -ne 0) {
    throw "ffmpeg failed while generating $($rendition.Name) rendition."
  }
}

$masterLines = @(
  "#EXTM3U",
  "#EXT-X-VERSION:3"
)

foreach ($rendition in $renditions) {
  $masterLines += "#EXT-X-STREAM-INF:BANDWIDTH=$($rendition.Bandwidth),AVERAGE-BANDWIDTH=$($rendition.AvgBandwidth),RESOLUTION=$($rendition.Resolution),CODECS=""$($rendition.Codec)"""
  $masterLines += "$($rendition.Name)/index.m3u8"
}

$masterPath = Join-Path $OutputDir "master.m3u8"
$masterText = ($masterLines -join "`n") + "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($masterPath, $masterText, $utf8NoBom)

Write-Output "HLS renditions generated successfully:"
Write-Output "Input:  $InputPath"
Write-Output "Output: $OutputDir"
Write-Output "Master playlist: $masterPath"
