'use strict';

/********* MODULES ********/

if (typeof async === 'undefined') global.async = require('async'); //for chaining or parallel async callbacks
if (typeof app === 'undefined') global.app = require('electron').app;
if (typeof BrowserWindow === 'undefined') global.BrowserWindow = require('electron').BrowserWindow;

/********* EXPORTS ********/

var export_func =
[
	getLauncherVersion,
	saveD2PathToRegForUninstall,
	saveD2FilesForUninstallRollback,
	getSettings,
	saveSettings,
	createMainWindow,
	createSettingsWindow,
	restartLauncherAndRun,
	compareVersions,
	fetchLauncherUpdates,
	downloadPatch,
	waitForChecksDisplayButtons,
	waitForModFilesCheckup,
	offlineChecks,
	checkD2Path,
	checkGameHash,
	checkVidTest,
	checkGlide,
	saveGlideWindowedReg,
	saveSettingsVideoReg,
	writeVideoSettingsToReg,
	getRendererString,
	getVideoRendererFromReg,
	checkD2Compatibility,
	addTSWReg,
	getVersionInfo,
	_getPatchD2Data,
	getPatchD2Size,
	getPatchD2Hash,
	checkPatchD2,
	checkDlls,
	getDlls
];
export_func.forEach((func) => global[func.name] = func);


/*****************************************/
/***** INITIALITZATION AND FUNCTIONS *****/
/*****************************************/

function getLauncherVersion()
{
	if (pathExists(paths.file.package))
		return version.launcher.current = readJSON(paths.file.package).version; //app.getVersion()

	log('Missing or empty package.json file. Cannot read launcher version.');
	return '';
}

//this is used by the uninstaller to know where D2 is, so it can restore D2 files that were overwritten by Median files
function saveD2PathToRegForUninstall(callback = null)
{
	let launcher_d2_path_reg = reg.toObject(launcher_key, launcher_d2_path_val, settings.d2_path, launcher_d2_path_type);
	reg.write(launcher_d2_path_reg, (err) => { callback ? callback(null) : null });
}

//this function backs up D2 files before we install Median, so we can restore them after uninstalling
//only backs up files that haven't already been backed up
//this also backs up any files added to the list by a new update, retrogradely
//if argument 'files' is omitted, it will backup all files
function saveD2FilesForUninstallRollback(files = null)
{
	clogn('saveD2FilesForUninstallRollback(): ' + files);
	if (!files) files = uninstall_rollback_file_names;
	var rollback_path = settings.d2_path + '\\' + uninstall_rollback_folder_name;
	if (!pathExists(rollback_path))
	{
		createFolder(rollback_path);
		let warningFlag = false;
		let limitMB = 5*1024*1024; //5 mb
		let file_backup_path, file_path, file_size;
		for (let file of files)
		{
			file_backup_path = rollback_path + '\\' + file;
			file_path = settings.d2_path + '\\' + file;
			if (!pathExists(file_backup_path) && pathExists(file_path))
			{
				if (!warningFlag && (getFileSize(file_path) > limitMB)) //check file size and warn one time if a file is larger than 5 mb
				{
					idialog('Median XL - Backup', 'The Launcher may become unresponsive while backing up old files. Please wait.');
					warningFlag = true;
				}
				clogn('Backing up: ' + file_path);
				copyFile(file_path, file_backup_path);
			}
		}
	}
}

function getSettings(callback = null)
{
	if (pathExists(paths.file.settings))
	{
		let _settings = readJSON(paths.file.settings);
		if (Object.keys(_settings).length >= Object.keys(defaults.settings).length)
		{
			settings = _settings;
			return saveD2PathToRegForUninstall(callback ? callback(null) : null);
		}
		else log('Error: Invalid settings.json. Using defaults.');
	}
	else log('Missing or empty settings.json file. It has been created using defaults.'); //revert to default settings if settings file does not exist

	settings = copyObject(defaults.settings);
	saveSettings(callback ? callback(null) : null);
}

function saveSettings(callback = null)
{
	if (settings.d2_path) settings.d2_path = path.resolve(settings.d2_path); //to remove trailing backslashes if the path isn't empty
	let settings_data = JSONToString(settings);
	writeFile(paths.file.settings, settings_data);
	saveD2PathToRegForUninstall(callback ? callback(null) : null);
}

function createMainWindow()
{
	clogn('createMainWindow()');
	
	var winOptions = { 
		minWidth: 1024,
		minHeight: 768,
		backgroundColor: '#171719',
		resizable: true,
		icon: paths.file.icon,
		hasShadow: true,
		maximizable : true,
		frame: false,
		show: false
	};
	winOptions.width = (parseInt(settings.width) < winOptions.minWidth) ? winOptions.minWidth : parseInt(settings.width);
	winOptions.height = (parseInt(settings.height) < winOptions.minHeight) ? winOptions.minHeight : parseInt(settings.height);

	//getting the remembered x,y position of the launcher
	var win_x_pos = parseInt(settings.x, 10);
	win_x_pos = Number.isNaN(win_x_pos) ? '' : win_x_pos;
	var win_y_pos = parseInt(settings.y, 10);
	win_y_pos = Number.isNaN(win_y_pos) ? '' : win_y_pos;
	if (win_x_pos === '' || win_y_pos === '')
		winOptions.center = true;
	else
	{
		winOptions.center = false;
		winOptions.x = win_x_pos;
		winOptions.y = win_y_pos;
	}

	win = new BrowserWindow(winOptions);//http://electron.atom.io/docs/api/browser-window/

	win.loadURL(url.index);
	win.setMenu(null);
	win.on('maximize', () => {
		win.webContents.send('index_maximized', true);
		settings.maximized = 'true';
		saveSettings();
		clogn('maximize');
	});
	win.on('unmaximize', () => {
		win.webContents.send('index_maximized', false);
		settings.maximized = 'false';
		saveSettings();
		clogn('unmaximize');
	});
	win.webContents.once('did-finish-load', () => { status.finished_loading = true;	});

	win.on('close', () => {
		//saving the x and y position of the launcher
		settings.maximized = win.isMaximized();
		if (!settings.maximized)
		{
			let winBounds = win.getBounds();
			settings.width = winBounds.width;
			settings.height = winBounds.height;
			settings.x = winBounds.x;
			settings.y = winBounds.y;
		}
		settings.maximized = settings.maximized.toString();
		saveSettings();
	});
	win.on('closed', () => {
		if (settingsWindow) settingsWindow.close();
		settingsWindow = null;
		win = null;
		app.quit();
	});
	return win;
}

