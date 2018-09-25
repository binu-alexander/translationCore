var path = require('path');
require("babel-polyfill");
var appRoot = path.join(__dirname, '..');

require('electron-compile').init(appRoot, require.resolve('./main'));
