@echo off

echo.
echo ******************************
echo *** UPDATES BUILDER  FILES ***
echo *** UPDATES LAUNCHER FILES ***
echo ******************************
echo.

echo Updates:
echo  	"MXL-Launcher\node_modules"
echo 	"MXL-Launcher\dev\resources\app\node_modules"
echo 	"MXL-Launcher\dev" (except the "MXL-Launcher\dev\resources\app" folder)
echo 	"MXL-Launcher\package.json"
echo 	"MXL-Launcher\package-lock.json"
echo 	"MXL-Launcher\dev\resources\app\package.json"
echo.
echo Before proceeding, it is a good idea to uninstall Node.js,
echo and then install it again to update it.
echo Don't forget to install "npm" with Node.js.
echo.
pause
echo.

echo Deleting files, but keeping neccesary ones.
rem Delete old node_modules, and any old leftover app folder.
IF EXIST "node_modules" (rmdir "node_modules" /s /q)
IF EXIST "dev\resources\app\node_modules" (rmdir "dev\resources\app\node_modules" /s /q)
IF EXIST "package-lock.json" (del /q "package-lock.json")
IF EXIST "app" (rmdir "app" /s /q)
mkdir "app"

rem Check if we have the files.
IF NOT EXIST "dev\resources\external" (
	echo "dev\resources\external" missing, aborting.
	pause
	exit
)
IF NOT EXIST "dev\resources\app" (
	echo "dev\resources\app" missing, aborting.
	pause
	exit
)
IF NOT EXIST "package.json" (
	echo "MXL-Launcher\package.json" missing, aborting.
	pause
	exit
)
IF NOT EXIST "dev\resources\app\package.json" (
	echo "MXL-Launcher\dev\resources\app\package.json" missing, aborting.
	pause
	exit
)

rem Copy app and external from the dev Launcher to the builder folder.
xcopy "dev\resources\app\*" "app\" /y /s /e /i /q /r
IF EXIST "external" (rmdir "external" /s /q)
mkdir "external"
IF NOT EXIST "dev\resources\external" (
	echo "dev\resources\external" missing.
	pause
	exit
)
xcopy "dev\resources\external\*" "external\" /y /s /e /i /q /r
timeout 1 > nul

rem Delete the dev Launcher folder, and then move the app and external folders to the dev Launcher folder.
IF EXIST "dev" (rmdir "dev" /s /q)
mkdir "dev\resources\external"
xcopy "external\*" "dev\resources\external\" /y /s /e /i /q /r
timeout 1 > nul
rmdir "external" /s /q
mkdir "dev\resources\app"
xcopy "app\*" "dev\resources\app\" /y /s /e /i /q /r
timeout 1 > nul
rmdir "app" /s /q

echo Getting module names, and deleting them from "MXL-Launcher\package.json" and "MXL-Launcher\dev\resources\app\package.json".
"jq.exe" -r ".devDependencies | to_entries[] | .key" "package.json" > "builder_modules.txt"
"jq.exe" "del(.devDependencies)" "package.json" > "temp_package.json"
timeout 1 > nul
del /q "package.json"
timeout 1 > nul
ren "temp_package.json" "package.json"
cd "dev\resources\app"
"..\..\..\jq.exe" -r ".dependencies | to_entries[] | .key" "package.json" > "..\..\..\launcher_modules.txt"
"..\..\..\jq.exe" "del(.dependencies)" "package.json" > "temp_package.json"
timeout 1 > nul
del /q "package.json"
timeout 1 > nul
ren "temp_package.json" "package.json"
cd "..\..\.."

echo Launcher modules:
for /f "tokens=*" %%A in (launcher_modules.txt) do echo   %%A
echo Builder modules:
for /f "tokens=*" %%A in (builder_modules.txt) do echo   %%A
echo.

echo Installing Launcher modules.
cd "dev\resources\app"
for /F "tokens=*" %%A in (..\..\..\launcher_modules.txt) do (
	echo Installing %%A.
	call npm install %%A
)
cd "..\..\.."
timeout 1 > nul
echo.
echo Installing Builder modules.
for /F "tokens=*" %%A in (builder_modules.txt) do (
	echo Installing %%A.
	call npm install %%A --save-dev
)
del /q "builder_modules.txt"
del /q "launcher_modules.txt"
timeout 1 > nul
echo.

echo Building new dev Launcher binaries.
echo.
set make_setup=N
set skip_pause=Y
call make.bat

echo Copying new Launcher binaries.
xcopy "dist\win-ia32-unpacked\*" "dev" /y /s /e /i /q /r
timeout 1 > nul
del /q "dev\resources\app.asar"

echo Deleting old files.
IF EXIST "dist\win-ia32-unpacked" (rmdir "dist\win-ia32-unpacked" /s /q)
IF EXIST "dist\electron-builder.yaml" (del /q "dist\electron-builder.yaml")
rem Delete "dist" if empty.
if exist "dist" (
	(dir /b /a "dist" | findstr .) > nul && (
		rem "dist" is not empty.
	) || (
		rmdir "dist" /s /q
	)
)

echo.
echo ************************
echo *** UPDATES FINISHED ***
echo ************************
echo.