function createSettingsWindow()
{
	var settingsWindowOptions = {
		width: 800,
		height: 600,
		resizable: false,
		backgroundColor: '#171719',
		frame: false,
		parent: win,
		modal: true,
		show: false,
		hasShadow: true,
		movable: true
	};
	let winBounds = win.getBounds();
	settingsWindowOptions.x = winBounds.x + (winBounds.width - settingsWindowOptions.width) / 2;
	settingsWindowOptions.y = winBounds.y + (winBounds.height - settingsWindowOptions.height) / 2;

	settingsWindow = new BrowserWindow(settingsWindowOptions);
	settingsWindow.setMenu(null);
	settingsWindow.loadURL(url.settings);
	settingsWindow.webContents.on('did-finish-load', () => { //settingsWindow.once('ready-to-show')
		settingsWindow.webContents.send('settings_launcherVersion', version.launcher.current);
		settingsWindow.show();
		settingsWindow.on('focus', () => {
			if (devTools.settings)
			{
				globalShortcut.register(hotkeys.settingsDevHotkey, () => { //register a hotkey listener
					if (settingsWindow) settingsWindow.webContents.openDevTools( {mode: 'detach'} ); // Debug
				});
			}
		});
	});

	settingsWindow.on('close', (e) => { //settingsWindow.beforeunload
		clogn('settingsWindow.on("close"), status.settings_closed: ' + status.settings_closed);
		if (!status.settings_closed)
		{
			e.preventDefault(); //we need to get settings from settings.html and save before closing
			settingsWindow.webContents.send('settings_saveSettings');
		}
		else
			status.settings_closed = false;
	});

	settingsWindow.on('closed', () => {
		settingsWindow = null;
		if (devTools.settings) globalShortcut.unregister(hotkeys.settingsDevHotkey);
		display('settings');
	});
	return settingsWindow;
}

//restarts the launcher if no script_path is specified
//if script_path is specified, it closes the launcher and starts the script (will not start the launcher afterwards, unless the script starts it)
//inno_silent_level is for running inno scripts. for example if you want to update something in the background without showing anything to the user, you use 3
//keep_args = true makes the launcher restart with the current command line arguments (plus any new)
function restartLauncherAndRun(script_path = '', inno_silent_level = inno_silent_levels.none, exit_code = exit_codes.normal, keep_args = true)
{
	let noprompt = '/sp-';
	let silent = '/silent';
	let verysilent = '/verysilent';
	let inno_silent_level_args =
	[
		[''], //0 = run normally
		[noprompt], //1 = do not prompt for starting the script
		[noprompt, silent], //2 = do not prompt for starting the script, and only show the progress bar
		[noprompt, verysilent], //3 = do not prompt for starting the script, do not show anything to the user (unless an error happens)
	];

	let options = {};
	if (script_path !== '') options.execPath = script_path;
	if (inno_silent_level !== inno_silent_levels.none)
	{
		options.args = [];
		if (keep_args)
		{
			options.args = process.argv;
			options.args.shift(); //remove filename
		}
		options.args.concat(inno_silent_level_args[inno_silent_level]); //add a .filter ?
	}

	app.relaunch(options);
	app.exit(exit_code);
}

function compareVersions(vcurr, vnew)
{
	function __parseVersion(ver)
	{
		if (!isString(ver)) return false;
		ver = ver.split('.');
		let revisions = [];
		for (let i = 0; i < ver.length; i++)
			revisions[i] = (parseInt(ver[i]) || 0);
		return revisions;
	}

	let _update = {
		isNeeded: false,
		force: false,
	};
	vcurr = __parseVersion(vcurr);
	vnew = __parseVersion(vnew);
	let vlen = Math.min(vcurr.length, vnew.length);
	for (let i = 0; i < vlen; i++)
	{
		if (vnew[i] > vcurr[i])
		{
			_update.isNeeded = true;
			if (i === 0) _update.force = true;
			break;
		}
		else if (vnew[i] < vcurr[i]) break;

		//if eg. old = 1.1.0 and new = 1.1.0.1 (1.1.0.0 is also considered a higher version)
		if (i === (vlen - 1))
		{
			if (vnew.length > vcurr.length)
			{
				_update.isNeeded = true;
				if (i === 0) _update.force = true;
				break;
			}
		}
	}
	return _update;
}

