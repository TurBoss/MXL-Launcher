'use strict';

/********* MODULES ********/

if (typeof path === 'undefined') global.path = require('path'); //for resolving/joining complicated paths


//****************************
//***** GLOBAL CONSTANTS *****
//****************************

/***** GENERAL *****/
global.hotkeys = {
	exit: 'Esc',
	closeSettings: 'Esc',
	closeSettings2: 'Enter',
	indexDevHotkey: 'F11', //hotkey to turn on chrome dev tools in index.html
	settingsDevHotkey: 'CommandOrControl+F11', //hotkey to turn on chrome dev tools in settings.html
};

global.exit_codes = {
	normal: 0,
	error: 1,
	restart: 2,
	update: 3,
};

global._error = {
	dll: {
		version: 'wrong version',
		plugy: 'plugy fog.dll invalid',
		missing: 'files missing',
		hash: 'hash error',
		not_checked: 'not checked',
	},
	d2_path: {
		empty: 'Path missing.',
		invalid: 'Invalid path.',
		game_exe: 'Game.exe missing.',
		d2data_mpq: 'd2data.mpq missing.',
		d2exp_mpq: 'd2exp.mpq missing.',
	}
};

global.inno_silent_levels = {
	none: 0,
	default: 0,
	normal: 0,
	noprompt: 1,
	silent: 2, //includes noprompt
	verysilent: 3, //includes noprompt
};

global.dl_progress_draw_frequency = 250; //used to define how often to send the dl progress info to index.html (which then draws it as a progress bar)
global.checks_frequency = 100; //used to define how often to run the checks for status and other things

/***** FILE NAMES *****/
global.ext = //file extensions
{
	full: '.full', //not used atm
	part: '.part',
	temp: '.temp',
	upd: '.exe', //launcher update file extension (we use inno setup exectuable for updates)
	mod_upd: '.update', //xdelta difference patch, extension not needed, but we use the .update ending to make it clear it's an update
	dll_upd: '.dll.update', //actually a zip
	zip: '.7z',
};
global.upd_prefix = 'MXL_Update_v'; //launcher update file prefix (eg. 'MXL_Update_v' if the update file name is 'MXL_Update_v0.2.9.0.exe')
global.filename =
{
	launcher_exe: 'Median XL.exe',
	unzip_exe: '7za.exe',

	launcher_update: upd_prefix + '%s.0' + ext.upd, //%s = version number, use sprintf(filename.launcher_update, version) to get the filename for that version
	mod_install: '%s' + ext.zip, //%s = version number, use sprintf(filename.mod_install, version) to get the filename for that version
	mod_update: '%s' + ext.mod_upd, //%s = version number, use sprintf(filename.mod_update, version) to get the filename for that version
	dlls_update: '%s' + ext.dll_upd, //%s = version number, use sprintf(filename.dlls_update, version) to get the filename for that version

	game_exe: 'Game.exe',
	diablo_ii_exe: 'Diablo II.exe',
	patch_d2_mpq: 'patch_d2.mpq',
	d2exp_mpq: 'd2exp.mpq',
	d2data_mpq: 'd2data.mpq',
	d2vidtst_exe: 'D2VidTst.exe',

	fog_dll: 'Fog.dll',
	storm_dll: 'Storm.dll',
	D2gfx_dll: 'D2gfx.dll',
	mxl_dll: 'MXL.dll', //median 2017 code edits. made to work with plugy 10.00, doesn't work with other versions
	msvcr110_dll: 'msvcr110.dll', //if the user doesn't have the correct visual studio runtime library installed to run the MXL.dll, this msvcr110.dll is needed, so we ship it just in case

	glide_exe: 'glide-init.exe',
	glide3x_dll: 'glide3x.dll',
	glide_readme_ger: 'glide-liesmich.txt',
	glide_readme_eng: 'glide-readme.txt',

	plugy_ini: 'PlugY.ini',
};
global.uninstall_rollback_folder_name = 'MedianUninsRollback';
global.uninstall_rollback_file_names =
[
	'Bnclient.dll',
	'D2Client.dll',
	'D2CMP.dll',
	'D2Common.dll',
	'D2DDraw.dll',
	'D2Direct3D.dll',
	'D2Game.dll',
	'D2Gdi.dll',
	'D2gfx.dll',
	'D2Glide.dll',
	'D2Lang.dll',
	'D2Launch.dll',
	'D2MCPClient.dll',
	'D2Multi.dll',
	'D2Net.dll',
	'D2sound.dll',
	'D2VidTst.exe',
	'D2Win.dll',
	'Fog.dll',
	'Game.exe',
	'Patch.txt',
	'Storm.dll',
	'patch_d2.mpq',
];

