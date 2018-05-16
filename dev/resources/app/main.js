'use strict';

/*************************************/
/********* MODULES & INCLUDES ********/
/*************************************/

global.electron = require('electron'); //npm install -g electron
global.app = electron.app;
global.BrowserWindow = electron.BrowserWindow;
global.globalShortcut = electron.globalShortcut;
global.dialog = electron.dialog;
global.path = require('path'); //for resolving/joining complicated paths
global.async = require('async'); //for chaining or parallel async callbacks

/************ DEV OPTIONS ************/

global.devTools = { //for non-dev build, all are false, except the hotkeys obviously
	enableConsoleLog: true, //enables logging to the console (for example, if started from the command line)
	index: true, //allows the chrome dev tools to be turned on in index.html
	settings: false, //allows the chrome dev tools to be turned on in settings.html
	disableLauncherUpdates: false,
	testEnvironment: true, //online environment for testing the launcher (mainly mod install and update, and launcher updates). launcher needs to be started with /test=true
};
if (devTools.testEnvironment) devTools.testEnvironment = (process.argv.indexOf('/test=true') > 0);

//***** Internal modules/includes *****
// - some require global constants/functions from each other, and from main.js
require('./func-help.js'); //loads basic/helper/misc functions (read/write files, console logging, etc.)
global.reg = require('./reg.js'); //registry functions, read, write, etc.
require('./const.js'); //loads constants
require('./func-main.js'); //loads main functions
require('./buttons.js'); //loads button event functions, including display()

/*************************************/
/************** STATES ***************/
/*************************************/

global.defaults = {

	settings: { //settings are loaded from settings.json (if it fails, these defaults are used)
		//*** game settings ***//
		windowed: 'false', //is game windowed (or full-screen)?
		nofixaspect: 'false',
		video: '', //video mode (ddraw, d3d, glide). if '', it will try to read it from reg
		no_sound: 'false', //disable sound in the game?
		skiptobnet: 'false', //skips the intro/menu and goes to the realm login
		d2_path: '', //d2 folder path
		median_version: '', //version name, not version number
		//*** launcher window settings (in px) ***//
		x: '', //horizontal position. '' = center
		y: '', //vertical position. '' = center
		width: 1024,
		height: 768,
		maximized: 'false',
		direct: 'false',
		txt: 'false',
		plugy: 'false',
	},

	status: { //holds the status of various async and sync checks, along with some data
		news: { //started with app.on('ready') { _getNews() }, used in win.webContents.on('did-finish-load'), which waits for news to be ready
			data: [], //array of news objects {topic_id, title, content, date, comments}, where comments is the comment count
			success: null, //null = not checked yet, false = news not available or error, true = news available
		},
		update: { //global update status for the launcher. changed after data from url.version is fetched
			isNeeded: null, //null = not checked yet, false = update not available, true = update available
			force: null, //null = not checked yet, false = don't force update, true = force update
			downloaded: null, //null = not started, false = currently downloading, true = download finished
		},
		settings_closed: false, //false = settings open, true = settings closed. used for key bindings mostly.
		game_count: { //used to count the number of game processes
			active: 0, //used to limit the number of processes to 2 (max for muling)
			loading: 0, //how many processes are being started, used to display the loading mouse cursor
		},
		checks: { //checking various things before allowing the user to run/install/update the game
			hash: null, //d2/patch_d2.mpq hash
			size: null, //d2/patch_d2.mpq size
			dll: null, //check mxl dlls, write fog.dll hash
			offline: null, //a slew of checks that don't require internet access
			patch_d2: null, //patch_d2 check, size/hash
		},
		online: null, //can the launcher connect to the internet?
	},

	version: { //data from url.version
		launcher: {
			current: '',
			latest: '',
		},
		median: {
			current: '',
			current_name: '',
			latest: '',
			latest_name: '',
		},
		data: {}, //all the version data: median/launcher version lists, median file hashes, file sizes and version names
	},
};

global.settings = copyObject(defaults.settings); //settings are loaded from settings.json (if it fails, these defaults are used)
global.status = copyObject(defaults.status);
global.version = copyObject(defaults.version);


/**********************************/
/*************** CORE *************/
/**********************************/

global.win = null; //must be global so buttons.js can use it
global.settingsWindow = null; //must be global so buttons.js can use it

//make window single instance, and focus the first instance if the current app is not the first instance
const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
	if (win)
	{
		if (win.isMinimized()) win.restore();
		win.focus();
	}
});
if (shouldQuit) return app.quit(); //if this is a second instance, quit

app.on('window-all-closed', () => app.quit()); //http://electron.atom.io/docs/api/app/

/*app.on('quit', () => { });*/