function fetchLauncherUpdates(callback = null)
{
	let _update = {
		isNeeded: false,
		force: false,
	};
	let err = new Error('Error fetching latest launcher version. Versions list empty.');
	if (version.launcher.latest !== '')
	{
		_update = compareVersions(version.launcher.current, version.launcher.latest);
		err = null;
	}

	clogn('needsUpdate = ' + _update.isNeeded + ', force = ' + _update.force + ', version.launcher.current = ' + version.launcher.current + ', version.launcher.latest = ' + version.launcher.latest);
	if (!_update.isNeeded)
	{
		paths.file.update = '';
		status.update = {
			isNeeded: false,
			force: false,
			downloaded: null //null = dl not started yet or not needed, false = currently dl-ing, true = dl finished
		};
		if (callback) callback(err, false);
		return;
	}
	
	let file_name = sprintf(filename.launcher_update, version.launcher.latest);
	let destination_path = paths.folder.launcher + file_name;
	if (pathExists(destination_path))
	{
		clogn('fetchLauncherUpdates() update already downloaded ' + destination_path);
		paths.file.update = destination_path;
		status.update = {
			isNeeded: true,
			force: _update.force,
			downloaded: true
		};
		if (callback) callback(err, destination_path);
		return;
	}

	status.update = {
		isNeeded: true,
		force: _update.force,
		downloaded: false //null = dl not started yet, false = currently dl-ing, true = dl finished
	};
	let part_destination_path = destination_path + ext.part;
	delFile(part_destination_path);
	downloadFile(url.launcher_update, part_destination_path, null, 0, (_err) => {
		clogn(_err);
		if (_err)
		{
			clogn('fetchLauncherUpdates() error downloading update ' + part_destination_path);
			delFile(part_destination_path);
			paths.file.update = '';
			status.update = {
				isNeeded: false,
				force: false,
				downloaded: null
			};
			if (callback) callback(_err, false);
			return;
		}
		renameFile(part_destination_path, destination_path);
		clogn('fetchLauncherUpdates() downloaded update ' + destination_path);
		paths.file.update = destination_path;
		status.update = {
			isNeeded: true,
			force: _update.force,
			downloaded: true
		};
		if (callback) callback(_err, destination_path);
	});
}

//warning, if patch_d2.mpq version is okay, but dlls are not, it will not download dlls, it will just stop. currently dlls are handled outside in this case.
function downloadPatch(full, callback)
{
	clogn('downloadPatch() full = ' + full);

	/*function _parseLatestVersion(versions) //updatingVersionsList(version_current, versions)
	{
		let index_new = versions.length - 1;
		return (index_new >= 0) ? versions[index_new] : '';
	}*/

	function _updatingVersionsList(version_current, versions)
	{
		let index_current = versions.indexOf(version_current);
		let index_new = versions.length-1;
		if ((index_current === -1) || (index_new === -1)) return true; //don't know what version is current and/or new, full install latest
		if (index_current >= index_new) return false; //current version is same or better than the latest available, do not update
		return versions.slice(index_current+1, index_new+1); //return an array of ordered versions xdelta that need to be installed for a full update
	}

	function _downloadAndApply(_url, file_name, isFull /* or xdelta */, _callback)
	{
		function _apply(destination_path, patch_d2_mpq_path, patch_d2_mpq_temp_path, isFull, __callback)
		{
			if (isFull)
			{
				delFile(patch_d2_mpq_path);
				unzipFile(destination_path, settings.d2_path, (err, stdout, stderr) => { //check output, is it text or exit code
					if (err) { clogn(err); clogn(stderr); }
					else delFile(destination_path);
					__callback(err);
				});
			}
			else
			{
				patch_xdelta(patch_d2_mpq_path, destination_path, patch_d2_mpq_temp_path, settings.d2_path, (err, stdout, stderr) => { //check output, is it text or exit code
					if (err) { clogn(err); clogn(stderr); }
					if (!err)
					{
						delFile(destination_path);
						delFile(patch_d2_mpq_path);
						renameFile(patch_d2_mpq_temp_path, patch_d2_mpq_path);
					}
					delFile(patch_d2_mpq_temp_path);
					__callback(err);
				});
			}
		}

		let destination_path = settings.d2_path + '\\' + file_name;
		let patch_d2_mpq_path = settings.d2_path + '\\' + filename.patch_d2_mpq;
		let part_destination_path = destination_path + ext.part;
		let patch_d2_mpq_temp_path = patch_d2_mpq_path + ext.temp;
		let err = null;
		delFile(part_destination_path);
		delFile(patch_d2_mpq_temp_path);
		if (pathExists(destination_path)) return _apply(destination_path, patch_d2_mpq_path, patch_d2_mpq_temp_path, isFull, _callback);
		downloadFile(_url, part_destination_path, 'index_DL_Progress', dl_progress_draw_frequency, (err) => {
			if (err)
			{
				delFile(part_destination_path);
				return _callback(err);
			}
			delFile(destination_path); //better to rename it to "old", then if part rename is ok, delete it
			renameFile(part_destination_path, destination_path);
			_apply(destination_path, patch_d2_mpq_path, patch_d2_mpq_temp_path, isFull, _callback);
		});
	}

	let update_versions = _updatingVersionsList(version.median.current, version.data.patch_d2.versions);
	if (update_versions === true) full = true; //no idea about versions, do a full install
	if (update_versions === false) return callback(null); //no need for an update, already updated

	if (full) //full download
	{
		let file_name = sprintf(filename.mod_install, version.median.latest);
		_downloadAndApply(url.patch_d2_full, file_name, true, (err) => {
			if (err) return callback(err);
			getDlls(version.median.latest, callback); //m2017 starts using dlls
		});
	}
	else //update
	{
		async.eachSeries(update_versions, (_version, _callback) => {
				let file_name = sprintf(filename.mod_update, _version);
				_downloadAndApply(url.patch_d2_updates, file_name, false, (err) => {
					if (err) return _callback(err);
					getDlls(_version, _callback); //m2017 starts using dll
				});
			}, (err) => {
				if (err)
				{
					clogn(err);
					return callback(err);
				}
				callback(null);
			}
		);
	}
}

