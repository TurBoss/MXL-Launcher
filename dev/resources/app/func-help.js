'use strict';

/********* MODULES ********/

if (typeof dialog === 'undefined') global.dialog = require('electron').dialog; //dialog windows 
const http = require('http'); //for downloading files
const fs = require('fs-extra'); //for copying/handling files, we use this instead of the default fs


/********* EXPORTS ********/
//defines isFunction, isString, etc.
['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Null', 'Undefined', 'Array', 'Object'].forEach( //http://stackoverflow.com/a/17772086/2331033
	(name) => global['is' + name] = ((obj) => toString.call(obj) == '[object ' + name + ']')
); //--> isNumber(NaN) returns true... //Number.isNan(n)

var export_func =
[
	sprintf,
	isObjectEmpty,
	copyObject,
	getCurrentTimeTag,
	JSONToString,
	urlGetFileName,

	clog,
	clogn,
	elog,
	log,
	edialog,
	idialog,

	pathExists,
	readFile,
	readJSON,
	writeFile,
	appendFile,
	renameFile,
	copyFile,
	delFile,
	createFolder,
	getFolderContents,
	getFileSize,
	getFileHashSHA1,

	runProgram,
	unzipFile,
	patch_xdelta,

	downloadFile,
	getJSON,
];
export_func.forEach((func) => global[func.name] = func);

/*************************************/
/********* GENERAL FUNCTIONS *********/
/*************************************/

function sprintf(str, ...argv) //https://stackoverflow.com/a/43718864/2331033
{
	return !argv.length ? str : sprintf(str = str.replace(sprintf.token || '%s', argv.shift()), ...argv);
}
function isObjectEmpty(obj)
{
	return (Object.keys(obj).length === 0 && obj.constructor === Object);
}
function copyObject(obj)
{
	//return Object.assign({}, obj); //this only does a shallow copy, all deeper things are linked by reference instead of copied
	return JSON.parse(JSON.stringify(obj));
}
function getCurrentTimeTag()
{
	var d = new Date();
	d.setUTCHours(d.getHours());
	d.setUTCMinutes(d.getMinutes());
	var d_s = d.toISOString().replace(/T/g, ' ').replace(/Z/g, '').slice(0, -4);
	var d_tz_o = -d.getTimezoneOffset();
	var d_tz_h = Math.floor(d_tz_o/60);
	d_tz_h = ((d_tz_h < 0) ? '-' : '+') + ((Math.abs(d_tz_h).toString().length === 1) ? '0' : '') + Math.abs(d_tz_h);
	d_tz_h = d_tz_h.toString();
	var d_tz_m = (d_tz_o%60).toString();
	d_tz_m = ((d_tz_m.length === 1) ? '0' : '') + d_tz_m;
	return '[' + d_s + ' ' + d_tz_h + ':' + d_tz_m + ']';
}
function JSONToString(obj)
{
	return JSON.stringify(obj, null, '\t');
}
//gets the filename from the url. example http://www.exampe.com/download.zip --> download.zip
function urlGetFileName(_url) //maybe pathGetFileName(_path) works for this too? #,?
{
	_url = _url.substring(0, (_url.indexOf('#') == -1) ? _url.length : _url.indexOf('#'));
	_url = _url.substring(0, (_url.indexOf('?') == -1) ? _url.length : _url.indexOf('?'));
	_url = _url.substring(_url.lastIndexOf('/') + 1, _url.length);
	return _url;
}

function clog(string_or_err) //log to console/command prompt
{
	if (!devTools.enableConsoleLog) return;
	if (string_or_err && string_or_err.hasOwnProperty('stack')) string_or_err = string_or_err.stack;
	if (!isNull(string_or_err)) process.stdout.write(string_or_err);
}
function clogn(string_or_err) //same as clog(), but adds a new line at the end
{
	if (!devTools.enableConsoleLog) return;
	if (string_or_err && string_or_err.hasOwnProperty('stack')) string_or_err = string_or_err.stack;
	if (!isNull(string_or_err)) console.log(string_or_err); //same shit as process.stdout.write(string), but it adds a new line at the end
}
function elog(string_or_err) //error log --> write string/err to the paths.file.error_log (usually error_log.txt)
{
	if (string_or_err && string_or_err.hasOwnProperty('stack')) string_or_err = string_or_err.stack;
	appendFile(paths.file.error_log, getCurrentTimeTag() + ' ' + string_or_err + '\r\n');
}
function log(string_or_err)
{
	clogn(string_or_err);
	elog(string_or_err);
}
function edialog(err_or_title, message = null) //error dialog. can take title & message as arguments, or just the err object
{
	//blocks the app execution
	if (err_or_title && err_or_title.hasOwnProperty('stack'))
	{
		var err = err_or_title;
		console.log(dialog.showErrorBox(err.name, err.message));
	}
	else
	{
		var title = err_or_title;
		console.log(dialog.showErrorBox(title, message));
	}
}
function idialog(ititle, imsg) //information dialog with an OK button. blocks the app execution
{
	console.log(dialog.showMessageBox(win ? win : null, {title: ititle, message: imsg, buttons: ['OK'], type: 'info'}));
}

