Here are some of the details about building and source/resource files.

____

# Files
The three main scripts are:
* Create/update the Builder and Launcher modules, and the dev test version of the Launcher with [update.bat](update.bat).
* To publish, build the Launcher files/setup/update with [make.bat](make.bat). They are built to the [dist](dist) folder.
* Developer version of the Launcher is in [dev](dev) (accepts the */test=true* for online custom versions testing). Run it with [test.bat](test.bat).

Source files are split between the Launcher and Builder:
* Launcher source code is in [dev\resources\app](dev\resources\app).
* Setup and Update scripts sources are in the [installer](installer) folder.
* Launcher assets, mod installation files, and external resources are in [dev\resources\app\assets](dev\resources\app\assets), [dev\resources\app\installation](dev\resources\app\installation), and [dev\resources\external](dev\resources\external), respectively.


#### Files in detail
Located in the [root](https://github.com/Median-XL/) of the repository:
* [test.bat](test.bat) - quick testing of source code changes, also uses the online test environment that uses a cusom versions list file. I suggest you change `devTools.enableConsoleLog` option in [dev\resources\app\main.js](dev\resources\app\main.js) from `false` to `true` to see the command line debug output.
* [make.bat](make.bat) - builds the Launcher files/setup/update. Checks version number missmatches in all **package.json**s. Asks if update should contain just the app folder or all binaries.  
* [update.bat](update.bat) - updates the Launcher modules, Builder modules, and dev test version of the Launcher binaries and modules.
* [make_setup.bat](make_setup.bat) - makes the Setup and Updates for the Launcher in [dist](dist). Used by [make.bat](make.bat).
* [jq.exe](jq.exe) - tool for easy json manipulation.

Located in [dev\resources\app](dev\resources\app):
* [main.js](dev\resources\app\main.js) - main app file: app logic handling, load modules/includes, initialize state variables
* [const.js](dev\resources\app\const.js) - app constants: about, hotkeys, paths, file names, D2 file sizes/hashes, urls, registry keys/values, command line arguments
* [func-help.js](dev\resources\app\func-help.js) - app helper functions: string/json, logging/error, file read/write/hash, run, patch, unzip, download
* [func-main.js](dev\resources\app\func-main.js) - app main functions: checking D2 files, comparing versions, reading and writing data to settings/reg/error_log, downloading/installing/updating, handling states, etc.
* [reg.js](dev\resources\app\reg.js) - registry module: read/write
* [buttons.js](dev\resources\app\buttons.js) - button click event handling: close, min/max, open/close settings, play/install/update/restart
* [index.html](dev\resources\app\index.html) - main window layout and function
* [settings.html](dev\resources\app\settings.html) - settings window layout and function
* [installation](dev\resources\app\installation) - main and settings window css
* [assets](dev\resources\app\assets) - files used during mod installation

Located in [installer](installer):
* [setup.iss](installer\setup.iss) - setup script: compiles a installing/uninstalling script with Launcher files into an exe file
* [update.iss](installer\update.iss) - update script: compiles Launcher binary source code into a exe file that installs the update

____

# Build Median XL Launcher, Setup, and Update

Most of the building/compiling process is handled by the [make.bat](make.bat) batch file, which runs all the neccessary commands. The only thing left is updating version numbers before starting, and uploading the files to publish them at the end.

## PREREQUISITES
1. Install [Node.js](https://nodejs.org/en/download/), with *npm*.
2. Run [update.bat](update.bat) at least once after pulling the repository, or to update the Builder/Launcher modules.
3. (Optional) Install [Inno Setup 5](http://www.jrsoftware.org/download.php/ispack-unicode.exe) to get the *Inno Script Studio* editor to edit *Inno Setup Script* files more easily.

## BEFORE BUILDING
1. Turn all `devTools` options from [dev\resources\app\main.js](dev\resources\app\main.js) to `false`.
2. Make sure to update the version number in [dev\resources\app\package.json](dev\resources\app\package.json), [package.json](package.json), and [package-lock.json](package-lock.json).
3. Add old files that need to be deleted to `[InstallDelete]` section in [installer\setup.iss](installer\setup.iss) and [installer\update.iss](installer\update.iss).

## BUILDING
1. Run [make.bat](make.bat). This does all the magic.
2. When it's done, the Launcher, Setup, and Launcher Update will be in the [dist](dist) folder.

## PUBLISHING
1. Upload files to the appropriate location.
2. Add the new Launcher version to [http://get.median-xl.com/launcher/get.php?get=versions](http://get.median-xl.com/launcher/get.php?get=versions).
3. Commit to [MXL-Launcher](https://gitlab.com/Median-XL/MXL-Launcher), and create a tag with the new version numbers.

#### HOW TO CREATE/UPDATE THE BUILDER?
1. Check *Node.js* version `npm -v`. If it's outdated, update with `npm -g i npm`. If that doesn't work uninstall *Node.js* and install it again to get the new version.
2. (Optional) To create a new Builder folder, copy [package.json](package.json), [make.bat](make.bat), [make_setup.bat](make_setup.bat), [test.bat](test.bat), [update.bat](update.bat), [jq.exe](jq.exe), [installer](installer), and [dev](dev) to a new folder.
3. Run [update.bat](update.bat) in the Builder folder you wish to create/update.

____

# Create Median XL mod Update
1. 7-zip **patch_d2.mpq** to **X.X.X.7z** with the *maximum* compression level (where the X's are the median version numbers), and upload it to the appropriate location.
2. Create an *xdelta* difference patch from the last to the new version: `"path to xdelta3.exe" -v -f -A= -S lzma -9 -B 419430400 -W 16777216 -s "path to the old patch_d2.mpq" "path to the new patch_d2.mpq" "X.X.X.update"`.
3. Upload the *xdelta* difference patch **X.X.X.update** to the appropriate location.
4. Calculate the *sha1 hash* of the new **patch_d2.mpq**. Open the *command prompt* and type `"path to 7za.exe" h -scrcsha1 "path to patch_d2.mpq"` in the command prompt (**7za.exe** is in [dev\resources\external\7za.exe](dev\resources\external\7za.exe)).
5. Add the new version numbers/name/hash/size to [http://get.median-xl.com/launcher/get.php?get=versions](http://get.median-xl.com/launcher/get.php?get=versions).
6. 7-zip **msvcr110.dll**, **Fog.dll**, and **MXL.dll** to **X.X.X.dll.update** and upload it to the appropriate location.
7. Update the variable `Fog_dll_m2017_sha1` in [dev\resources\app\const.js](dev\resources\app\const.js) with the **Fog.dll** *sha1 hash*, if it was changed.
8. Commit to [MXL-Launcher](https://gitlab.com/Median-XL/MXL-Launcher), and create a tag with the new version numbers.

____

#### EXTRA
* It is important that [dev\resources\app\assets\img\icon.ico](dev\resources\app\assets\img\icon.ico) is generated from a 256x256 image.
* *xdelta* - creating a patch: `"path to xdelta3.exe" -v -f -A= -S lzma -9 -B 419430400 -W 16777216 -s "path_original_file" "path_new_file" "path_xpatch_file"`, and applying a patch: `"path to xdelta3.exe" -d -f -s "path_original_file" "path_xpatch_file" "path_new_file"`.
* SHA1 hash of files can be calculated with `"path to 7za.exe" h -scrcsha1 "path to file"`.
* **\*.asar** files can be packed with `asar pack "path_source_folder" "path_filename.asar"`, and unpacked with `asar extract "path_filename.asar" "path_destination_folder"` if you have *asar* installed (`npm install asar -g` to install).
* 
* You can manually change the metadata/icons of executables with the [ResourceHacker](http://www.angusj.com/resourcehacker/resource_hacker.zip) program instead of doing it with **package.json**s and *Inno Setup* scripts.