function waitForChecksDisplayButtons()
{
	//disable all buttons (or do it via css?):
	display('play', false);
	display('settings', false);
	display('install', false);
	display('update', false);
	display('restart', false);
	display('loading', true);
	
	async.during(
		(_callback) => _callback(null, isNull(status.checks.offline) || isNull(status.checks.patch_d2) || isNull(status.checks.dll)),
		(_callback) => setTimeout(_callback, checks_frequency),
		(err) => {
			display('settings');

			//defaults:
			let display_button = 'restart';
			let display_median_version = '';
			let display_median_version_latest = false;

			switch (status.checks.patch_d2)
			{
				//here I could probably replace all version names with version.median.current_name instead of specifying for each case, but I didn't test if it works 100%

				case 'play':
				case true:
					if (status.checks.dll === true)
					{
						display_button = 'play';
						display_median_version = version.median.latest_name; //latest version, continue normally to play
						display_median_version_latest = true;
					}
					else
						display_button = 'install'; //unknown version, install
				break;

				case 'offline':
					display_button = 'play';
					display_median_version = settings.median_version; //offline, display version from settings, continue normally to play
				break;

				case 'update':
					display_button = 'update';
					display_median_version = version.median.current_name; //old version, update
				break;

				case 'clod':
				case false:
					display_button = 'install';
					display_median_version = version.data.patch_d2.version_names[0]; //clod version, install
				break;

				case 'install':
					display_button = 'install';
					display_median_version = settings.median_version; //display version from settings, install
				break;

				case 'unknown':
				case '':
					display_button = 'install'; //unknown version, install
				break;
			}

			//default case
			display(display_button);
			win.webContents.send('index_medianVersion', display_median_version, display_median_version_latest);

			//clogn('display_button = ' + display_button); //not needed, display('name') already logs it
			clogn('display_median_version = ' + display_median_version);
			clogn('display_median_version_latest = ' + display_median_version_latest);
		}
	);
}

function waitForModFilesCheckup()
{
	async.during(
		(callback) => callback(null, isNull(status.online) || (isNull(status.checks.hash) && isNull(status.checks.size))),
		(callback) => setTimeout(callback, checks_frequency),
		(err) => {
			if (!status.online)
			{
				status.checks.patch_d2 = 'offline';
				status.checks.dll = true;
				return;
			}
			if (!isString(status.checks.hash) && !isNumber(status.checks.size)) //some problem when fetching patch_d2.mpq hash or size
			{
				status.checks.patch_d2 = 'unknown';
				status.checks.dll = true;
				return;
			}

			//compare patchD2hash/size to online, and check if dll hash is correct:
			async.parallel([ //do these in parallel
				(_callback) => checkPatchD2(status.checks.size ? status.checks.size : status.checks.hash, status.checks.size ? 'size' : 'hash', _callback), // --> status.checks.patch_d2
				(_callback) => checkDlls(_callback), //--> status.checks.dll
			], (_err) => {});
		}
	);
}

//the main function, runs when app is ready and does various checks to see if everything is properly installed and set-up
function offlineChecks() 
{
	clogn('offlineChecks()');

	//these functions are defined below
	async.waterfall( //waterfall means: run these one after the other, passing the callback/arguments among each other
		[
			checkD2Path,
			(waterfall_continue) => { async.parallel([ //do these in parallel
				//getPatchD2Size, //--> status.checks.size
				getPatchD2Hash, //--> status.checks.hash
				checkVidTest,
				checkGlide,
				checkD2Compatibility,
				checkGameHash,
				addTSWReg,
			], (err) => waterfall_continue(err) ); },
			writeVideoSettingsToReg,
		],
		waterfall_finished //called when finished, or on first error in waterfall_continue (then stops the progression)
	);

	function waterfall_finished(err)
	{
		status.checks.offline = !err;
		clogn('offlineChecks() status.checks.offline = ' + status.checks.offline + ', status.checks.hash = ' + status.checks.hash + ', status.checks.dll = ' + status.checks.dll + ', status.online = ' + status.online + ', err = ' + (err ? err.stack : ''));
	}
}

