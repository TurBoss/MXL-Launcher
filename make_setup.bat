echo Compiling the Setup:
"installer\Inno Setup 5 mini\iscc.exe" /Qp "installer\setup.iss"
echo Compiling complete!
timeout 1 > nul
echo.

echo Do you want to include all the Launcher files in the update file?
echo Usually only the "dev\resources\app" and "dev\resources\extra" folders are included. (y/[n])
set /p pack_launcher=

echo Compiling the update "dist\MXL_Update_v%version%.exe":
if /i "%pack_launcher%" == "Y" (
	echo Included the Launcher files.
	"installer\Inno Setup 5 mini\iscc.exe" /Qp "/DIncludeLauncherFiles=1" "installer\update.iss"
) else (
	echo Did NOT include the Launcher files.
	"installer\Inno Setup 5 mini\iscc.exe" /Qp "installer\update.iss"
)
echo Compiling complete!
timeout 1 > nul
ren "dist\MXL_Update_v%version%.0.exe" "MXL_Update_v%version%.exe"

echo Renaming the Launcher folder: "dist\win-ia32-unpacked" to "dist\MXL_Launcher_v%version%.0".
xcopy "dist\win-ia32-unpacked\*" "dist\MXL_Launcher_v%version%.0\" /y /s /e /i /q /r
timeout 1 > nul

echo Cleaning up files.
IF EXIST "dist\win-ia32-unpacked" (rmdir "dist\win-ia32-unpacked" /s /q)
IF EXIST "dist\electron-builder.yaml" (del /q "dist\electron-builder.yaml")