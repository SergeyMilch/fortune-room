Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$sourceRoot = Join-Path $projectRoot "assets/fortune-cookie/layers"
$targetRoot = Join-Path $projectRoot "assets/fortune-cookie/runtime"
[IO.Directory]::CreateDirectory($targetRoot) | Out-Null

function Export-Layer {
  param(
    [string]$SourceName,
    [string]$TargetName,
    [int]$MaximumWidth,
    [int]$MaximumHeight,
    [single]$Brightness
  )

  $source = [Drawing.Bitmap]::FromFile((Join-Path $sourceRoot $SourceName))
  $scale = [Math]::Min(1.0, [Math]::Min($MaximumWidth / $source.Width, $MaximumHeight / $source.Height))
  $width = [Math]::Max(1, [int][Math]::Round($source.Width * $scale))
  $height = [Math]::Max(1, [int][Math]::Round($source.Height * $scale))
  $target = New-Object Drawing.Bitmap($width, $height, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [Drawing.Graphics]::FromImage($target)
  $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
  $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
  $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $attributes = New-Object Drawing.Imaging.ImageAttributes
  $matrix = New-Object Drawing.Imaging.ColorMatrix
  $matrix.Matrix00 = $Brightness
  $matrix.Matrix11 = $Brightness
  $matrix.Matrix22 = $Brightness
  $attributes.SetColorMatrix($matrix)
  $graphics.DrawImage(
    $source,
    [Drawing.Rectangle]::new(0, 0, $width, $height),
    0,
    0,
    $source.Width,
    $source.Height,
    [Drawing.GraphicsUnit]::Pixel,
    $attributes
  )
  $target.Save((Join-Path $targetRoot $TargetName), [Drawing.Imaging.ImageFormat]::Png)
  $attributes.Dispose()
  $graphics.Dispose()
  $target.Dispose()
  $source.Dispose()
  Write-Output "$TargetName ${width}x${height}"
}

Export-Layer "scene-clean-v1.png" "scene-background.png" 887 1774 1.0
Export-Layer "tray-clean-v1.png" "tray.png" 1200 760 0.72
Export-Layer "cookie-01-v1.png" "cookie-01.png" 680 620 0.63
Export-Layer "cookie-02-v1.png" "cookie-02.png" 680 620 0.63
Export-Layer "cookie-03-v1.png" "cookie-03.png" 680 620 0.63
Export-Layer "cookie-left-half-v1.png" "cookie-left-half.png" 680 760 0.58
Export-Layer "cookie-right-half-v1.png" "cookie-right-half.png" 680 760 0.58
Export-Layer "paper-strip-v1.png" "paper-strip.png" 1300 320 0.78
Export-Layer "crumbs-01-v1.png" "crumbs-01.png" 760 620 0.55
Export-Layer "crumbs-02-v1.png" "crumbs-02.png" 760 420 0.55
Export-Layer "crumbs-03-v1.png" "crumbs-03.png" 760 420 0.55