function checkD2Path(callback)
{
	clogn('checkD2Path()');

	function _savePathSettings(_path, _callback = null)
	{
		if (settings.d2_path !== _path)
		{
			settings.d2_path = _path;
			saveSettings(_callback ? _callback(null) : null);
		}
		clogn('_savePathSettings()');
	}
	function _pathValid(_path)
	{
		return (((_path === 'null') || (_path === 'undefined') || (!_path)) ? false : true);
	}
	function _checkD2files(d2path)
	{
		clogn('_checkD2files()');

		if (_pathValid(d2path))
		{
			//check if d2data.mpq, d2exp.mpq and game.exe are present
			let d2data_mpq_path = path.resolve(d2path, filename.d2data_mpq);
			let game_exe_path = path.resolve(d2path, filename.game_exe);
			let d2exp_mpq_path = path.resolve(d2path, filename.d2exp_mpq);

			clogn(d2data_mpq_path + ' :: Exists? ' + pathExists(d2data_mpq_path));
			clogn(game_exe_path + ' :: Exists? ' + pathExists(game_exe_path));
			clogn(d2exp_mpq_path + ' :: Exists? ' + pathExists(d2exp_mpq_path));

			if (!pathExists(d2data_mpq_path)) return _error.d2_path.d2data_mpq;
			if (!pathExists(game_exe_path)) return _error.d2_path.game_exe;
			if (!pathExists(d2exp_mpq_path)) return _error.d2_path.d2exp_mpq;
			return true;
		}
		else if (d2path === '') return _error.d2_path.empty;
		else return _error.d2_path.invalid;
	}
	function call_error(err_msg, _callback = callback)
	{
		let _err = err_msg ? new Error(err_msg) : null;
		if (_err) edialog(_err);
		if (_callback)
		{
			status.checks.patch_d2 = 'restart';
			status.checks.dll = _error.dll.not_checked;
			return _callback(_err);
		}
	}
	function select_d2_folder() //ask the user to specify the path to D2
	{
		var _path = dialog.showOpenDialog(win ? win : null, { title: 'Select Diablo II folder', properties: ['openDirectory', 'showHiddenFiles'] });
		if (_pathValid(_path)) return _path[0];
		return '';
	}

	reg.read(d2_reg_keys, null, d2_reg_val_path, (err_reg, reg_d2_path) => {

		if (err_reg) log(err_reg);

		let err_msg_lod_missing = 'Diablo II: Lord of Destruction expansion not installed. Please install it.';
		let err_msg_files_missing = 'Diablo II: Lord of Destruction files missing from:\n';
		let err_msg_path_empy = 'Diablo II: Lord of Destruction files not found.';

		switch (_checkD2files(settings.d2_path))
		{
			case true:
				return callback(null);

			case _error.d2_path.d2exp_mpq:
				return call_error(err_msg_lod_missing);

			//select manually
			case _error.d2_path.game_exe:
			case _error.d2_path.d2data_mpq:
				call_error(err_msg_files_missing + settings.d2_path, null);
				let select_d2_path = select_d2_folder();
				let select_d2_path_check = _checkD2files(select_d2_path);

				_savePathSettings(select_d2_path);
				switch (select_d2_path_check)
				{
					case true:
						return callback(null);

					case _error.d2_path.d2exp_mpq:
						return call_error(err_msg_lod_missing);

					case _error.d2_path.game_exe:
					case _error.d2_path.d2data_mpq:
						return call_error(err_msg_files_missing + select_d2_path);
						
					//otherwise continue on
				}
				return call_error(err_msg_path_empy);

			//otherwise continue on
		}

		switch (_checkD2files(paths.folder.launcher_parent))
		{
			case true:
				_savePathSettings(paths.folder.launcher_parent);
				return callback(null);

			case _error.d2_path.d2exp_mpq:
				_savePathSettings(paths.folder.launcher_parent);
				return call_error(err_msg_lod_missing);

			//otherwise continue on
		}

		switch (_checkD2files(reg_d2_path))
		{
			case true:
				_savePathSettings(reg_d2_path);
				return callback(null);

			case _error.d2_path.d2exp_mpq:
				_savePathSettings(reg_d2_path);
				return call_error(err_msg_lod_missing);
				
			//otherwise continue on
		}

		//select manually
		//call_error(err_msg_path_empy, null);
		let select_d2_path = select_d2_folder();
		let select_d2_path_check = _checkD2files(select_d2_path);

		_savePathSettings(select_d2_path);
		switch (select_d2_path_check)
		{
			case true:
				return callback(null);

			case _error.d2_path.d2exp_mpq:
				return call_error(err_msg_lod_missing);

			case _error.d2_path.game_exe:
			case _error.d2_path.d2data_mpq:
				return call_error(err_msg_files_missing + select_d2_path);
				
			//otherwise continue on
		}
		return call_error(err_msg_path_empy);
	});
}

function checkGameHash(callback)
{
	clogn('checkGameHash()');

	var game_exe_path = settings.d2_path + '\\' + filename.game_exe;
	var D2gfx_dll_path = settings.d2_path + '\\' + filename.D2gfx_dll;
	var storm_dll_path = settings.d2_path + '\\' + filename.storm_dll;
	var storm_dll_exists = pathExists(storm_dll_path);

	var game_v113c_index = game.version.indexOf('1.13c');
	var game_v113d_index = game.version.indexOf('1.13d');

	//find game.exe hash, and act accordingly
	getFileHashSHA1(game_exe_path, (err, hash) => {
		var version_index = -1;
		if (!err)
		{
			//compare game.exe hash to all versions, and find the match
			for (var i = 0; i < game.sha1.length; i++)
			{
				if (hash == game.sha1[i])
				{
					version_index = i;
					break;
				}
			}
		}
		else
			log('Error: Cannot calculate game.exe hash value. Will try patching it up.\r\n' + err.stack);

		//determine if rollback or patch should be used based on found version
		if (version_index == -1) //could not determine d2 lod version
		{
			if (storm_dll_exists) //if storm.dll exists, version is < 1.14a
				return _patchGame(new Error('Could not determine Diablo II version (probably 1.13d or lower.)'), 'patch'); //patch/rollback game with old storm.dll
			else //not sure what to do here. use old or new storm.dll?
				return _patchGame(new Error('Could not determine Diablo II version.'), 'rollback'); //try rollback with new storm.dll, or suggest reinstalling game (in case it's not installed correctly)
		}
		else
		{
			if (version_index < game_v113c_index) //if version is < 1.13c
				return _patchGame(null, 'patch'); //patch game
			else if (version_index == game_v113d_index) //if version is 1.13d
				return _patchGame(null, 'patch'); //rollback game with old storm.dll
			else if (version_index > game_v113d_index) //if version is 1.14a or higher
				return _patchGame(null, 'rollback'); //rollback game with new storm.dll
			else if (version_index == game_v113c_index) //version is 1.13c
				return _patchGame(null); //do nothing
			else //unknown version
				return _patchGame(null, 'rollback'); //rollback with the new storm.dll just in case
		}
	});

	//do the actual patching or rolling back
	function _patchGame(err, type = null)
	{
		clogn('_patchGame() type: ' + (!isNull(type) ? type : 'null'));
		if (err) log(err);

		clogn('copy/patch paths.file.hacked_D2gfx_dll = ' + paths.file.hacked_D2gfx_dll + 'to D2gfx_dll_path = ' + D2gfx_dll_path);
		copyFile(paths.file.hacked_D2gfx_dll, D2gfx_dll_path); //hacked 1.13c D2gfx.dll that allows multiple D2 instances to run at the same time
		if (type) copyFile(paths.folder.d2_113c, settings.d2_path);
		if (type === 'rollback') copyFile(paths.file.hacked_storm_dll, storm_dll_path);
		callback(null);
	}
}

