@echo off
echo *****************
echo * BUILDER START *
echo *****************
echo.

rem Checks versions from the Launcher package.json, and sets it into the %version% variable.
rem jq crashes for paths of files in folders, so we change directory to the one the file is in.
cd "dev\resources\app"
for /f %%i in ('..\..\..\jq.exe -r .version package.json') do set version=%%i
cd ..\..\..
rem Finds version from the Builder package.json.
for /f %%i in ('jq.exe -r .version package.json') do set versionB=%%i
if not "%version%" == "%versionB%" (
	echo The Launcher version %version% doesnt match the Builder version %versionB%.
	echo Make sure they are the same in "MXL_Launcher\package.json" and "MXL_Launcher\dev\resources\app\package.json".
	echo.
	pause
	exit
)
rem Finds version from the Builder package-lock.json.
for /f %%i in ('jq.exe -r .version package-lock.json') do set versionBL=%%i
if not "%version%" == "%versionBL%" (
	echo The Launcher version %version% doesnt match the Builder lock version %versionBL%.
	echo Make sure they are the same in "MXL_Launcher\package.json" and "MXL_Launcher\dev\resources\app\package-lock.json".
	echo.
	pause
	exit
)
echo The Launcher and Builder version is: %version%
echo.

echo Deleting old files.
IF EXIST "dist\win-ia32-unpacked" (rmdir "dist\win-ia32-unpacked" /s /q)
IF EXIST "dist\electron-builder.yaml" (del /q "dist\electron-builder.yaml")

echo Building the Launcher:
call npm run build
timeout 1 > nul
echo Building complete!
rem timeout 1 > nul

if /i not "%make_setup%" == "N" (call make_setup.bat)

echo.
echo **********************
echo * BUILDING FINISHED! *
echo **********************
echo.
if /i not "%skip_pause%" == "Y" (pause)