//the most important part of the program
app.on('ready', () => {
	clogn('app ready');

	reg.addAdmin(paths.file.launcher_exe);
	_getNews(); //sets --> status.news.success & status.news.data; gets news from online. async
	async.during(
		(_callback) => _callback(null, isNull(status.news.success) || !_isWinReady()),
		(_callback) => setTimeout(_callback, checks_frequency),
		(err) => win.webContents.send('index_returnNews', status.news.data) //sends news to index.html
	);

	getLauncherVersion(); //sets --> version.launcher.current, sync
	if (!devTools.disableLauncherUpdates && _isLocalUpdateReady()) return restartLauncherAndRun(paths.file.update, inno_silent_levels.verysilent, exit_codes.update); //sync; paths.file.update is set by _isLocalUpdateReady
	getVersionInfo((err) => { //sets --> version; get the latest versions info from online
		status.online = !err;
		if (!status.online) return edialog('Median XL - No version information', 'Could not get version information from the internet, using the currently installed one.')
		if (devTools.disableLauncherUpdates) return;
		fetchLauncherUpdates((err2, update_path) => {
			if (update_path)
			{
				async.during(
					(_callback) => _callback(null, !_isWinReady()),
					(_callback) => setTimeout(_callback, checks_frequency),
					(err3) => display('notice')
				);
			}
		});
	});

	getSettings((err_settings) => { //sets --> settings; with things from the settings.json file
		if (!win) createMainWindow(); //creates the window, but doesn't show it. uses settings

		//do offline checks. uses settings
		offlineChecks(); // sets --> status.checks.offline, and does/sets stuff below:
		/*{
			checkD2Path,
			getPatchD2Size, sets --> status.checks.size
			getPatchD2Hash, sets --> status.checks.hash
			checkVidTest,
			checkGlide,
			checkPlugY,
			checkD2Compatibility,
			checkGameHash,
			addTSWReg,
			writeVideoSettingsToReg,
		}*/

		//compare hashes/sizes to the online version info
		waitForModFilesCheckup(); //waits for status.online, status.checks.size or status.checks.hash; sets --> status.checks.patch_d2, status.checks.dll

		//display window, buttons and version
		async.during(
			(_callback) => _callback(null, !_isWinReady()),
			(_callback) => setTimeout(_callback, checks_frequency),
			(err) => {
				//win.webContents.send('index_medianVersion', settings.median_version); //send settings mod version to index.html (displayed under the play button)
				waitForChecksDisplayButtons(); //waits for status.checks.patch_d2 and status.checks.dll
				_displayWindow();
			}
		);
	});

	app.on('browser-window-blur', () => { globalShortcut.unregisterAll(); });


	/*** HOISTED FUNCTIONS ***/

	function _getNews()
	{
		getJSON(url.news, (err, data) => {
			if (err) return status.news.success = 'false';
			status.news.success = data.success;
			status.news.data = data.news;
		});
	}

	function _isLocalUpdateReady()
	{
		//version.launcher.current is set before this
		let current_ver = version.launcher.current + '.0';
		let folder_content = getFolderContents(paths.folder.launcher);
		let latest_update = '';
		let count = folder_content.length;
		let upd_pre_pos = '';
		let upd_suf_pos = '';
		for (let i = 0; i < count; i++)
		{
			let upd_pre_pos = folder_content[i].indexOf(upd_prefix);
			let upd_suf_pos = folder_content[i].indexOf(ext.upd);
			let upd_part_pos = folder_content[i].indexOf(ext.part);
			if (upd_part_pos !== -1) //delete partial update downloads
			{
				delFile(paths.folder.launcher + folder_content[i]);
				continue;
			}
			if (upd_pre_pos === -1 || upd_suf_pos === -1) continue;
			let ver = folder_content[i].substring(upd_pre_pos + upd_prefix.length, upd_suf_pos);
			if (compareVersions(current_ver, ver).isNeeded && compareVersions(latest_update, ver).isNeeded)
				latest_update = ver;
			else
				delFile(paths.folder.launcher + folder_content[i]); //delete lower version updates
		}

		paths.file.update = latest_update ? (paths.folder.launcher + upd_prefix + latest_update + ext.upd) : '';
		return paths.file.update;
	}

	function _displayWindow()
	{
		win.show();
		win.on('focus', () => {
			globalShortcut.register(hotkeys.exit, () => { //register a hotkey listener
				win.hide();
				win.close();
			});
			if (devTools.index) globalShortcut.register(hotkeys.indexDevHotkey, () => win.webContents.openDevTools( {mode: 'detach'} )); //register Debugging hotkey
		});
	}

	function _isWinReady() { return (win && status.finished_loading); }

});