/***** PATHS *****/
//if you change any of these, don't forget to change their locations in other files as well.
global.paths = {
	folder: {},
	file: {},
};

paths.folder.app = path.resolve(__dirname); //absolute path to inside launcher/resources/app folder (or app.asar in the public distro)
paths.folder.launcher = path.resolve(paths.folder.app, '..\\..\\'); //absolute path of the launcher folder
paths.folder.launcher_parent = path.resolve(paths.folder.launcher, '..\\'); //absolute path to the folder containing the launcher
paths.folder.external = path.resolve(paths.folder.launcher, 'resources\\external'); //absolute path of the launcher/external folder
//these don't end with \ :
paths.folder.assets = path.relative(paths.folder.launcher, path.resolve(paths.folder.app, 'assets'));
paths.folder.installation = path.relative(paths.folder.launcher, path.resolve(paths.folder.app, 'installation'));
paths.folder.img = path.join(paths.folder.assets, 'img');
paths.folder.d2_113c = path.join(paths.folder.installation, '1.13c_files');
paths.folder.glide = path.join(paths.folder.installation, 'glide_v14e');
paths.folder.plugy = path.join(paths.folder.installation, 'plugy_10.00'); //Fog.dll from inside is the same as Fog_dll_v113c_sha1. D2gfx.dll is a special hacked version that loads PlugY on game start.
paths.folder.unzip = paths.folder.external;

paths.file =
{
	launcher_exe: path.resolve(paths.folder.launcher, filename.launcher_exe),
	icon: path.join(paths.folder.img, 'icon.png'),
	settings: path.resolve(paths.folder.launcher, 'settings.json'),
	package: path.join(paths.folder.app, 'package.json'),
	error_log: path.resolve(paths.folder.launcher, 'error_log.txt'),
	unzip_7z: path.resolve(paths.folder.external, filename.unzip_exe), //v16.04 //used in unzipFile() function
	xdelta: path.resolve(paths.folder.external, 'xdelta3.exe'), //v3.0.11 //used in patch_xdelta() function
	update: '', //updater file path. it's set after starting since it's named after a version, gotta get it from the internet
	d2vidtst: path.join(paths.folder.d2_113c, filename.d2vidtst_exe),
	Fog_dll: path.join(paths.folder.d2_113c, filename.fog_dll), //clean 1.13c Fog.dll, not the edited one that median uses
	hacked_storm_dll: path.join(paths.folder.installation, filename.storm_dll), //allows all 1.14 versions to work when rolled back to 1.13c, slightly buggy (?)
	hacked_D2gfx_dll: path.join(paths.folder.installation, filename.D2gfx_dll), //allows multiple 1.13c instances to run at the same time
	plugy_D2gfx_dll: path.join(paths.folder.plugy, filename.D2gfx_dll), //allows plugy to run when the game is started
	plugy_ini: path.join(paths.folder.plugy, filename.plugy_ini), //plugy settings
};

/***** URLS *****/
global.base_get_url = 'http://get.median-xl.com/launcher/?' + [(devTools.testEnvironment ? 'test=true' : ''), 'get='].filter(Boolean).join('&');
global.url =
{
	homepage: 'https://median-xl.com/',
	version: base_get_url + 'versions', //we check for version updates and file hashes here
	launcher_update: base_get_url + 'launcher_update',
	patch_d2_updates: base_get_url + 'mod_update',
	dll_updates: base_get_url + 'dlls',
	patch_d2_full: base_get_url + 'mod',
	news: base_get_url + 'news',
	index: 'file:///' + paths.folder.app + '/index.html',
	settings: 'file:///' + paths.folder.app + '/settings.html',
};

/***** REGISTRY ENTRIES *****/
global.launcher_key = 'HKCU\\Software\\Median';
global.launcher_d2_path_val = 'D2InstallPath';
global.launcher_d2_path_type = 'REG_SZ';

