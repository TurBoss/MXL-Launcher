'use strict';

/********* MODULES & HELPER FUNCTIONS ********/

if (typeof async === 'undefined') global.async = require('async'); //for chaining or parallel async callbacks
if (typeof path === 'undefined') global.path = require('path'); //for resolving/joining complicated paths
//isNull, isString, etc. from func-help.js

/********* EXPORTS ********/

module.exports = {
	read,
	write,
	remove,
	existsKey,
	existsKeyVal,
	checkResultKeyVal,
	checkKeyValAdd,
	checkKeyValDelete,

	runAsOptions,
	addAdmin,
	addAdminWinXPSP3,

	toObject,
};


/** COMPATIBILITY CONSTANTS **/

global.compatiblity_key = 'HKCU\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers';
//global.compatiblity_all_key = 'HKLM\\Software\\Microsoft\\Windows NT\\CurrentVersion\\AppCompatFlags\\Layers'; //all users, requires admin probably
global.compatiblity_run_as_admin = 'RUNASADMIN'; //Run program as an administrator
//global.compatiblity_disable_themes = 'DISABLETHEMES'; //Disable Visual Themes
//global.compatiblity_disable_composition = 'DISABLEDWM'; //Disable Desktop Composition
global.compatiblity_xp = 'WINXPSP3';
global.compatiblity_modes = [
	'WIN95',
	'WIN98',
	'WINXPSP2',
	'WINXPSP3',
	'VISTARTM',
	'VISTASP1',
	'VISTASP2',
	'WIN7RTM',
	'WIN8RTM'
];

//*****************************
//******* REG FUNCTIONS *******
//*****************************

function _isObjectEmpty(obj)
{
	return (Object.keys(obj).length === 0 && obj.constructor === Object);
}

//returns the content of reg_keys if it's a string. if it's an array, returns the content of the first match.
//it only shows what's in the key, it does not enter any subkey to show the whole tree.
//if value name specified, returns its value/data. stops on first match
//if subkey specified, returns its content. stops on first match

