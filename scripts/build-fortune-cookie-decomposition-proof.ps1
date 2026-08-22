param(
  [ValidateSet("idle", "revealed")]
  [string]$State = "idle",
  [string]$OutputPath = ""
)

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$layerRoot = Join-Path $projectRoot "assets/fortune-cookie/layers"
if (-not $OutputPath) {
  $OutputPath = "assets/fortune-cookie/proofs/decomposition-$State-proof-v1.png"
}
$resolvedOutput = Join-Path $projectRoot $OutputPath
$outputDirectory = Split-Path -Parent $resolvedOutput
[IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

function Draw-Asset {
  param(
    [Drawing.Graphics]$Graphics,
    [string]$Path,
    [Drawing.Rectangle]$Destination,
    [single]$Brightness = 1.0
  )

  $image = [Drawing.Image]::FromFile($Path)
  $attributes = New-Object Drawing.Imaging.ImageAttributes
  $matrix = New-Object Drawing.Imaging.ColorMatrix
  $matrix.Matrix00 = $Brightness
  $matrix.Matrix11 = $Brightness
  $matrix.Matrix22 = $Brightness
  $attributes.SetColorMatrix($matrix)
  $Graphics.DrawImage(
    $image,
    $Destination,
    0,
    0,
    $image.Width,
    $image.Height,
    [Drawing.GraphicsUnit]::Pixel,
    $attributes
  )
  $attributes.Dispose()
  $image.Dispose()
}

function Draw-SoftEllipse {
  param(
    [Drawing.Graphics]$Graphics,
    [Drawing.Rectangle]$Bounds,
    [int]$MaximumAlpha
  )

  for ($step = 9; $step -ge 0; $step -= 1) {
    $insetX = [int](($Bounds.Width * 0.035) * $step)
    $insetY = [int](($Bounds.Height * 0.035) * $step)
    $rect = [Drawing.Rectangle]::new(
      ($Bounds.X + $insetX),
      ($Bounds.Y + $insetY),
      [Math]::Max(1, $Bounds.Width - $insetX * 2),
      [Math]::Max(1, $Bounds.Height - $insetY * 2)
    )
    $alpha = [int]($MaximumAlpha * (10 - $step) / 42)
    $brush = New-Object Drawing.SolidBrush([Drawing.Color]::FromArgb($alpha, 0, 0, 0))
    $Graphics.FillEllipse($brush, $rect)
    $brush.Dispose()
  }
}

$background = [Drawing.Bitmap]::FromFile((Join-Path $layerRoot "scene-clean-v1.png"))
$canvas = New-Object Drawing.Bitmap($background.Width, $background.Height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [Drawing.Graphics]::FromImage($canvas)
$graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceOver
$graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::HighQuality
$graphics.DrawImage($background, 0, 0, $background.Width, $background.Height)

Draw-SoftEllipse $graphics ([Drawing.Rectangle]::new(25, 1190, 837, 108)) 115
Draw-Asset $graphics (Join-Path $layerRoot "tray-clean-v1.png") ([Drawing.Rectangle]::new(-6, 820, 900, 512)) 0.72

if ($State -eq "idle") {
  $cookieRects = @(
    [Drawing.Rectangle]::new(45, 946, 260, 215),
    [Drawing.Rectangle]::new(324, 914, 240, 211),
    [Drawing.Rectangle]::new(582, 944, 260, 221)
  )
  $cookiePaths = @("cookie-01-v1.png", "cookie-02-v1.png", "cookie-03-v1.png")

  foreach ($rect in $cookieRects) {
    Draw-SoftEllipse $graphics ([Drawing.Rectangle]::new(($rect.X + 38), ($rect.Bottom - 42), ($rect.Width - 76), 42)) 125
  }

  for ($index = 0; $index -lt $cookiePaths.Count; $index += 1) {
    Draw-Asset $graphics (Join-Path $layerRoot $cookiePaths[$index]) $cookieRects[$index] 0.63
  }
} else {
  Draw-Asset $graphics (Join-Path $layerRoot "crumbs-02-v1.png") ([Drawing.Rectangle]::new(196, 1070, 500, 210)) 0.55
  $leftHalf = [Drawing.Rectangle]::new(190, 918, 235, 301)
  $rightHalf = [Drawing.Rectangle]::new(492, 918, 200, 302)
  Draw-SoftEllipse $graphics ([Drawing.Rectangle]::new(205, 1164, 205, 48)) 135
  Draw-SoftEllipse $graphics ([Drawing.Rectangle]::new(500, 1164, 185, 48)) 135
  Draw-Asset $graphics (Join-Path $layerRoot "cookie-left-half-v1.png") $leftHalf 0.58
  Draw-Asset $graphics (Join-Path $layerRoot "cookie-right-half-v1.png") $rightHalf 0.58
  Draw-SoftEllipse $graphics ([Drawing.Rectangle]::new(164, 857, 560, 52)) 80
  Draw-Asset $graphics (Join-Path $layerRoot "paper-strip-v1.png") ([Drawing.Rectangle]::new(118, 742, 650, 121)) 0.78
}

$graphics.Dispose()
$background.Dispose()
$canvas.Save($resolvedOutput, [Drawing.Imaging.ImageFormat]::Png)
$canvas.Dispose()

Write-Output $resolvedOutput
