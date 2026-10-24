@echo off
title Rubinot RC Profit Calculator - Build
echo.
echo Instalando dependencias...
npm install
if errorlevel 1 (
  echo.
  echo ERROR: fallo npm install
  pause
  exit /b 1
)
echo.
echo Compilando instalador Windows...
npm run build
if errorlevel 1 (
  echo.
  echo ERROR: fallo la compilacion
  pause
  exit /b 1
)
echo.
echo Instalador generado en la carpeta dist
pause