//check if vidtest exists, and add if not. same with its registry entries
function checkVidTest(callback)
{
	clogn('checkVidTest()');
	
	function _pathValid(_path)
	{
		return (((_path === 'null') || (_path === 'undefined') || (!_path)) ? false : true);
	}
	if (!_pathValid(settings.d2_path))
	{
		let err = new Error('Diablo II location not specified. Cannot find D2VidTst.exe');
		log(err);
		return callback(err);
	}

	var d2vidtst_exe_path = settings.d2_path + '\\' + filename.d2vidtst_exe;
	var d2vidtst_exe_exists = pathExists(d2vidtst_exe_path);
	if (!d2vidtst_exe_exists) copyFile(paths.file.d2vidtst, d2vidtst_exe_path);

	//check for vidtest reg, add if missing.
	let overwrite = true;
	reg.checkKeyValAdd(d2vidtst_key, d2vidtst_val.device.glide, d2vidtst_all_reg, overwrite, (err, diff, result, _reg) => {
		if (err)
		{
			let err_long = new Error('D2VidTest registry check error. ' + err.stack);
			log(err_long);
			return callback(err_long);
		}

		//if old video existed, we return it. (this will have to be made better, so we don't write 2 times). make reg.checkKeyValAdd check 2 keys/vals
		let settings_no_video = (settings.video !== 'glide' && settings.video !== 'd3d' && settings.video !== 'ddraw'); //in case there's no video in settings
		let old_reg_exists = reg.checkResultKeyVal(result, d2vidtst_key, d2vidtst_val.render);
		if (old_reg_exists)
		{
			let settings_old_reg_video = old_reg_exists ? getRendererString(result[d2vidtst_key].values[d2vidtst_val.render].value) : 'ddraw';
			if (settings_no_video)
			{
				settings.video = settings_old_reg_video;
				saveSettings();
			}
			if (settings_no_video || diff)
			{
				saveSettingsVideoReg(settings.video, (_err) => {
					if (_err) log(_err);
					callback(null);
				});
			}
			else
				callback(null);
		}
		else
		{
			if (settings_no_video)
			{
				settings.video = 'ddraw';
				saveSettings();
				callback(null);
			}
			else
			{
				saveSettingsVideoReg(settings.video, (_err) => {
					if (_err) log(_err);
					callback(null);
				});
			}
		}
	});
}

//check for glide files, and copy them if needed. also check for and add glide reg entries
function checkGlide(callback)
{
	clogn('checkGlide()');
	
	var glide_init_exe_path = settings.d2_path + '\\' + filename.glide_exe;
	var glide3x_dll_path = settings.d2_path + '\\' + filename.glide3x_dll;
	var glide_liesmich_txt_path = settings.d2_path + '\\' + filename.glide_readme_ger;
	var glide_readme_txt_path = settings.d2_path + '\\' + filename.glide_readme_eng;

	var glide_init_exe_exists = pathExists(glide_init_exe_path);
	var glide3x_dll_exists = pathExists(glide3x_dll_path);
	var glide_liesmich_txt_exists = pathExists(glide_liesmich_txt_path);
	var glide_readme_txt_exists = pathExists(glide_readme_txt_path);

	if (!(glide_init_exe_exists && glide3x_dll_exists && glide_liesmich_txt_exists && glide_readme_txt_exists))
		copyFile(paths.folder.glide, settings.d2_path);

	//glide reg check and add
	reg.existsKey(glide_key, (err, exists) => {
		if (err) log(err);
		let _reg = (!err && exists) ? glide_language_reg : glide_reg; //make sure it's in english if it's already installed, otherwise add whole _reg
		reg.write(_reg, (_err) => {
			if (_err) log('Unable to add Glide registry entries.\r\n' + _err.stack);
			callback(_err);
		});
	});
}

function saveGlideWindowedReg(windowed, callback = null)
{
	clogn('saveGlideWindowedReg()');

	var glide_windowed_reg = reg.toObject(glide_key, glide_windowed_val, windowed ? '1' : '0', 'REG_DWORD');
	reg.write(glide_windowed_reg, (err) => {
		if (err) log('Unable to save Glide windowed registry entry.\r\n' + err.stack);
		if (callback) callback(err);
	});
}