global.d2_reg_keys =
[
	'HKCU\\Software\\Blizzard Entertainment\\Diablo II',
	'HKLM\\Software\\Blizzard Entertainment\\Diablo II', //HKLM is read-only for non-admins
	'HKCU\\SOFTWARE\\Wow6432Node\\Blizzard Entertainment\\Diablo II',
	'HKLM\\SOFTWARE\\Wow6432Node\\Blizzard Entertainment\\Diablo II', //HKLM is read-only for non-admins
];
global.d2_reg_val_path = 'InstallPath';

global.d2vidtst_key = 'HKCU\\Software\\Blizzard Entertainment\\Diablo II\\VideoConfig'; //check wow and HKLM and HKLM wow
global.d2vidtst_val =
{
	render: 'Render',
	device: {
		current: 'DeviceName',
		ddraw: 'DeviceName0',
		d3d: 'DeviceName2',
		glide: 'DeviceName4'
	},
	flags: {
		current: 'dwFlags',
		ddraw: 'dwFlags0',
		d3d: 'dwFlags2',
		glide: 'dwFlags4'
	}
};
global.d2vidtst_render =
{
	ddraw: 0,
	d3d: 1,
	glide: 3
};
global.d2vidtst_reg = {
	[d2vidtst_key]: { //0 = ddraw, 2 = d3d, 4 = glide, no number = currently used
		'DeviceDDraw': {
			type: 'REG_DWORD',
			value: '0'
		},
		'DirectDrawDevice0': {
			type: 'REG_DWORD',
			value: '1'
		},
		'Render': { //currently used renderer
			type: 'REG_DWORD',
			value: '0' //0 = ddraw, 1 = d3d, 3 = glide. same as d2vidtst_render
		},
		'TestDDraw': {
			type: 'REG_DWORD',
			value: '2' //0 untested, 2 tested
		},
		'TestD3D': {
			type: 'REG_DWORD',
			value: '2' //0 untested, 2 tested
		},
		'TestGLIDE': {
			type: 'REG_DWORD',
			value: '2' //0 untested, 2 tested
		},
		'DeviceName': { //currently used
			type: 'REG_SZ',
			value: 'Your DirectDraw graphics card'
		},
		'DeviceName0': { //0 = ddraw
			type: 'REG_SZ',
			value: 'Your DirectDraw graphics card'
		},
		'DeviceName2': { //2 = d3d
			type: 'REG_SZ',
			value: 'Your Direct3D graphics card'
		},
		'dwFlags': { //currently used flags
			type: 'REG_DWORD',
			value: '11' //probably includes flags like 'don't use this mode in windowed mode' for d3d, etc.
		},
		'dwFlags0': { //0 = ddraw
			type: 'REG_DWORD',
			value: '11' //ddraw flags
		},
		'dwFlags2': { //2 = d3d
			type: 'REG_DWORD',
			value: '667' //d3d flags
		},
		'GUID': {
			type: 'REG_BINARY',
			value: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']
		},
		'GUID0': {
			type: 'REG_BINARY',
			value: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']
		},
		'GUID2': {
			type: 'REG_BINARY',
			value: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']
		},
		'Recommend0': { //0 = ddraw
			type: 'REG_DWORD',
			value: '2' //0 = hide rendering mode in vidtest, 2 = show
		},
		'Recommend2': { //2 = d3d
			type: 'REG_DWORD',
			value: '2' //0 = hide rendering mode in vidtest, 2 = show
		}
	}
};

global.d2vidtst_glide_reg = {
	[d2vidtst_key]: {
		'DeviceName1': {
			type: 'REG_SZ',
			value: ''
		},
		'DeviceName3': {
			type: 'REG_SZ',
			value: ''
		},
		'DeviceName4': { //4 = glide
			type: 'REG_SZ',
			value: '3dfx Glide'
		},
		'dwFlags1': {
			type: 'REG_DWORD',
			value: '0'
		},
		'dwFlags3': {
			type: 'REG_DWORD',
			value: '0'
		},
		'dwFlags4': { //4 = glide
			type: 'REG_DWORD',
			value: '0' //glide flags
		},
		'GUID1': {
			type: 'REG_BINARY',
			value: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']
		},
		'GUID3': {
			type: 'REG_BINARY',
			value: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']
		},
		'GUID4': {
			type: 'REG_BINARY',
			value: ['0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0']
		},
		'Recommend1': {
			type: 'REG_DWORD',
			value: '0' //0 = hide rendering mode in vidtest, 2 = show
		},
		'Recommend3': {
			type: 'REG_DWORD',
			value: '0' //0 = hide rendering mode in vidtest, 2 = show
		},
		'Recommend4': { //4 = glide
			type: 'REG_DWORD',
			value: '2' //0 = hide rendering mode in vidtest, 2 = show
		}
	}
};
global.d2vidtst_all_reg = { [d2vidtst_key]: Object.assign({}, d2vidtst_reg[d2vidtst_key], d2vidtst_glide_reg[d2vidtst_key]) }; //careful with object.assign, deeper objects are referenced, not copied

