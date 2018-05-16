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
	echo Make sure they are the same in "package.json" and "dev\resources\app\package.json".
	echo.
	pause
	exit
)
rem Finds version from the Builder package-lock.json.
for /f %%i in ('jq.exe -r .version package-lock.json') do set versionBL=%%i
if not "%version%" == "%versionBL%" (
	echo The Launcher version %version% doesnt match the Builder lock version %versionBL%.
	echo Make sure they are the same in "package.json" and "dev\resources\app\package-lock.json".
	echo.
	pause
	exit
)
echo The Launcher and Builder version is: %version%
echo.

echo Deleting old files.
IF EXIST "dist\win-ia32-unpacked" (rmdir "dist\win-ia32-unpacked" /s /q)
IF EXIST "dist\electron-builder.yaml" (del /q "dist\electron-builder.yaml")
echo.

if /i not "%make_setup%" == "N" (
	echo Make sure all "devTools" options from
	echo "dev\resources\app\main.js" are "false" before continuing.
	pause
	echo.
)

echo Building the Launcher:
call npm run build
timeout 1 > nul
echo Building complete!
echo.
rem timeout 1 > nul

echo Changing the Launcher executable to use the UAC Prompt to ask for Admin rights:
rem Extract the manifest. It is important that the mainfest file doesn't contain spaces in the name, otherwise the for+findstr functions freak out.
set "target_file=dist\win-ia32-unpacked\Median XL.exe"
set "manifest_file=MedianXL.manifest"
mt.exe -inputresource:"%target_file%";#1 -out:"%manifest_file%"
timeout 1 > nul
rem Edit the manifest to require admin rights.
set "replace=asInvoker"
set "replaced=requireAdministrator"
setlocal enableDelayedExpansion
(
   for /F "tokens=1* delims=:" %%a in ('findstr /N "^" %manifest_file%') do (
      set "line=%%b"
      if defined line set "line=!line:%replace%=%replaced%!"
      echo !line!
   )
) > "%manifest_file%.tmp"
endlocal
rem Put the changed manifest into the executable.
mt.exe -manifest "%manifest_file%.tmp" -outputresource:"%target_file%";1
timeout 1 > nul
IF EXIST "%manifest_file%" (del /q "%manifest_file%")
IF EXIST "%manifest_file%.tmp" (del /q "%manifest_file%.tmp")
echo.

echo Copying the License file:
copy /Y "LICENSE" "dist\win-ia32-unpacked\LICENSE.txt"
echo.

if /i not "%make_setup%" == "N" (call make_setup.bat)

echo.
echo **********************
echo * BUILDING FINISHED! *
echo **********************
echo.
if /i not "%skip_pause%" == "Y" (pause)