#define MyAppName "Median Launcher Update"
#define MyAppExeName "Median XL.exe"
#define MyAppVersion GetFileVersion("..\dist\win-ia32-unpacked\" + MyAppExeName)
#define MyAppPublisher "Quirinus, Marco"
#define MyAppURL "https://median-xl.com"
#define MyAppSupportURL "https://forum.median-xl.com/viewforum.php?f=42"
;provided from the command line when compiling, if defined it adds launcher files, if not defined it doesn't:
;#define IncludeLauncherFiles 1
;"/DIncludeLauncherFiles=1"

[Setup]
;app info
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppSupportURL}
AppUpdatesURL={#MyAppURL}
;AppCopyright=
;AppComments=
AppContact={#MyAppSupportURL}

;setup.exe info:
VersionInfoVersion={#MyAppVersion}
VersionInfoProductVersion={#MyAppVersion}
DefaultDirName={src}
DisableProgramGroupPage=yes
DisableReadyPage=yes
DisableFinishedPage=yes
DisableDirPage=yes
;relative to the *.iss file
OutputDir=..\dist
OutputBaseFilename=MXL_Update_v{#MyAppVersion}
SetupIconFile=..\dev\resources\app\assets\img\icon.ico
Compression=lzma2/max
SolidCompression=yes
;CreateCustomForm
;PrepareToInstall Preparing to Install
PrivilegesRequired=admin

[Languages]
;installer messages language
Name: "english"; MessagesFile: "compiler:Default.isl"

[Setup]
Uninstallable=False

[InstallDelete]
;delete these before installing (files from previous versions)
Type: filesandordirs; Name: "{src}\resources\app"
Type: files; Name: "{src}\resources\external\certutil.exe"
Type: files; Name: "{src}\resources\external\certadm.dll"
Type: files; Name: "{src}\resources\external\postupdate.bat"
Type: files; Name: "{src}\resources\external\postupdate.vbs"
Type: files; Name: "{src}\resources\external\update.bat"
Type: files; Name: "{src}\resources\external\update.vbs"
Type: files; Name: "{src}\resources\external\restart.bat"
Type: files; Name: "{src}\resources\external\restart.vbs"
Type: files; Name: "{src}\resources\external\delete_update.bat"

[Files]
Source: "..\dist\win-ia32-unpacked\resources\*"; DestDir: "{src}\resources"; Flags: recursesubdirs createallsubdirs
;Source: "delete_update.bat"; DestDir: "{src}\resources\external"
#ifdef IncludeLauncherFiles
    Source: "..\dist\win-ia32-unpacked\*.*"; DestDir: "{src}"
#endif

[Run] 
;Filename: "{src}\resources\external\delete_update.bat"; WorkingDir: "{src}\resources\external\"; Description: "Deletes the update and itself"; Flags: nowait postinstall runhidden;

;run the launcher after update only if we have admin privileges. if the upate is ran with the /test=true command line parameter, forward it to the Launcher
Filename: "{src}\{#MyAppExeName}"; Parameters: "/test={param:true|false}"; Description: "Run the Launcher"; Flags: nowait postinstall; Check: IsAdminLoggedOn