global.glide_key = 'HKCU\\Software\\GLIDE3toOpenGL';
global.glide_windowed_val = 'windowed';
global.glide_reg = {
	[glide_key]: {
		'english': {
			type: 'REG_DWORD',
			value: '1' //0 = german, 1 = english
		},
		'corner': {
			type: 'REG_DWORD',
			value: '0'
		},
		'showfps': {
			type: 'REG_DWORD',
			value: '0'
		},
		'showclock': {
			type: 'REG_DWORD',
			value: '0'
		},
		'showtexturemass': {
			type: 'REG_DWORD',
			value: '0'
		},
		'sequence': {
			type: 'REG_DWORD',
			value: '0'
		},
		'GL_EXT_vertex_array': {
			type: 'REG_DWORD',
			value: '1'
		},
		'GL_ATI_fragment_shader': {
			type: 'REG_DWORD',
			value: '1'
		},
		'GL_ARB_fragment_program': {
			type: 'REG_DWORD',
			value: '1'
		},
		'GL_EXT_paletted_texture': {
			type: 'REG_DWORD',
			value: '1'
		},
		'GL_EXT_shared_texture_palette': {
			type: 'REG_DWORD',
			value: '1'
		},
		'GL_EXT_packed_pixels': {
			type: 'REG_DWORD',
			value: '1'
		},
		'GL_EXT_texture_env_combine': {
			type: 'REG_DWORD',
			value: '1'
		},
		'WGL_EXT_swap_control': {
			type: 'REG_DWORD',
			value: '1'
		},
		'windowed': { //WINDOWED MODE FOR GLIDE. THIS OVERRIDES -W IF USING GLIDE
			type: 'REG_DWORD',
			value: '0'
		},
		'centered': {
			type: 'REG_DWORD',
			value: '0'
		},
		'capturedmouse': {
			type: 'REG_DWORD',
			value: '0'
		},
		'windowextras': {
			type: 'REG_DWORD',
			value: '0'
		},
		'aspectratio': {
			type: 'REG_DWORD',
			value: '1'
		},
		'desktopresolution': {
			type: 'REG_DWORD',
			value: '1'
		},
		'refreshrate': {
			type: 'REG_DWORD',
			value: '0'
		},
		'vsync': {
			type: 'REG_DWORD',
			value: '1'
		},
		'staticview': {
			type: 'REG_DWORD',
			value: '0'
		},
		'fpslimit': {
			type: 'REG_DWORD',
			value: '0'
		},
		'rememberpos': {
			type: 'REG_DWORD',
			value: '0'
		},
		'keepcomposition': {
			type: 'REG_DWORD',
			value: '0'
		},
		'texturemem': {
			type: 'REG_DWORD',
			value: '16'
		},
		'texturesize': {
			type: 'REG_DWORD',
			value: '10'
		},
		'32bitrenderwindow': {
			type: 'REG_DWORD',
			value: '0'
		},
		'texturevideos': {
			type: 'REG_DWORD',
			value: '1'
		},
		'rendertotexture': {
			type: 'REG_DWORD',
			value: '0'
		},
		'bilinear': {
			type: 'REG_DWORD',
			value: '0'
		},
		'supersampling': {
			type: 'REG_DWORD',
			value: '0'
		},
		'shadergamma': {
			type: 'REG_DWORD',
			value: '1'
		},
		'nogamma': {
			type: 'REG_DWORD',
			value: '0'
		}
	}
};
global.glide_language_reg = {
	[glide_key]: {
		'english': {
			type: 'REG_DWORD',
			value: '1'
		}
	}
};