//output:
//callback(err, result, reg_keys, value|subkey)
//if err !== null, result = null, either error or key/val not found
//NOT ANYMORE, IGNORE THIS: if err === null, and result === null, the key was not found
//if err === null, and result === false, the value|subkey was not found
function read(reg_keys, subkey = null, value = null, callback)
{
	function _wrapQuotes(string)
	{
		return '"' + string + '"';
	}
	function _isValue(reg_entry)
	{
		return ((reg_entry.substring(0,4) === '    ') && (reg_entry.indexOf('    REG_') !== -1));
	}
	function _getValueName(value_entry)
	{
		value_entry = value_entry.substring(4, value_entry.indexOf('    REG_'));
		if (value_entry === '(Default)') value_entry = '';
		return value_entry;
	}
	function _getValueType(value_entry)
	{
		value_entry = value_entry.substring(value_entry.indexOf('    REG_')).trimLeft();
		return value_entry.substring(0, value_entry.indexOf('    ')).trim();
	}
	function _getValueData(value_entry)
	{
		value_entry = value_entry.substring(value_entry.indexOf('    REG_')).trimLeft();
		return value_entry.substring(value_entry.indexOf('    ')).trim();
	}
	function _getSubKeyName(value_entry)
	{
		return value_entry.trim().substring(value_entry.lastIndexOf('\\') + 1);
	}
	function _convertValueDataFromType(data, type)
	{
		if (type === 'REG_SZ')
			return data;
		else if (type === 'REG_DWORD')
			return parseInt(data, 16);
		else if (type === 'REG_BINARY')
		{
			data = data.match(/[\s\S]{1,2}/g) || [];
			data = data.map((val) => parseInt('0x' + val, 16));
			return data;
		}
		else if (type === 'REG_MULTI_SZ')
			return data.split('\\0');
	}
	function _getConvertedValueDataFromType(value_entry)
	{
		let type = _getValueType(value_entry);
		let data = _getValueData(value_entry);
		return _convertValueDataFromType(data, type);
	}
	function _getReg(reg_key, subkey = null, value = null, _callback)
	{
		let args = ['query', _wrapQuotes(reg_key)];
		if (!isNull(value)) 
			args.push('/v', _wrapQuotes(value));
		require('child_process').exec(['reg'].concat(args).join(' '), (err, stdout, stderr) => {
			if (err) return _callback(err, null);
			var out = stdout.split('\r\n');
			out = out.filter((reg_entry) => reg_entry.trim()); //remove empty lines
			out.shift(); //remove original key name from output
			let result_count = out.length;
			if (!isNull(value))
			{
				for (let i = 0; i < result_count; i++)
					if (_isValue(out[i]) && (_getValueName(out[i]) === value)) return _callback(null, _getConvertedValueDataFromType(out[i]));
				return _callback(null, false);
			}
			if (!isNull(subkey))
			{
				for (let i = 0; i < result_count; i++)
					if (!_isValue(out[i]) && (_getSubKeyName(out[i]) === subkey)) return _callback(null, _getSubKeyName(out[i]));
				return _callback(null, false);
			}

			var result_values = {};
			var result_keys = [];
			var result_value;
			var result_data;
			var result_type;
			for (let i = 0; i < result_count; i++)
			{
				if (_isValue(out[i]))
				{
					result_value = _getValueName(out[i]);
					result_type = _getValueType(out[i]);
					result_data = _convertValueDataFromType(_getValueData(out[i]), result_type);

					result_values[result_value] = {
						type: result_type,
						value: result_data
					};
				}
				else result_keys.push(_getSubKeyName(out[i]));
			}
			var result = {[reg_key]: {}}; // = {[reg_key]: {keys: result_keys, values: result_values } };
			if (result_keys.length !== 0)
				result[reg_key].keys = result_keys;
			if (!_isObjectEmpty(result_values))
				result[reg_key].values = result_values;
			_callback(null, result);
		});
	}

	if (isString(reg_keys)) //just one key (string)
	{
		_getReg(reg_keys, subkey, value, (err, result) => {
			if (err) return callback(err, result);
			callback(err, result, reg_keys, !isNull(value) ? value : subkey);
		});
	}
	else //search in many keys (array), return first match
	{
		if (isNull(subkey) && isNull(value))
		{
			var result = {};
			async.each(reg_keys,
				(reg_key, _callback) => {
					_getReg(reg_key, null, null, (err, _result) => {
						if (err || isNull(_result)) return _callback(err);
						else if (_result && !_isObjectEmpty(_result))
							Object.assign(result, _result); //this is dangerous since it only does a shallow copy, deeper things are not copied, but referenced instead
						_callback(null);
					});
				},
				(err) => callback(err, result, null, null)
			);
		}
		else
		{
			async.someSeries(reg_keys,
				(reg_key, _callback) => {
					_getReg(reg_key, subkey, value, (err, _result) => {
						if (!err && _result)
						{
							callback(err, _result ? _result : false, reg_key, !isNull(value) ? value : subkey);
							return _callback(null, true);
						}
						_callback(null, false);
					});
				},
				(err, _success) => { if (!_success) callback(err, false, reg_keys, !isNull(value) ? value : subkey); }
			);
		}
	}
}

//checks if a registry key exists.
//also returns the content in result if it exists, or {[key]:{}} if not
function existsKey(key, callback)
{
	read(key, null, null, (err, result, _key, _val) => {
		if (err) return callback(err);
		let key_exists = !isNull(result);
		// &&!_isObjectEmpty(result[key]);
		callback(null, key_exists, isNull(result) ? {[key]:{}} : result);
	});
}

//checks if the result contains the specified key and value
function checkResultKeyVal(result, key, val)
{
	var exists = result && result.hasOwnProperty(key) && (Object.keys(result[key]).length !== 0);
	exists = exists && result[key].hasOwnProperty('values') && result[key].values.hasOwnProperty(val);
	exists = exists && result[key].values[val].hasOwnProperty('value');
	return exists;
}

//checks if the specified key and value exist
//also returns the result content. if it doesn't exist, returns {[key]:{}}
function existsKeyVal(key, val, callback)
{
	existsKey(key, (err, exists_key, result) => {
		if (err) return callback(err);
		if (exists_key)	var exists_val = checkResultKeyVal(result, key, val);
		else
		{
			exists_key = false;
			var exists_val = false;
		}
		callback(null, exists_key, exists_val, result);
	});
}