function pathExists(_path)
{
	let exists = false;
	try	{ exists = fs.statSync(_path) }
	catch (e) { if (e.code !== 'ENOENT') throw e }
	return exists;
}
function isFile(_path)
{
	let ls = false;
	try	{ ls = fs.lstatSync(_path) }
	catch (e) { if (e.code !== 'ENOENT') throw e }
	if (ls) return ls.isFile();
	return false;
}
function isFolder(_path)
{
	let ls = false;
	try	{ ls = fs.lstatSync(_path) }
	catch (e) { if (e.code !== 'ENOENT') throw e }
	if (ls) return ls.isDirectory();
	return false;
}
function readFile(_path, options = { encoding: 'utf8'})
{
	return fs.readFileSync(_path, options);
}
function readJSON(_path)
{
	return JSON.parse(readFile(_path));
}
function writeFile(_path, data, options = { encoding: 'utf8'})
{
	fs.writeFileSync(_path, data, options); //fse.outputFileSync() //file exists, get the contents
}
function appendFile(_path, data, options = { encoding: 'utf8'})
{
	fs.appendFileSync(_path, data, options); //fse.outputFileSync()
}
function renameFile(_path, new_path)
{
	fs.renameSync(_path, new_path);
}
function copyFile(source, destination)
{
	fs.copySync(source, destination); //,filter
}
function delFile(_path)
{
	fs.unlinkSync(_path);
}
function getFolderContents(_path)
{
	return fs.readdirSync(_path)
}
function getFileSize(_path)
{
	return fs.statSync(_path).size;
}
function createFolder(_path)
{
	fs.mkdirSync(_path);
}

//runs a program
//_path - _path+filename of the program to execute
//args - an array of string arguments to run the program with
//cwd_path - the folder where the program will work in. for example, if you run d2 in another folder, error log appears in the other folder instead of the d2 folder
function runProgram(_path, args=[], cwd_path = null, callback = null)
{
	var execFile = require('child_process').execFile;
	return execFile(_path, args, {cwd: cwd_path}, (err, stdout, stderr) => { if (callback) return callback(err, stdout, stderr) }); //function called on exit //, stdio: 'inherit'
}

//unzip an archive
//_path - _path+filename of the zip file
//zcwd - unzip to this folder _path
//MAKE SURE THE DESTINATION FILE IS DELETED BEFORE EXTRACTING. IT SEEMS TO FUCK UP THE HASH OTHERWISE?
//not sure if _path is ignored, since I had to specify cwd to get it to unzip in the right folder
function unzipFile(_path, zcwd, callback)
{
	if (!pathExists(paths.file.unzip_7z)) return callback(new Error('Cannot unzip. 7za.exe is missing from: ' + paths.file.unzip_7z));
	if (!pathExists(_path)) return callback(new Error('Cannot unzip. File missing: ' + _path));
	const exec = require('child_process').exec;
	exec('"' + paths.file.unzip_7z + '" x -aoa "' + _path + '"', { cwd: zcwd }, callback);
}

