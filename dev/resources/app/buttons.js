'use strict';

/********* MODULES ********/

if (typeof globalShortcut === 'undefined') global.globalShortcut = require('electron').globalShortcut;
const ipcMain = require('electron').ipcMain;

/********* EXPORTS ********/
/*MAIN BUTTON */
//used to enable/disable show/hide the play and other buttons/elements, usually after the checks at the start of the launcher are done.
//var name = 'play', 'install', 'update', 'restart', 'settings', 'loading', 'blackbox', 'notice'
//var enable = true/false
global.display = ((name, enable = true) => {
	clogn('display(' + name + ', ' + enable + ')');
	win.webContents.send('index_Display', name, enable);
});


/********************************/
/**** BUTTON EVENTS HANDLING ****/
/********************************/

/***** INDEX *****/

/*OTHER BUTTON */
ipcMain.on('close', (event) => {
	if (status.game_count.active || status.game_count.loading)
	{
		choiceDialog('Quit', 'Are you sure you want to close the game and quit?', btn_id => {
			if (btn_id === 1) return;
			win.hide();
			win.close();
		});
	}
	else
	{
		win.hide();
		win.close();
	}
});

ipcMain.on('min', (event) => win.minimize());

ipcMain.on('max', (event) => {	
	if (win.isMaximized()) win.unmaximize();
	else win.maximize();
});

ipcMain.on('settings', (event) => {
	clogn('open settings');
	display('settings', false);
	if (!settingsWindow) createSettingsWindow();
	else if (!settingsWindow.isVisible()) settingsWindow.show();
});

ipcMain.on('run_game', (event) => {
	status.game_count.active++;
	if (status.game_count.active < 2)
		display('play');
	else if (status.game_count.active === 2)
		display('play', false);
	else if (status.game_count.active > 2) //in case the user clicks really fast and manages to click more than 2 times while the button is fading out
	{
		edialog('Not allowed', 'Only two instances of Diablo II are allowed, and only for muling.');
		status.game_count.active--;
		return;
	}

	status.game_count.loading++;
	win.webContents.send('index_cursorProgress', true);

	if (settings.d2_path)
	{
		var _path = path.resolve(settings.d2_path, filename.game_exe);
		var args = [
			(settings.windowed === 'true' && settings.video !== 'd3d') ? game_cmd_arg.windowed : '',
			(settings.no_sound === 'true') ? game_cmd_arg.no_sound : '',
			(settings.video == 'glide') ? game_cmd_arg.glide : '',
			(settings.skiptobnet === 'true') ? game_cmd_arg.skiptobnet : '',
			(settings.nofixaspect === 'true') ? game_cmd_arg.nofixaspect : '',
			(settings.direct === 'true') ? game_cmd_arg.direct : '',
			(settings.txt === 'true') ? game_cmd_arg.txt : '',
		];
		args = args.filter((n) => n);
		var cwd_path = settings.d2_path;

		win.minimize();
		status.game_count.loading--;
		if (status.game_count.loading === 0) win.webContents.send('index_cursorProgress', false);
		clogn('Starting Median #' + status.game_count.active + ' :: "' + _path + '" ' + args.join(' '));
		runProgram(_path, args, cwd_path, (err, stdout, strerr) => { //called when program ends //path
			if (err) log(err); //display('play', false);
			status.game_count.active--;
			if (status.game_count.active < 2)
				display('play');
			else
				display('play', false);
			if (status.game_count.active === 0) win.restore();
		});
	}
	else
	{
		display('play', false);
		display('restart');
		status.game_count.loading--;
		if (status.game_count.loading === 0) win.webContents.send('index_cursorProgress', false);
		status.game_count.active--;
		if (status.game_count.active === 0) win.restore();
	}
});

ipcMain.on('install_game', (event) => {
	clogn('install_game');
	//saveD2FilesForUninstallRollback(); //we back up files so we can restore them after uninstall
	let dll_status = status.checks.dll;
	let patch_d2_status = status.checks.patch_d2;

	//we reset the checks status and run new checks
	status.checks = copyObject(defaults.status.checks);
	waitForChecksDisplayButtons();
	waitForModFilesCheckup();

	async.parallel([ //do these in parallel
		(_callback) => {
			if (!(patch_d2_status === 'play' || patch_d2_status === true)) downloadPatch(true, _callback);
			else _callback(null);
		},
		(_callback) => {
			if (dll_status !== true) getDlls(version.median.latest, _callback);
			else _callback(null);
		},
	], (err) => {
		if (err) clogn('install_game err = ' + err);
		if (err) return display('restart');
		offlineChecks();
	});
});

ipcMain.on('update_game', (event) => {
	clogn('update_game');
	//saveD2FilesForUninstallRollback(); //we back up files so we can restore them after uninstall

	//we reset the checks status and run new checks
	status.checks = copyObject(defaults.status.checks);
	waitForChecksDisplayButtons();
	waitForModFilesCheckup();

	async.parallel([ //do these in parallel
		(_callback) => downloadPatch(false, _callback),
		(_callback) => getDlls(version.median.latest, _callback), //--> status.checks.dll
	], (err) => {
		if (err) clogn('update_game err = ' + err);
		if (err) return display('restart');
		offlineChecks();
	});
});