function saveSettingsVideoReg(mode, callback = null)
{
	clogn('saveSettingsVideoReg()');

	mode = (mode === 'd3d' || mode === 'glide') ? mode : 'ddraw';
	var renderer_reg = {
		[d2vidtst_key]: {
			[d2vidtst_val.render]: {
				type: 'REG_DWORD',
				value: d2vidtst_render[mode]
			},
			[d2vidtst_val.device.current]: {
				type: 'REG_SZ',
				value: d2vidtst_all_reg[d2vidtst_key][d2vidtst_val.device[mode]].value
			},
			[d2vidtst_val.flags.current]: {
				type: 'REG_DWORD',
				value: d2vidtst_all_reg[d2vidtst_key][d2vidtst_val.flags[mode]].value
			}
		}
	};

	reg.write(renderer_reg, (err) => {
		if (err) log('saveSettingsVideoReg \r\n' + err.stack);
		if (callback) callback(err);
	});
}

//write video settings to registry. used mostly when starting launcher to read settings and write them to reg
function writeVideoSettingsToReg(callback)
{
	clogn('writeVideoSettingsToReg()');

	async.parallel(
		[
			(_callback) => saveGlideWindowedReg(settings.windowed === 'true', _callback), //glide windowed reg check and add
			(_callback) => saveSettingsVideoReg(settings.video, _callback), //vidtest reg check and add
		],
		(err) => {
			if (err) log('Unable to add Glide registry entries.\r\n' + err.stack);
			callback(err);
		}
	);
}

function getRendererString(renderer_number)
{
	if (renderer_number == 1)
		return 'd3d';
	else if (renderer_number == 3)
		return 'glide';
	else //0 = ddraw; it's also the default option in case there are errors
		return 'ddraw';
}

function getVideoRendererFromReg(callback)
{
	reg.read(d2vidtst_key, null, d2vidtst_val.render, (err, renderer) => { //read default renderer
		if (err) return callback(err, renderer);
		renderer = getRendererString(renderer);
		callback(null, renderer);
	});
}

//check for compatibility stuff and turn it on
function checkD2Compatibility(callback)
{
	clogn('checkD2Compatibility()');

	//add win xp compatibility for D2VidTst.exe, doesn't start on w10 otherwise
	//add win xp compatibility for d2, otherwise it produces an error on exit, mousewheel doesn't register on keybind ingame, etc.
	//add run as admin for d2, otherwise produces "Failed to retrieve process." error on start

	let D2VidTst_exe_options = ['~', compatiblity_run_as_admin, compatiblity_xp].join(' ');
	let D2VidTst_exe_target_path = settings.d2_path + '\\' + filename.d2vidtst_exe;
	let game_exe_path = settings.d2_path + '\\' + filename.game_exe;
	let diablo_ii_exe_path = settings.d2_path + '\\' + filename.diablo_ii_exe;

	async.parallel(
		[
			(_callback) => reg.runAsOptions(D2VidTst_exe_target_path, D2VidTst_exe_options, _callback),
			(_callback) => reg.addAdminWinXPSP3(game_exe_path, _callback),
			(_callback) => reg.addAdminWinXPSP3(diablo_ii_exe_path, _callback),
		],
		(err) => {
			if (err) log('Error while adding compatibility options.\r\n' + err.stack);
			callback(err);
		}
	);
}

//add TSW to the registry
function addTSWReg(callback)
{
	clogn('addTSWReg()');

	async.parallel(
		[
			(_callback) => reg.write(tsw_D2_reg, _callback),
			(_callback) => reg.write(tsw_battlenet_reg, _callback),

			//remove key, sometimes causes problems on clicking multiplayer button. it's Starcraft gws (?)
			//todo: use reg.rename to back it up instead of deleting. that requires writing a reg.rewrite function (done by reading a reg, writing it with another name, and deleting the original)
			(_callback) => reg.checkKeyValDelete(tsw_battlenet_key, remove_gateway_val, _callback),
		],
		(err) => {
			if (err) log('Error while adding TSW registry entries.\r\n' + err.stack);
			callback(err);
		}
	);
}

function getVersionInfo(callback)
{
	//get the latest versions from online
	getJSON(url.version, (err, version_data) => {
		clogn(url.version);
		if (err)
		{
			log('Error getting latest patch_d2.mpq version info from the internet.');
			return callback(err);
		}
		version = {
			launcher: {
				current: version.launcher.current,
				latest: version_data.launcher.versions[version_data.launcher.versions.length-1],
			},
			median: {                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             
				current: version.median.current ? version.median.current : defaults.version.median.current,
				current_name: version.median.current_name ? version.median.current_name : defaults.version.median.current_name,
				latest: version_data.patch_d2.versions[version_data.patch_d2.versions.length-1],
				latest_name: version_data.patch_d2.version_names[version_data.patch_d2.versions.length-1],
			},
			data: version_data, //all the version data: median/launcher version lists, median file hashes and file sizes
		};
		callback(null);
	});
}

//gets patch_d2.mpq hash or size (default)
function _getPatchD2Data(type, callback)
{
	var patch_d2_mpq_path = settings.d2_path + '\\' + filename.patch_d2_mpq;
	if (!pathExists(patch_d2_mpq_path))
	{
		status.checks[type] = false;
		callback(null);
	}
	else if (type === 'hash')
	{
		getFileHashSHA1(patch_d2_mpq_path, (err, hash) => {
			if (err) hash = false;
			status.checks[type] = hash;
			callback(null);
		});
	}
	else
	{
		status.checks[type] = getFileSize(patch_d2_mpq_path);
		callback(null);
	}
}

