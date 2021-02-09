// .mjs 表示该文件为ES6模块，从而可以直接使用 import 等特性
// debug: https://nodejs.org/en/docs/guides/debugging-getting-started/
// - node --inspect-brk js/artists.mjs
// - chrome open `chrome://inspect`

import fetch from "node-fetch";
// https://github.com/cheeriojs/cheerio
import * as cheerio from 'cheerio';

import * as config from './config.mjs';
import * as utils from './utils.mjs';

async function fetchMusicians(musicians, page) {
    const token = config.xiami_token;

    const response = await fetch("https://i.xiami.com/musician/artists?genre=0&gender=ALL&location=ALL&order=0&_xiamitoken="+token+"&page="+page+"&json=1", {
        "credentials": "include",
        "headers": {
            "User-Agent": config.browser_agent,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": "https://i.xiami.com/musician/artists",
            "Cookie": config.cookie,
        },
        "method": "GET",
        "mode": "cors"
    });

    const result = await response.json();
    if (result.message) {
        console.error(result.message);
        return false;
    }

    const html = result.data.html;
    const $ = cheerio.load(html);

    if ($('.artist .info a').length == 0) {
        return false;
    }

    $('.artist .info a').each(function () {
        // <a target="_blank" title="秦博" href="//emumo.xiami.com/artist/2103332409" >秦博</a>
        const $this = $(this);
        const link = utils.cleanLink($this.attr('href'));

        musicians.push({
            id: link.replaceAll(/^.+\//g, ''),
            name: $this.attr('title'),
            link: utils.patchLink(link),
        });
    });

    return true;
}

(async () => {
    const max_fetch_count = 1000; // 最大获取数
    const batch_size = 500;
    let page = 1;
    let batch_index = 0;
    let fetch_count = 0;
    let musicians = [];

    while (true) {
        console.log('Fetch the ' + page + 'th page data ...');
        await fetchMusicians(musicians, page++);

        fetch_count += musicians.length;

        const has_more = fetch_count < max_fetch_count;
        if (!has_more || musicians.length >= batch_size) {
            const data_file = config.musicians_data_file + "." + (batch_index++);

            console.log('>> Write ' + musicians.length + ' musicians to ' + data_file + ' ...');
            await utils.writeJson(data_file, musicians);

            musicians = [];
        }

        if (!has_more) {
            console.log('No more musicians.');
            break;
        }
    }
})();
