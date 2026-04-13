@echo off
echo Generating PWA icons...
echo.

copy "public\icons\logo.png" "public\icons\icon-72x72.png"
echo Created icon-72x72.png

copy "public\icons\logo.png" "public\icons\icon-96x96.png"
echo Created icon-96x96.png

copy "public\icons\logo.png" "public\icons\icon-128x128.png"
echo Created icon-128x128.png

copy "public\icons\logo.png" "public\icons\icon-144x144.png"
echo Created icon-144x144.png

copy "public\icons\logo.png" "public\icons\icon-152x152.png"
echo Created icon-152x152.png

copy "public\icons\logo.png" "public\icons\icon-192x192.png"
echo Created icon-192x192.png

copy "public\icons\logo.png" "public\icons\icon-384x384.png"
echo Created icon-384x384.png

copy "public\icons\logo.png" "public\icons\icon-512x512.png"
echo Created icon-512x512.png

echo.
echo All PWA icons generated successfully!
echo.
pause
