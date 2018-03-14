@echo off
set Counter = 1
:loop
set /a Counter = %Counter%+1
IF %Counter% == 300 (
	goto :end
)
timeout 1 > nul
IF EXIST "..\..\Update_v*.exe" (
	del "..\..\Update_v*.exe" /f /q
	IF NOT %errorlevel% == 0 (
		goto :loop
	)
)
:end
rem deletes itself
(goto) 2>nul & del "%~f0"