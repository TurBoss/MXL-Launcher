# Median XL Launcher

This repository is used to create the Launcher, Setup and Updates for [Median XL](https://www.median-xl.com/). Median XL is the most popular Diablo II overhaul modification, an action RPG with extensive endgame content, deep character customisation and challenging gameplay.

The Median XL Launcher takes care of:
* seamlessly installing and updating Median XL
* compatibility issues with Diablo II
* file version mismatches & corruptions
* easy manipulation of Diablo II settings

It is built on [Node.js](https://nodejs.org/) & [Electron](https://electronjs.org/), and compiled to Setup & Update files via [Inno Setup](http://www.jrsoftware.org/isinfo.php) scripts. Archives are handled with [7-zip](https://www.7-zip.org/), and versions are patched/updated with difference files created with [Xdelta3](http://xdelta.org/). JSON files are manipulated with [jq](https://stedolan.github.io/jq/).

____

## Quick Guide

* Run [update.bat](update.bat) to create Builder and Launcher modules, and the dev test version of the Launcher after pulling the repo.
* [test.bat](test.bat) runs the dev test version of the Launcher, useful for quickly testing dev code without building every time.  
* [make.bat](make.bat) creates the Launcher files/setup/update in the [dist](dist) folder, ready for publishing.
* Source code and assets/resources are in [dev\resources\app](dev\resources\app), [dev\resources\external](dev\resources\external), and [installer](installer).  
* For additional building and details, see [BUILD](BUILD.md).

## Screenshots
![Median XL Launcher window screenshot](Screenshot.jpg "Median XL Launcher window screenshot")  
![Median XL Launcher settings window screenshot](Screenshot2.jpg "Median XL Launcher settings window screenshot")

## License
[GNU General Public License v3.0](LICENCE)