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
	win.hide();
	win.close();
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
		var _path = settings.d2_path + '\\' + filename.game_exe;
		var args = [
			(settings.windowed === 'true' && settings.video !== 'd3d') ? game_cmd_arg.windowed : '',
			(settings.no_sound === 'true') ? game_cmd_arg.no_sound : '',
			(settings.video == 'glide') ? game_cmd_arg.glide : '',
			(settings.skiptobnet === 'true') ? game_cmd_arg.skiptobnet : '',
			(settings.nofixaspect === 'true') ? game_cmd_arg.nofixaspect : '',
		];
		if (devTools.commandLine)
		{
			args.push((settings.direct === 'true') ? game_cmd_arg.direct : '');
			args.push((settings.txt === 'true') ? game_cmd_arg.txt : '');
		}
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
	status.checks = copyObject(defaults.status.checks);
	waitForChecksDisplayButtons();
	waitForModFilesCheckup();
	downloadPatch(true, (err) => {
		if (err) clogn('install_game err = ' + err);
		if (err) return display('restart');
		offlineChecks();
	});
});

ipcMain.on('update_game', (event) => {
	clogn('update_game');
	//saveD2FilesForUninstallRollback(); //we back up files so we can restore them after uninstall
	status.checks = copyObject(defaults.status.checks);
	waitForChecksDisplayButtons();
	waitForModFilesCheckup();
	downloadPatch(false, (err) => {
		if (err) clogn('update_game err = ' + err);
		if (err) return display('restart');
		offlineChecks();
	});
});

ipcMain.on('restart_update', (event) => {
	clogn('manual restart update: ' + paths.file.update);
	restartLauncherAndRun(paths.file.update, inno_silent_levels.silent, exit_codes.update); //closes launcher, updates and shows progress, then starts the launcher if the script does so
});

ipcMain.on('restart', (event) => { //restarts launcher
	clogn('restart');
	restartLauncherAndRun('', inno_silent_levels.none, exit_codes.restart);
});

/***** SETTINGS *****/
ipcMain.on('settings_clogn', (event, string) => clogn(string));

ipcMain.on('settings_getSettings', (event) => {
	clogn('- settings_getSettings');
	settingsWindow.webContents.send('settings_returnGetSettings', settings, devTools.commandLine); //event.sender
});

ipcMain.on('close_settings', (event, _settings) => {
	clogn('close_settings');
	globalShortcut.unregister(hotkeys.closeSettings);
	globalShortcut.unregister(hotkeys.closeSettings2);

	var old_d2_path = settings.d2_path;
	Object.assign(settings, _settings); //update settings from settings.html, use object.assign because settings.html doesn't have all properties. careful, deeper objects are referenced, not copied
	
	if (settings.video === 'glide')
	{
		clogn('- settings mode = glide. save. call glideWindowed()');
		saveGlideWindowedReg(settings.windowed === 'true'); //save glide windowed in reg
	}
	saveSettingsVideoReg(settings.video);
	saveSettings();
	status.settings_closed = true;
	display('blackbox', false);
	if (settingsWindow)
	{
		settingsWindow.hide();
		settingsWindow.close();
	}

	if (old_d2_path !== settings.d2_path)
	{
		status.checks = copyObject(defaults.status.checks);
		version.median.current = defaults.version.median.current;
		version.median.current_name = defaults.version.median.current_name;
		waitForChecksDisplayButtons();
		waitForModFilesCheckup();
		offlineChecks();
	}
});

ipcMain.on('settings_glideWindowed', (event, windowed) => saveGlideWindowedReg(windowed));

ipcMain.on('settings_saveRendererReg', (event, mode) => saveSettingsVideoReg(mode));

ipcMain.on('settings_glide', (event, _path) => {
	var glide_init_exe_path = _path + '\\' + filename.glide_exe;
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
	var vidtest_path = _path + '\\' + filename.d2vidtst_exe;
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
	about.authors = readJSON(paths.file.package).author.name;
	settingsWindow.webContents.send('settings_returnAbout', about);
});