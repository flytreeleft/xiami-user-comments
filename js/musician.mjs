// .mjs 表示该文件为ES6模块，从而可以直接使用 import 等特性
// debug: https://nodejs.org/en/docs/guides/debugging-getting-started/
// - node --inspect-brk js/artists.mjs
// - chrome open `chrome://inspect`

// https://github.com/shelljs/shelljs
import shell from 'shelljs';

import fetch from "node-fetch";
// https://github.com/cheeriojs/cheerio
import * as cheerio from 'cheerio';

import * as config from './config.mjs';
import * as utils from './utils.mjs';

async function getMusicianRealLink(musician) {
    const response = await fetch(musician.link, {
        "credentials": "include",
        "headers": {
            "User-Agent": config.browser_agent,
            "Cookie": config.cookie,
        },
        "method": "GET",
        "mode": "cors"
    });
    musician.real_link = response.url;

    return await response.text();
}

async function fetchMusicianProfile(url) {
    const response = await fetch(url, {
        "credentials": "include",
        "headers": {
            "User-Agent": config.browser_agent,
            "Cookie": config.cookie,
        },
        "method": "GET",
        "mode": "cors"
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    return utils.trim($('#artist-record').text());
}

async function fetchMusicianDetail(musician) {
    const html = await getMusicianRealLink(musician);
    const $ = cheerio.load(html);

    if ($('#artist_block').length == 0) {
        return null;
    }

    musician.photo_url = $('#artist_photo #cover_lightbox img').attr('src');

    $('.music_counts > ul > li').each(function(index) {
        const $this = $(this);
        const num = parseInt($this.text().trim().replaceAll(/^(\d+).*/g, '$1'));

        if (index == 0) {
            musician.play_count_num = num;
        } else if (index == 1) {
            musician.fans_num = num;
        } else if (index == 2) {
            musician.comments_num = num;
        }
    });

    $('#artist_info table td').each(function() {
        const $this = $(this);
        const $siblings = $this.siblings();
        const text = utils.trim($this.text());
        const value = utils.trim($siblings.text());

        if (text.startsWith('地区')) {
            musician.area = value;
        } else if (text.startsWith('风格')) {
            musician.music_styles = value.split(/\s*,\s*/);
        }
    });

    // 获取音乐人档案
    const profile_url = musician.real_link + '/profile';
    musician.profile = await fetchMusicianProfile(profile_url);

    return musician;
}

async function fetchMusicianComments(musician) {
    const response = await fetch(musician.link, {
        "credentials": "include",
        "headers": {
            "User-Agent": config.browser_agent,
            "Cookie": config.cookie,
        },
        "method": "GET",
        "mode": "cors"
    });
    musician.real_link = response.url;

    const html = await getMusicianRealLink(musician);
    const $ = cheerio.load(html);

    if ($('#artist_block').length == 0) {
        return null;
    }

    return await utils.parseAndFetchPageComments($('#wall_list').html(), async function(page) {
        console.log('>> try to get ' + page + 'th page comments ...');

        const response = await fetch("https://i.xiami.com/commentlist/turnpage/id/"+musician.id+"/page/"+page+"/ajax/1", {
            "credentials": "include",
            "headers": {
                "User-Agent": config.browser_agent,
                "X-Requested-With": "XMLHttpRequest",
                "Referer": musician.real_link,
                "Cookie": config.cookie,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            "body": "type=3",
            "method": "POST",
            "mode": "cors"
        });

        return await response.text();
    });
}

function parseMusicianAlbums(html) {
    const $ = cheerio.load(`<div id="root">${html}</div>`);
    // 根据html中是否包含下一页判断是否还存在其他数据
    const hasNextPage = $('#root > .all_page').text().indexOf('下一页') > 0;

    return {
        hasNextPage: hasNextPage,
        albums: $('#root > .albumThread_list > ul > li > .album_item100_thread').map(function() {
            const $this = $(this);
            const $link = $this.find('.info .detail .name a');
            const name = utils.trim($link.attr('title'));
            const link = utils.patchLink(utils.cleanLink($link.attr('href')));
            const id = link.replaceAll(/^.+\//g, '');

            return {id, name, link};
        }).get(),
    };
}

async function fetchMusicianAlbums(musician, page = 1) {
    console.log('>> try to get ' + page + 'th page albums ...');

    const response = await fetch(musician.real_link+"/album/page/"+page, {
        "credentials": "include",
        "headers": {
            "User-Agent": config.browser_agent,
            "Cookie": config.cookie,
        },
        "method": "GET",
        "mode": "cors"
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const artist_albums = parseMusicianAlbums($('#artist_albums').html());
    let albums = artist_albums.albums;

    if (page <= 200 && artist_albums.hasNextPage) {
        const list = await fetchMusicianAlbums(musician, page + 1);
        albums = albums.concat(list);
    }

    return albums;
}

async function saveMusician(musician) {
    let json_file = config.get_file_from_musician_data_dir(musician, "profile.json");
    await utils.writeJsonIfFileNotExist(json_file, async function() {
        console.log('Fetch [' + musician.name + '(' + musician.id + ')] profile ...');

        return await fetchMusicianDetail(musician);
    });

    json_file = config.get_file_from_musician_data_dir(musician, "comments.json");
    await utils.writeJsonIfFileNotExist(json_file, async function() {
        console.log('Fetch [' + musician.name + '(' + musician.id + ')] comments ...');

        return await fetchMusicianComments(musician);
    });

    json_file = config.get_file_from_musician_data_dir(musician, "albums.json");
    await utils.writeJsonIfFileNotExist(json_file, async function() {
        console.log('Fetch [' + musician.name + '(' + musician.id + ')] albums ...');

        await getMusicianRealLink(musician);

        return await fetchMusicianAlbums(musician);
    });
}

(async () => {
    const files = shell.ls(config.musicians_data_file + ".*");

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let musicians = await utils.readJson(file);

        for (let j = 0; j < musicians.length; j++) {
            let musician = musicians[j];

            await saveMusician(musician);
        }
    }
})();