global.tsw_dns_ip = 'realm.median-xl.com';
global.tsw_D2_key = 'HKCU\\Software\\Blizzard Entertainment\\Diablo II';
global.tsw_battlenet_key = 'HKCU\\Software\\Battle.net\\Configuration';
global.tsw_D2_reg = {
	[tsw_D2_key]: {
		'CmdLine': {
			type: 'REG_SZ',
			value: '-skiptobnet'
		},
		'BNETIP': {
			type: 'REG_SZ',
			value: tsw_dns_ip
		}
	}
};
global.tsw_battlenet_reg = {
	[tsw_battlenet_key]: {
		'Diablo II Battle.net Gateways': {
			type: 'REG_MULTI_SZ',
			value: ['1002', '01', tsw_dns_ip, '1', 'The Sin War']
		}
	}
}; //Battle.net gateways
global.remove_gateway_val = 'Battle.net gateways';

/***** FILE SIZES & SHA512 HASHES *****/
global.game = { //order of versions is important, put newer versions at the end
	version: [
		'1.07 downgrade', //from http://ftp.blizzard.com/pub/diablo2exp/patches/PC/game-lod.zip, used to overwrite game.exe and make it patch up
		'1.07',
		'1.08',
		'1.09', //says 1.09 in the game
		//'1.09b', //broken
		'1.09d',
		'1.10',
		'1.11',
		'1.11b', //says 1.11 in game
		'1.12a', //says 1.12 in game
		'1.13c', //says 1.13 in game
		'1.13d', //says 1.13 in game
		'1.14a', //says 1.14 in game
		'1.14b',
		'1.14c', //says 1.14 in game
		'1.14d', //says 1.14 in game
	],
	size: [
		548307, //v107 downgrade
		424067, //v107
		428163, //v108
		428163, //v109
		//, //v109b //broken
		448675, //v109d
		1198857, //v110
		2129920, //v111
		2129920, //v111b
		61440, //v112a
		61440, //v113c
		65536, //v113d
		3590120, //v114a
		3590120, //v114b
		3586024, //v114c
		3618792, //v114d
	],
	sha1: [
		'68437054b1c7ea139cc72c055661f75f99309857', //v107 downgrade
		'88d845879b4ffbcdd132133aed80dfbded94940e', //v107
		'aef106e71aa8ae588f8991019e886a5cfcd97c5c', //v108
		'dcf08cc706d5f54b536f1ad197cd1885f4b1ec0f', //v109
		//'', //v109b //broken
		'99bd243ec5f81bdfaac1e7b7439bbf04ee3264c8', //v109d
		'8164d089ebe9ca12d7641745f4ff97b2a5ff3d3d', //v110
		'ea41a3ed72797be7244eb7361597baa02388c5ec', //v111
		'ed575fb08e66b0aaac1878715b620ec8e9521223', //v111b
		'a875b98fa3a8b9300bcc04c84be1fa057eb277b5', //v112a
		'af2b33c90b50ede8d9a8bca9b8d9720c87f78641', //v113c
		'11cd918cb6906295769d9be1b3e349e02af6b229', //v113d
		'3e64f12c6ef72847f49d301c2472280d4460589d', //v114a
		'11e940266c6838414c2114c2172227f982d4054e', //v114b
		'255691dd53e3bcd646e5c6e1e2e7b16da745b706', //v114c
		'af0ea93d2a652ceb11ac01ee2e4ae1ef613444c2', //v114d
	],
};
global.Fog_dll_v113c_sha1 = 'fc9e40e6b81e8c65703afdaaae010aace85d0969';
global.Fog_dll_m2017_sha1 = '206880233ee88a25d8824f58621e3fecb5a94b0d'; //loads MXL.dll

/***** GAME COMMAND LINE ARGUMENTS *****/
global.game_cmd_arg =
{
	windowed: '-w',
	glide: '-3dfx',
	nofixaspect: '-nofixaspect',
	no_sound: '-ns',
	skiptobnet: '-skiptobnet',
	direct: '-direct',
	txt: '-txt',
};

/***** OTHER *****/

global.plugy_ini_str1 = 'DllToLoad=MXL.dll';
global.plugy_ini_str2 = 'DllToLoad2=MXL.dll';