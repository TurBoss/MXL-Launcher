@echo off
echo *****************
echo * BUILDER START *
echo *****************
echo.

rem Finds version from the Launcher package.json.
for /f "delims=" %%a in ('findstr /i "version" dev\resources\app\package.json') do set "version=%%a"
for /f "tokens=1,2 delims=:" %%a in ("%version%") do set version=%%b
set version=%version:"=%
set version=%version:,=%
set version=%version: =%
set version=%version:	=%
echo The Launcher version is: %version%
echo.

rem Finds version from the Builder package.json.
for /f "delims=" %%a in ('findstr /i "version" package.json') do set "versionB=%%a"
for /f "tokens=1,2 delims=:" %%a in ("%versionB%") do set versionB=%%b
set versionB=%versionB:"=%
set versionB=%versionB:,=%
set versionB=%versionB: =%
set versionB=%versionB:	=%
if not "%version%" == "%versionB%" (
	echo The Launcher version %version% doesnt match the Builder version %versionB%.
	echo Make sure they are the same in "MXL_Launcher\package.json" and "MXL_Launcher\dev\resources\app\package.json".
	echo.
	pause
	exit
)

rem Finds version from the Builder package-lock.json.
for /f "delims=" %%a in ('findstr /i "version" package-lock.json') do (
	set "versionBL=%%a"
	goto bl
)
:bl
for /f "tokens=1,2 delims=:" %%a in ("%versionBL%") do set versionBL=%%b
set versionBL=%versionBL:"=%
set versionBL=%versionBL:,=%
set versionBL=%versionBL: =%
set versionBL=%versionBL:	=%
if not "%version%" == "%versionBL%" (
	echo The Launcher version %version% doesnt match the Builder lock version %versionBL%.
	echo Make sure they are the same in "MXL_Launcher\package.json" and "MXL_Launcher\dev\resources\app\package-lock.json".
	echo.
	pause
	exit
)

echo Do you want to include all the Launcher files in the update file?
echo Usually only the "MXL_Launcher\dev\resources\app" and "MXL_Launcher\dev\resources\extra" folders are included. (y/[n])
set /p pack_launcher=

echo Deleting old files.
IF EXIST "dist\win-ia32-unpacked" (rmdir "dist\win-ia32-unpacked" /s /q)
IF EXIST "dist\electron-builder.yaml" (del /q "dist\electron-builder.yaml")

echo Building the Launcher:
call npm run build
echo Building complete!
timeout 1 > nul

echo Compiling the Setup:
"installer\Inno Setup 5 mini\iscc.exe" /Qp "installer\setup.iss"
echo Compiling complete!
timeout 1 > nul

echo Compiling the update "MXL_Launcher\dist\MXL_Update_v%version%.exe":
if /i "%pack_launcher%" == "Y" (
	echo Included the Launcher files.
	"installer\Inno Setup 5 mini\iscc.exe" /Qp "/DIncludeLauncherFiles=1" "installer\update.iss"
) else (
	echo Did NOT include the Launcher files.
	"installer\Inno Setup 5 mini\iscc.exe" /Qp "installer\update.iss"
)
echo Compiling complete!
timeout 1 > nul

echo Renaming the Launcher folder: "MXL_Launcher\dist\win-ia32-unpacked" to "MXL_Launcher\dist\MXL_Launcher_v%version%.0".
xcopy "dist\win-ia32-unpacked\*" "dist\MXL_Launcher_v%version%.0\" /y /s /e /i /q /r
timeout 1 > nul

echo Cleaning up files.
IF EXIST "dist\win-ia32-unpacked" (rmdir "dist\win-ia32-unpacked" /s /q)
IF EXIST "dist\electron-builder.yaml" (del /q "dist\electron-builder.yaml")

echo.
echo **********************
echo * BUILDING FINISHED! *
echo **********************
echo.
pause