//write a registry object to the registry.
//can also be used to just create a key
function write(reg_data, callback)
{
	function _addKeyVal(key, val, type, data, _callback) //seems trailing '\\' messes up the function, reg process stays open and writes 'data = path" /f' for the value data
	{
		if (isNull(key) || key === '')
		{
			err = new Error('Empty registry key name.');
			log(err);
			return _callback(err); //return _callback(null, false);
		}

		function _wrapQuotes(string)
		{
			return '"' + string + '"';
		}
		function _padHexToTwoDigits(string)
		{
			return ((string.length === 1) ? ('0' + string) : string);
		}

		let args = ['add', _wrapQuotes(key)];
		if (isNull(type)) type = 'REG_SZ';
		if (type === 'REG_BINARY' && isArray(data))
			data = data.map((val) => _padHexToTwoDigits(parseInt(val, 10).toString(16))).join('');
		else if (type === 'REG_MULTI_SZ' && isArray(data))
			data = data.join('\\0');
		if (isNull(data))
		{
			console.log('null data: reg_data: ' + JSON.stringify(reg_data, null, '\t') + ', key: ' + key + ', val: ' + val + ', type: ' + type + ', data: ' + data);
			data = '';
		}
		if (!isNull(val))
			args.push('/v', _wrapQuotes(val), '/t', type, '/d', _wrapQuotes(data));
		args.push('/f');
		require('child_process').exec(['reg'].concat(args).join(' '), (err, stdout, stderr) => {
			if (err) log(err); //return _callback(err, false);
			_callback(err);
		});
	}

	//eachOf is parallel
	async.eachOf(reg_data,
		(key_data, key, _callback) => {
			if (_isObjectEmpty(key_data)) return _addKeyVal(key, null, null, null, _callback);
			async.eachOf(key_data,
				(data, val, __callback) => /****here add checks for data.type, data.value*/	_addKeyVal(key, val, data.type, data.value, __callback),
				_callback
			);
		},
		callback
	);
}

//creates an object from key_name, val_name, val_data, val_type.
//kinda useless function, since I need objects with multiple values sometimes.
function toObject(key_name, val_name, val_data, val_type = 'REG_SZ')
{
	let regObj = {
		[key_name]: {
			[val_name]: {
				type: val_type,
				value: val_data
			}
		}
	};
	return regObj;
}

//checks if key and val exist, if not, adds them.
//if they exist, and overwrite is on, then it adds it too, otherwise it returns the variables so you can do what you want.

//output:
//key or val don't exist: callback(null, diff); where diff === null
//overwrite is on, the reg is different from the one provided: callback(null, diff); where diff === true
//otherwise: callback(null, diff, result, reg); where diff === true or false
function checkKeyValAdd(key, val, reg, overwrite, callback)
{
	existsKeyVal(key, val, (err, exists_key, exists_val, result) => {
		if (err) log(err);

		var diff = (!exists_key || !exists_val) ? null : (result[key].values[val].value !== reg[key][val].value);
		if (exists_key && exists_val && !(overwrite && diff)) return callback(null, diff, result, reg);

		write(reg, (_err) => {
			if (_err)
			{
				log(_err);
				return callback(_err);
			}
			callback(null, diff);
		});
	});
}

//delete one registry key or value
//todo: add support for multiple paralell deletions
function remove(key, value = null, callback)
{
	function _deleteReg(_key, _val = null, _callback)
	{
		if (isNull(_key) || _key === '')
		{
			err = new Error('Empty registry key name.');
			log(err);
			return _callback(err);
		}

		function _wrapQuotes(string)
		{
			return '"' + string + '"';
		}

		let args = ['delete', _wrapQuotes(_key)];
		if (!isNull(_val))
			args.push('/v', _wrapQuotes(_val));
		args.push('/f');
		require('child_process').exec(['reg'].concat(args).join(' '), (err, stdout, stderr) => {
			if (err) log(err); //return _callback(err, false);
			_callback(err);
		});
	}

	_deleteReg(key, value, callback);
}