ipcMain.on('restart_update', (event) => { //closes launcher, updates and shows progress, then starts the launcher if the script does so
	clogn('manual restart update: ' + paths.file.update);

	if (status.game_count.active || status.game_count.loading)
	{
		let _options = {type: 'question', buttons: ['Yes', 'No'], defaultId: 1, title: 'Update', message: 'Are you sure you want to close the game and update the Launcher?', cancelId: 1, noLink: true };
		dialog.showMessageBox(win, _options, (btn_id) => {
			if (btn_id === 1) return;
			restartLauncherAndRun(paths.file.update, inno_silent_levels.silent, exit_codes.update);
		});
	}
	else restartLauncherAndRun(paths.file.update, inno_silent_levels.silent, exit_codes.update);
});

ipcMain.on('restart', (event) => { //restarts launcher
	clogn('restart');
	restartLauncherAndRun('', inno_silent_levels.none, exit_codes.restart);
});

/***** SETTINGS *****/
ipcMain.on('settings_clogn', (event, string) => clogn(string));

ipcMain.on('settings_getSettings', (event) => {
	clogn('- settings_getSettings');
	settingsWindow.webContents.send('settings_returnGetSettings', settings); //event.sender
});

ipcMain.on('close_settings', (event, _settings) => {
	clogn('close_settings');
	globalShortcut.unregister(hotkeys.closeSettings);
	globalShortcut.unregister(hotkeys.closeSettings2);

	var old_d2_path = settings.d2_path;
	if (_settings.d2_path) _settings.d2_path = path.resolve(_settings.d2_path);
	Object.assign(settings, _settings); //update settings from settings.html, use object.assign because settings.html doesn't have all properties. careful, deeper objects are referenced, not copied
	
	checkPlugY(() => {
		let enable_plugy = (settings.plugy === 'true');
		togglePlugY(enable_plugy, (success) => {
			if (!enable_plugy)
			{
				checkDlls(() => {
					if (status.checks.dll === true) return _saveOtherSettings(old_d2_path);
					getDlls(version.median.latest, err => { return _saveOtherSettings(old_d2_path); });
				});
				return;
			}
			return _saveOtherSettings(old_d2_path);
		});
	});

	function _saveOtherSettings(old_d2_path)
	{
		//TODO:
		//some of these things are async. we don't wait for them to all finish, which might cause problems if settings is turned on/off multiple times.
		//it can also cause problems if the user clicks play before some of these are finished.
		//should probably use async.parallel to wait until all are finished before closing the settings.

		if (settings.video === 'glide')
		{
			clogn('- settings mode = glide. save. call glideWindowed()');
			saveGlideWindowedReg(settings.windowed === 'true'); //save glide windowed in reg
		}
		saveSettingsVideoReg(settings.video);
		saveSettings();

		if (old_d2_path !== settings.d2_path)
		{
			status.checks = copyObject(defaults.status.checks);
			version.median.current = defaults.version.median.current;
			version.median.current_name = defaults.version.median.current_name;
			waitForChecksDisplayButtons();
			waitForModFilesCheckup();
			offlineChecks();
		}
		
		status.settings_closed = true;
		display('blackbox', false);
		if (settingsWindow)
		{
			settingsWindow.hide();
			settingsWindow.close();
		}
	}
});

ipcMain.on('settings_PlugY', (event) => {
	let running = isGameRunning(); //can't turn on plugy if the game is open or loading
	clogn('settings_PlugY: isGameRunning() --> ' + running);
	if (settingsWindow && event) settingsWindow.webContents.send('settings_returnPlugY', running);
});

ipcMain.on('settings_glideWindowed', (event, windowed) => saveGlideWindowedReg(windowed));

ipcMain.on('settings_saveRendererReg', (event, mode) => saveSettingsVideoReg(mode));

ipcMain.on('settings_glide', (event, _path) => {
	var glide_init_exe_path = path.resolve(_path, filename.glide_exe);
	if (glide_init_exe_path)
	{
		runProgram(glide_init_exe_path, [], _path, (err, stdout, strerr) => {
			if (err) log(err);
			reg.read(glide_key, null, glide_windowed_val, (err, windowed) => { //read if glide is windowed
				windowed = (windowed == 1);
				if (err) // || isNull(windowed)
				{
					log(err);
					windowed = true; //default in case there are errors
				}
				if (settingsWindow && event) settingsWindow.webContents.send('settings_returnGlideWindowed', windowed);
			});
		});
	}
	else
	{
		let err = new Error('Cannot find glide-init.exe, please restart the Launcher.');
		log(err);
		edialog(err);
	}
});

ipcMain.on('settings_vidtest', (event, _path) => {
	var vidtest_path = path.resolve(_path, filename.d2vidtst_exe);
	if (vidtest_path)
	{
		runProgram(vidtest_path, [], _path, (err, stdout, stderr) => { 
			if (err) log(err); //vidtest always gives error, unless you run the test
			getVideoRendererFromReg((err2, renderer) => {
				if (err2) log(err2);
				if (settingsWindow && event) settingsWindow.webContents.send('settings_returnVidtestRenderer', renderer);
			});
		});
	}
	else
	{
		let err = new Error('Cannot find D2VidTst.exe, please restart the Launcher.');
		log(err);
		edialog(err);
	}
});

ipcMain.on('settings_about', (event) => {
	let about = {
		author: readJSON(paths.file.package).author.name,
		contributors: readJSON(paths.file.package).contributors,
		artist: {},
	};
	about.artist = about.contributors.pop();
	about.contributors = about.contributors.filter((person) => { return person.name !== about.author; }); //remove author
	about.contributors.forEach((v, i, arr) => {	arr[i] = v.name; }); //remove links

	clogn(JSONToString(about));

	settingsWindow.webContents.send('settings_returnAbout', about, url.homepage);
});