function getPatchD2Size(callback)
{
	clogn('getPatchD2Size()');
	_getPatchD2Data('size', callback);
}

function getPatchD2Hash(callback)
{
	clogn('getPatchD2Hash()');
	_getPatchD2Data('hash', callback);
}

function checkPatchD2(data, type, callback = null)
{
	function _saveVersionNameSettings(_version_name)
	{
		if (settings.median_version !== _version_name)
		{
			settings.median_version = _version_name;
			saveSettings();
		}
		clogn('_saveVersionNameSettings( ' + _version_name + ' )');
	}

	clogn('checkPatchD2()');
	type = (type === 'hash' ? 'hash' : 'size'); //from main function _checkPatchD2
	var types = (type === 'hash' ? 'hashes' : 'sizes'); //has to match url.version --> version.data.patch_d2[types]

	let clod_version = version.data.patch_d2.versions[0];
	let clod_version_name = version.data.patch_d2.version_names[0];
	let clod_data = version.data.patch_d2[types][clod_version].total;
	let latest_data = version.data.patch_d2[types][version.median.latest].total;
	clogn('latest patch_d2.mpq ' + type + ': ' + latest_data);
	if (data === latest_data) //matches the latest version
	{
		_saveVersionNameSettings(version.median.latest_name); //if data matches, update the version string in the settings
		version.median.current = version.median.latest;
		version.median.current_name = version.median.latest_name;
		status.checks.patch_d2 = 'play';
		return callback ? callback(null) : undefined;
	}
	let err = new Error('patch_d2.mpq does not match the latest version.');
	if (data == clod_data) //if it's clod, do a full download/install, not an update
	{
		_saveVersionNameSettings(clod_version_name); //if data matches, update the version string in the settings
		version.median.current = clod_version;
		version.median.current_name = clod_version_name;
		status.checks.patch_d2 = 'clod'; //full install
		return callback ? callback(err) : undefined;
	}
	for (let version_key in version.data.patch_d2.versions)
	{
		if (!version.data.patch_d2.versions.hasOwnProperty(version_key)) continue; //this is so it doesn't loop trough primitive properties

		let _version = version.data.patch_d2.versions[version_key];
		let _version_name = version.data.patch_d2.version_names[version_key];
		let _version_data = version.data.patch_d2[types][_version].total;

		if (data === _version_data) //matches an older version
		{
			_saveVersionNameSettings(_version_name); //if hash found but settings version doesn't match the version, update settings
			version.median.current = _version;
			version.median.current_name = _version_name;
			status.checks.patch_d2 = 'update';
			return callback ? callback(err) : undefined;
		}
		else continue; //we didn't find a match, continue
	}

	//if data doesn't match any version. patch_d2.mpq is corrupted or wrong.
	_saveVersionNameSettings(defaults.version.median.current);
	version.median.current = defaults.version.median.current; //do we need this? the default is already ''. yes in case size is ok, but hash is wrong (= corrupt data of the same size)
	version.median.current_name = defaults.version.median.current_name; //do we need this? the default is already ''. yes in case size is ok, but hash is wrong (= corrupt data of the same size)
	status.checks.patch_d2 = 'unknown'; //full install
	if (callback) callback(new Error('patch_d2.mpq does not match recent versions, or is corrupted.'));
}

function checkDlls(callback)
{
	clogn('checkDlls()');

	if (version.median.current && (parseInt(version.median.current.split('.')[0]) < 17) && !status.online) //there were no dlls in pre Median 2017 versions
	{
		status.checks.dll = true;
		return callback(null);
	}

	var mxl_dll_path = settings.d2_path + '\\' + filename.mxl_dll;
	var fog_dll_path = settings.d2_path + '\\' + filename.fog_dll;
	var msvcr110_dll_path = settings.d2_path + '\\' + filename.msvcr110_dll;

	if (!pathExists(mxl_dll_path) || !pathExists(fog_dll_path) || !pathExists(msvcr110_dll_path))
	{
		status.checks.dll = _error.dll.missing;

		//saveD2FilesForUninstallRollback([filename.fog_dll]); //we back up files so we can restore them after uninstall
		return callback(null);
	}
	else
	{
		getFileHashSHA1(fog_dll_path, (err, hash) => {
			if (err)
			{
				status.checks.dll = _error.dll.hash;
				return callback(null);
			}
			if (hash !== Fog_dll_m2017_sha1)
			{
				status.checks.dll = _error.dll.version;
				//saveD2FilesForUninstallRollback([filename.fog_dll]); //we back up files so we can restore them after uninstall
				return callback(null);
			}
			status.checks.dll = true;
			return callback(null);
		});
	}
}

function getDlls(_version, callback)
{
	if (version.median.current && (parseInt(version.median.current.split('.')[0]) < 17) && !status.online) return callback(null);

	let file_name = sprintf(filename.dlls_update, _version);
	let destination_path = settings.d2_path + '\\' + file_name;
	let part_destination_path = destination_path + ext.part;
	let err = null;
	delFile(destination_path);
	delFile(part_destination_path);

	downloadFile(url.dll_updates, part_destination_path, 'index_DL_Progress', dl_progress_draw_frequency, (err) => {
		if (err)
		{
			delFile(part_destination_path);
			return callback(err);
		}

		renameFile(part_destination_path, destination_path);
		delFile(part_destination_path);
		unzipFile(destination_path, settings.d2_path, (_err, stdout, stderr) => { //check output, is it text or exit code
			if (_err) { clogn(_err); clogn(stderr); }
			else delFile(destination_path);
			callback(_err);
		});
	});
}