//applies a patch to a file. used to update to a new version.
//path_original_file - path+name of the original file
//path_xpatch_file - path+name of the patch file
//path_new_file - path+name of the patched/new file. if empty, path_original_file is used, so the file path+name remains the same
//zcwd - current working directory path. usually the path where the original file is
function patch_xdelta(path_original_file, path_xpatch_file, path_new_file = '', zcwd, callback) //xdelta3 -d -s path_original path_patch
{
	if ((path_new_file === '') || (isNull(path_new_file) || (isUndefined(path_new_file)))) path_new_file = path_original_file;
	path_new_file = (path_new_file ? ' "' + path_new_file + '"' : '');
	if (!pathExists(paths.file.xdelta)) return callback(new Error('Cannot patch. xdelta.exe is missing from: ' + paths.file.xdelta));
	if (!pathExists(path_original_file)) return callback(new Error('Cannot patch. Target file missing: ' + path_original_file));
	if (!pathExists(path_xpatch_file)) return callback(new Error('Cannot patch. xpatch file missing: ' + path_xpatch_file));
	clogn('patch_xdelta: "' + paths.file.xdelta + '" -d -f -s "' + path_original_file + '" "' + path_xpatch_file + '"' + path_new_file);
	const exec = require('child_process').exec;
	exec('"' + paths.file.xdelta + '" -d -f -s "' + path_original_file + '" "' + path_xpatch_file + '"' + path_new_file, { cwd: zcwd }, callback);
}

//downloads files from an url
//dest - path to download the file to (includes the file name).
//send_progress_event_name - win.webContents.send event name to send download progress to. for example send to index.html
//send_interval_ms - send interval in miliseconds
 //NOTE: we don't check if the folder structure is created or not, that's the job of the one calling the function. we also don't check if the file already exists, delete it before calling downloadFile()
function downloadFile(url, dest, send_progress_event_name = null, send_interval_ms = 500, callback) //we skip download display with send_interval_ms === 0
{
	var showProgress = send_progress_event_name && isString(send_progress_event_name) && !isNull(send_interval_ms) && isNumber(send_interval_ms) && (send_interval_ms > 0);
	var request = http.get(url, (response) => {
		if (response.statusCode !== 200) return callback(new Error('Error: Address "' + url + '" is not reachable.')); //response.headers.content-type
		var file = fs.createWriteStream(dest).on('error', (err) => {
			fs.unlink(dest);
			callback(err);
		});
		if (showProgress)
		{
			var progress = {
				size: parseInt(response.headers['content-length'], 10),
				current: 0,
				speed: 0
			};
			let last_display_time = Date.now();
			let start_time = last_display_time;
			response.on('data', (chunk) => {
				progress.current += chunk.length;
				if ((Date.now() - last_display_time) > send_interval_ms)
				{
					progress.speed = progress.current/(Date.now() - start_time); //byte/ms, average speed over the whole download
					if (win)
						win.webContents.send(send_progress_event_name, progress);
					else
						request.emit('error', null); //new Error('Launcher closed while downloading.') //instead of this, use response.emit & add a response error event?
					last_display_time = Date.now();
				}
			});
		}
		response.pipe(file);
		file.on('finish', () => {
			if (showProgress)
			{
				progress.current = progress.size;
				if (win)
					win.webContents.send(send_progress_event_name, progress);
				else
					request.emit('error', null); //new Error('Launcher closed while downloading.') //instead of this, use response.emit & add a response error event?
			}
			file.close(callback);
		});
	}).on('error', (err) => {
		fs.unlink(dest);
		callback(err);
	});
}

//gets json from an url and converts it to an object
function getJSON(url, callback)
{
	http.get(url, (res) => {
		//const statusCode = res.statusCode;
		//const contentType = res.headers['content-type'];
		res.setEncoding('utf8');
		let rawData = '';
		res.on('data', (chunk) => rawData += chunk);
		res.on('end', () => {
			let parsedData = JSON.parse(rawData);
			callback(null, parsedData);
		});
	}).on('error', (e) => {
		log(e);
		callback(e);
	});
}

//gets a file sha1 hash. uses the 7za.exe to calculate it
function getFileHashSHA1(_path, callback)
{
	let execFile = require('child_process').execFile;
	execFile(paths.file.unzip_7z, ['h', '-scrcsha1', '"' + _path + '"'], {cwd: paths.folder.unzip, windowsVerbatimArguments: true}, (err, stdout, stderr) => {
		if (err)
		{
			log(err);
			callback(err);
		}
		else if (stderr)
		{
			log(stderr);
			callback(stderr);
		}
		else
		{
			let hashok_msg = 'Everything is Ok';
			let hashok = stdout.split('\n')[16].trim();
			if (hashok !== hashok_msg)
			{
				err = new Error('Error hashing file: ' + _path);
				log(err);
				return callback(err);
			}
			let hash = stdout.split('\n')[8].substring(0, 40).toLowerCase();
			clogn('getFileHashSHA1() ' + _path + ', sha1 hash: ' + hash);
			callback(null, hash);
		}
	});
}