#define MyAppName "Median XL"
#define MyAppExeName "Median XL.exe"
#define MyAppVersion GetFileVersion("..\dist\win-ia32-unpacked\" + MyAppExeName)
#define MyAppPublisher "Quirinus, Marco"
#define MyAppURL "https://median-xl.com"
#define MyAppSupportURL "https://forum.median-xl.com/viewforum.php?f=42"
#define RegAppCompatFlags "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers"
#define RegD2 "Software\Blizzard Entertainment\Diablo II"
#define RegD2BattleNet "Software\Battle.net\Configuration"
#define RegD2BattleNet_ValueName "Diablo II Battle.net Gateways"
#define RegLauncher "Software\Median"
#define RegLauncherD2Path_ValueName "D2InstallPath"
#define UninstallMedianRollbackFolder "MedianUninsRollback"
#define SetupName "MXL_Setup"

[Setup]
;app info
AppId={{649749D9-C274-4CF3-9617-2ED6BB20333E}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} Launcher {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppSupportURL}
AppUpdatesURL={#MyAppURL}
;AppCopyright=
;AppComments=
AppContact={#MyAppSupportURL}
MinVersion=6.0

;setup.exe info:
VersionInfoVersion={#MyAppVersion}
VersionInfoProductVersion={#MyAppVersion}
DefaultDirName={code:getD2DirName}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
DisableReadyPage=yes
DisableFinishedPage=yes
;DisableDirPage if not installed it will ask for location, if installed it will auto find 
DisableDirPage=auto
;relative to the *.iss file
OutputDir=..\dist
OutputBaseFilename={#SetupName}_v{#MyAppVersion}
SetupIconFile=..\dev\resources\app\assets\img\icon.ico
UninstallDisplayIcon={uninstallexe}
Compression=lzma2/max
SolidCompression=yes
;CreateCustomForm
;PrepareToInstall Preparing to Install
PrivilegesRequired=lowest
;https://stackoverflow.com/a/21565479/2331033
;UsePreviousAppDir=no 

[Languages]
;installer messages language
Name: "english"; MessagesFile: "compiler:Default.isl"

[InstallDelete]
;delete these before installing, mostly legacy files, just in case
Type: filesandordirs; Name: "{app}\resources\app"
Type: files; Name: "{app}\resources\external\certutil.exe"
Type: files; Name: "{app}\resources\external\certadm.dll"
Type: files; Name: "{app}\resources\external\postupdate.bat"
Type: files; Name: "{app}\resources\external\postupdate.vbs"
Type: files; Name: "{app}\resources\external\update.bat"
Type: files; Name: "{app}\resources\external\update.vbs"
Type: files; Name: "{app}\resources\external\restart.bat"
Type: files; Name: "{app}\resources\external\restart.vbs"
Type: files; Name: "{app}\resources\external\delete_update.bat"

[Code]
function isEmptyDir(dirName: String): Boolean;
var
  FindRec: TFindRec;
  FileCount: Integer;
begin
  Result := False;
  if FindFirst(dirName+'\*', FindRec) then begin
    try
      repeat
        if (FindRec.Name <> '.') and (FindRec.Name <> '..') then begin
          FileCount := 1;
          break;
        end;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
      if FileCount = 0 then Result := True;
    end;
  end;
end;

//check if we're running the Installer as admin, and warn user
function InitializeSetup: boolean;
var
  Admin: Boolean;
begin
  Admin := IsAdminLoggedOn;
  Result := True;
  if not Admin then
  begin
    if MsgBox('Please run the Installer as administrator.' + #13#10 + 'Continue anyway?', mbError, MB_YESNO or MB_DEFBUTTON2) = IDYES then
      Result := True
    else begin
      Result := False;
      exit;
    end;
  end;
end;

//https://stackoverflow.com/a/12968086/2331033
//check if we're installing in Program Files, and warn user
function NextButtonClick(PageId: Integer): Boolean;
begin
    Result := True;
    if (PageId = wpSelectDir) and (Pos('Program Files', WizardDirValue) <> 0) then  //FileExists(ExpandConstant('{app}\yourapp.exe')) //(AnsiContainStr(WizardDirValue, 'Program Files')
    begin
        if MsgBox('It is NOT recommended to install in the Program Files folder.' + #13#10 + 'Install anyway?', mbInformation, MB_YESNO or MB_DEFBUTTON2) = IDYES then //mbConfirmation
          Result := True
        else begin
          Result := False;
          exit;
        end;
    end;
end;

//http://stackoverflow.com/a/2099805/2331033 - delete old installation before installing new. not really needed

//this section changes the 'Next' button label to 'Reinstall', if the Launcher is already installed
procedure CurPageChanged(CurPageID: Integer);
begin
	if CurPageID = wpSelectDir then
		WizardForm.NextButton.Caption := SetupMessage(msgButtonInstall)
	else if CurPageID = wpReady then
		WizardForm.NextButton.Caption := 'Reinstall'
	else
		WizardForm.NextButton.Caption := SetupMessage(msgButtonNext);
end;

//get d2 folder path from registry
function getD2DirName (Value: String): String;
var
  InstallPath: String;
begin
	if RegQueryStringValue(HKEY_CURRENT_USER, '{#RegD2}', 'InstallPath', InstallPath) then
		Result := InstallPath
	else if RegQueryStringValue(HKEY_LOCAL_MACHINE, '{#RegD2}', 'InstallPath', InstallPath) then
		Result := InstallPath
	else
		Result := 'C:';
end;

//what to do after uninstall?
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  Gateways: String;
  LauncherReg_D2InstallPath: String;
  ErrorCode: Integer;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    //restore normal D2 gateways to reg
    Gateways := '1002' + #0 + '02' + #0 + 'uswest.battle.net' + #0 + '8' + #0 + 'U.S. West' + #0 + 'useast.battle.net' + #0 + '6' + #0 + 'U.S. East' + #0 + 'asia.battle.net' + #0 + '-9' + #0 + 'Asia' + #0 + 'europe.battle.net' + #0 + '-1' + #0 + 'Europe';
    RegWriteMultiStringValue(HKEY_CURRENT_USER, '{#RegD2BattleNet}', '{#RegD2BattleNet_ValueName}', Gateways);
    RegWriteMultiStringValue(HKEY_LOCAL_MACHINE, '{#RegD2BattleNet}', '{#RegD2BattleNet_ValueName}', Gateways);
    RegDeleteValue(HKEY_CURRENT_USER, '{#RegD2}', 'BNETIP');
    RegDeleteValue(HKEY_LOCAL_MACHINE, '{#RegD2}', 'BNETIP');

    //here we restore old D2 files, before Median was installed
//     if RegQueryStringValue(HKEY_CURRENT_USER, '{#RegLauncher}', '{#RegLauncherD2Path_ValueName}', LauncherReg_D2InstallPath) then
//     begin
//           MsgBox('Value is "' + LauncherReg_D2InstallPath + '"', mbInformation, MB_OK);
//           
//           if LauncherReg_D2InstallPath <> ''  then
//                  MsgBox('Value is not empty ' + LauncherReg_D2InstallPath, mbInformation, MB_OK);
//           LauncherReg_D2InstallPath := LauncherReg_D2InstallPath + '\' + '{#UninstallMedianRollbackFolder}';
//           MsgBox('Value is "' + LauncherReg_D2InstallPath, mbInformation, MB_OK);
//           MsgBox('Value is "' + LauncherReg_D2InstallPath + '\' + '{#UninstallMedianRollbackFolder}', mbInformation, MB_OK);
//           if DirExists(LauncherReg_D2InstallPath + '\' + '{#UninstallMedianRollbackFolder}') then
//                  MsgBox('Dir exists ' + LauncherReg_D2InstallPath + '\' + '{#UninstallMedianRollbackFolder}', mbInformation, MB_OK)
//           else
//                  MsgBox('Dir does not exist ' + LauncherReg_D2InstallPath + '\' + '{#UninstallMedianRollbackFolder}', mbInformation, MB_OK);
//                 
//          if (LauncherReg_D2InstallPath <> '') and (DirExists(LauncherReg_D2InstallPath + '\' + '{#UninstallMedianRollbackFolder}')) then
//          begin
//             MsgBox('rollback ', mbInformation, MB_OK);
//             ShellExec('', 'cmd.exe', 'move "*.*" "..\"', LauncherReg_D2InstallPath + '\' + '{#UninstallMedianRollbackFolder}', SW_HIDE, ewWaitUntilIdle, ErrorCode);
//             if (ErrorCode <> 0) then MsgBox('error moving files: ' + IntToStr(ErrorCode), mbInformation, MB_OK);
//             DelTree(LauncherReg_D2InstallPath + '\' + '{#UninstallMedianRollbackFolder}', True, True, True);
//          end;
//     end;

    //delete settings, error_log, unused updates, launcher reg?
    if MsgBox('Do you want to keep the Launcher settings and any leftover files in the Launcher folder?', mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDNO then
    begin
      DelTree(ExpandConstant('{app}\settings.json'), False, True, False);
      DelTree(ExpandConstant('{app}\error_log.txt'), False, True, False);
      if DirExists(ExpandConstant('{app}')) and isEmptyDir(ExpandConstant('{app}')) then
      begin
         DelTree(ExpandConstant('{app}'), True, True, True);
      end;
      //DelTree(ExpandConstant('{app}'), True, True, True);
      //RegDeleteKeyIncludingSubkeys(HKEY_CURRENT_USER, '{#RegLauncher}');
    end;
  end;
end;

[Files]
;source files we use to build the installer
Source: "..\dist\win-ia32-unpacked\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs
;ignoreversion

[Icons]
;add Launcher icon to desktop, and create a start menu group with the Launcher and Uninstaller
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{app}\Uninstall"; Filename: "{uninstallexe}"

[Registry]
;make the launcher run as admin
Root: HKCU; Subkey: "{#RegAppCompatFlags}"; ValueType: string; ValueName: "{app}\{#MyAppExeName}"; ValueData: "~ RUNASADMIN"; Flags: noerror deletevalue uninsdeletevalue

[Run]
;run the launcher after install only if we have admin privileges. if the setup was ran with the /test command line parameter, forward it to the Launcher
Filename: "{app}\{#MyAppExeName}"; Parameters: "/test={param:true|false}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent; Check: IsAdminLoggedOn