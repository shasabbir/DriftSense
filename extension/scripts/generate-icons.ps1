Add-Type -AssemblyName System.Drawing

$outputDirectory = Join-Path $PSScriptRoot '..\public\icons'
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null

foreach ($size in @(16, 32, 48, 128)) {
    $bitmap = [System.Drawing.Bitmap]::new([int]$size, [int]$size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)

    $inset = [Math]::Max(1, [Math]::Round($size * 0.07))
    $radius = [Math]::Max(3, [Math]::Round($size * 0.20))
    $bounds = [System.Drawing.RectangleF]::new([float]$inset, [float]$inset, [float]($size - (2 * $inset)), [float]($size - (2 * $inset)))
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = 2 * $radius
    $path.AddArc($bounds.Left, $bounds.Top, $diameter, $diameter, 180, 90)
    $path.AddArc($bounds.Right - $diameter, $bounds.Top, $diameter, $diameter, 270, 90)
    $path.AddArc($bounds.Right - $diameter, $bounds.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($bounds.Left, $bounds.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()

    $background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(22, 123, 90))
    $graphics.FillPath($background, $path)

    $penWidth = [Math]::Max(1.4, $size * 0.075)
    $pen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, [float]$penWidth)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $points = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new([float]($size * 0.20), [float]($size * 0.54)),
        [System.Drawing.PointF]::new([float]($size * 0.34), [float]($size * 0.54)),
        [System.Drawing.PointF]::new([float]($size * 0.43), [float]($size * 0.34)),
        [System.Drawing.PointF]::new([float]($size * 0.56), [float]($size * 0.70)),
        [System.Drawing.PointF]::new([float]($size * 0.66), [float]($size * 0.47)),
        [System.Drawing.PointF]::new([float]($size * 0.80), [float]($size * 0.47))
    )
    $graphics.DrawLines($pen, $points)

    $target = Join-Path $outputDirectory "icon-$size.png"
    $bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)

    $pen.Dispose()
    $background.Dispose()
    $path.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
}
