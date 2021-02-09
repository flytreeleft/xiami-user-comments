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

async function fetchArtistAlbum(album) {
    const response = await fetch(album.link, {
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

    if ($('#album_cover').length == 0) {
        return null;
    }

    album.name = $('#title h1').text();
    album.photo_url = utils.patchLink(utils.cleanLink($('#album_cover > a > img').attr('src')));

    $('#album_info table td').each(function() {
        const $this = $(this);
        const $siblings = $this.siblings();
        const text = utils.trim($this.text());
        const value = $siblings.text();

        if (text.startsWith('艺人')) {
            album.artist_name = utils.trim(value);
        } else if (text.startsWith('语种')) {
            album.languages = utils.trim(value).split(/\s*[,、;]\s*/);
        } else if (text.startsWith('唱片公司')) {
            album.companies = utils.trim(value).split(/\s*\/\s*/);
        } else if (text.startsWith('发行时间')) {
            album.published_date = utils.trim(value).split(/\s*\/\s*/);
        } else if (text.startsWith('专辑类别')) {
            album.categories = utils.trim(value).split(/\s*、\s*/);
        } else if (text.startsWith('专辑风格')) {
            album.styles = utils.trim(value).split(/\s*,\s*/);
        }
    });

    $('.music_counts > ul > li').each(function(index) {
        const $this = $(this);
        const num = parseInt($this.text().trim().replaceAll(/^(\d+).*/g, '$1'));

        if (index == 0) {
            album.play_count_num = num;
        } else if (index == 1) {
            album.favorite_count_num = num;
        } else if (index == 2) {
            album.comments_num = num;
        }
    });

    album.intro = utils.trim($('#album_intro .album_intro_brief > span').html());

    album.songs = $('#track_list .song_name').map(function() {
        const $this = $(this);
        const $link = $this.children('a').first();
        const name = utils.trim($link.text());
        const link = utils.cleanLink('https://emumo.xiami.com'+$link.attr('href'));

        return {name, link};
    }).get() || [];

    // 获取专辑评论
    album.comments = await utils.parseAndFetchPageComments($('#wall_list').html(), async function(page) {
        console.log('>> try to get ' + page + 'th page comments of album - ' + album.name + ' ...');

        const response = await fetch("https://emumo.xiami.com/commentlist/turnpage/id/"+album.id+"/page/"+page+"/ajax/1", {
            "credentials": "include",
            "headers": {
                "User-Agent": config.browser_agent,
                "X-Requested-With": "XMLHttpRequest",
                "Referer": album.link,
                "Cookie": config.cookie,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            "body": "type=1",
            "method": "POST",
            "mode": "cors"
        });

        return await response.text();
    });

    if (!album.comments) {
        return null;
    }

    return album;
}

async function saveMusicianAlbums(musician) {
    let json_file = config.get_file_from_musician_data_dir(musician, "albums.json");
    let albums = await utils.readJson(json_file);

    for (let i = 0; i < albums.length; i++) {
        let album = albums[i];
        let json_file = config.get_file_from_musician_album_data_dir(musician, album.id + ".json");

        await utils.writeJsonIfFileNotExist(json_file, async function() {
            console.log('Fetch [' + musician.name + '(' + musician.id + ')] album - ' + (album.name || album.id) + ' ...');

            return await fetchArtistAlbum(album);
        });
    }
}

(async () => {
    const files = shell.ls(config.musicians_data_file + ".*");

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let musicians = await utils.readJson(file);

        for (let j = 0; j < musicians.length; j++) {
            let musician = musicians[j];

            await saveMusicianAlbums(musician);
        }
    }
})();
