// .mjs 表示该文件为ES6模块，从而可以直接使用 import 等特性
// debug: https://nodejs.org/en/docs/guides/debugging-getting-started/
// - node --inspect-brk js/artists.mjs
// - chrome open `chrome://inspect`

// https://github.com/shelljs/shelljs
import shell from 'shelljs';

import * as config from './config.mjs';
import * as utils from './utils.mjs';


(async () => {
    const json_files = shell.find(config.musicians_dir).filter(function(file) { return file.match(/\.json$/); });

    for (let i = 0; i < json_files.length; i++) {
        let json_file = json_files[i];
        let json = await utils.readJson(json_file);

        console.log('Pretty ' + json_file + ' ...');
        await utils.writeJson(json_file, json, true);
    }
})();