//check if key and/or value exists, and deletes it if so
function checkKeyValDelete(key, val = null, callback)
{
	if (!isNull(val))
	{
		existsKeyVal(key, val, (err, exists_key, exists_val, result) => {
			if (err) log(err);
			if (!exists_key || !exists_val) return callback(null);

			remove(key, val, callback);
		});
	}
	else
	{
		existsKey(key, (err, exists_key, result) => {
			if (err) log(err);
			if (!exists_key) return callback(null);

			remove(key, null, callback);
		});
	}
}

//adds "run as" options, deletes all other options. eg. run as admin + run in win xp sp3 compatibility mode, delete old options
function runAsOptions(_path, _options, callback = null)
{
	if (!isArray(_options)) _options = [_options];
	_options = ['~', ..._options].join(' ');
	let _reg = toObject(compatiblity_key, _path, _options);
	write(_reg, (err) => callback ? callback(err) : undefined);
}

//makes the program run as admin, keeps other user settings
function addAdmin(_path, callback = null)
{
	let overwrite = false;
	let _options = ['~', compatiblity_run_as_admin].join(' ');
	let _reg = reg.toObject(compatiblity_key, _path, _options);
	checkKeyValAdd(compatiblity_key, _path, _reg, overwrite, (err, diff, result, __reg) => {
		if (err)
		{
			log('Could not add "Run as Admin" option for "' + _path + '".');
			return callback ? callback(err) : undefined;
		}
		if (!diff) return callback ? callback(null) : undefined;

		let reg_other = result[compatiblity_key].values[_path].value; //save old values
		reg_other = reg_other.replace('~ ', '').trim();
		reg_other = reg_other.replace(compatiblity_run_as_admin, '').trim();
		reg_other = reg_other.replace(/  +/g, ' ').trim(); //replace multiple spaces with single

		reg_other = ['~', compatiblity_run_as_admin, reg_other]; //order is important, and '~ ' is important for win8+
		reg_other = reg_other.filter((el) => el !== ''); //if old reg_other is empty, remove it
		reg_other = reg_other.join(' ');

		var new_reg = reg.toObject(compatiblity_key, _path, reg_other);
		write(new_reg, (_err) => {
			if (_err) log('Could not add "Run as Admin" option to registry for "' + _path + '".\r\n' + _err.stack);
			if (callback) callback(_err);
		});
	});
}

function addAdminWinXPSP3(_path, callback = null) //we force "run as admin" and "win xp sp3" mode, but keep all other user settings
{
	let overwrite = false;
	let _options = ['~', compatiblity_run_as_admin, compatiblity_xp].join(' ');
	let _reg = reg.toObject(compatiblity_key, _path, _options);
	checkKeyValAdd(compatiblity_key, _path, _reg, overwrite, (err, diff, result, __reg) => {
		if (err)
		{
			log('Could not add "Run as Admin" and Windows XP SP3 options for "' + _path + '".');
			return callback ? callback(err) : undefined;
		}
		if (!diff) return callback ? callback(null) : undefined;

		let reg_other = result[compatiblity_key].values[_path].value; //save old values
		reg_other = reg_other.replace('~ ', '').trim();
		reg_other = reg_other.replace(compatiblity_run_as_admin, '').trim();
		reg_other = reg_other.replace(/  +/g, ' ').trim(); //replace multiple spaces with single
		reg_other = reg_other.split(' ');
		reg_other = reg_other.filter((el) => !(compatiblity_modes.indexOf(el) > -1)); //remove compatibility modes, so we can add XP SP3 compatibility
		reg_other = reg_other.filter((el) => el !== '');
		reg_other = reg_other.join(' ').trim();

		reg_other = ['~', compatiblity_run_as_admin, reg_other, compatiblity_xp]; //order is important, and '~ ' is important for win8+
		reg_other = reg_other.filter((el) => el !== ''); //if old reg_other is empty, remove it
		reg_other = reg_other.join(' ');

		var new_reg = reg.toObject(compatiblity_key, _path, reg_other);
		write(new_reg, (_err) => {
			if (_err) log('Could not add "Run as Admin" and Windows XP SP3 options for "' + _path + '" to registry.\r\n' + _err.stack);
			if (callback) callback(_err);
		});
	});
}