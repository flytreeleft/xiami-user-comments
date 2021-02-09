// .mjs 表示该文件为ES6模块，从而可以直接使用 import 等特性
// debug: https://nodejs.org/en/docs/guides/debugging-getting-started/
// - node --inspect-brk js/artists.mjs
// - chrome open `chrome://inspect`

// https://github.com/shelljs/shelljs
import shell from 'shelljs';
import path from 'path';

import fetch from "node-fetch";
// https://github.com/cheeriojs/cheerio
import * as cheerio from 'cheerio';

import * as config from './config.mjs';
import * as utils from './utils.mjs';

async function fetchAlbumSong(song) {
    const response = await fetch(song.link, {
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

    if ($('#albums_info').length == 0) {
        return null;
    }

    song.id = $('#qrcode .acts').text();
    song.name = $('#title h1').text();

    $('#albums_info td').each(function() {
        const $this = $(this);
        const $siblings = $this.siblings();
        const text = utils.trim($this.text());
        const value = $siblings.text();

        if (text.startsWith('所属专辑')) {
            song.album_name = utils.trim(value);
        } else if (text.startsWith('演唱者')) {
            song.singers = utils.trim(value);
        } else if (text.startsWith('作词')) {
            song.lyrics_by = utils.trim(value).split(/\s*;\s*/);
        } else if (text.startsWith('作曲')) {
            song.composed_by = utils.trim(value).split(/\s*;\s*/);
        } else if (text.startsWith('编曲')) {
            song.arranged_by = utils.trim(value).split(/\s*;\s*/);
        }
    });

    $('.music_counts > ul > li').each(function(index) {
        const $this = $(this);
        const num = parseInt($this.text().trim().replaceAll(/^(\d+).*/g, '$1'));

        if (index == 0) {
            song.play_count_num = 0;
        } else if (index == 1) {
            song.share_count_num = num;
        } else if (index == 2) {
            song.comments_num = num;
        }
    });
    // 获取曲目试听数
    song.play_count_num = await fetchSongPlayCount(song);

    song.lyric = utils.trim($('#lrc .lrc_main').html());

    const $lyric = $('#lyric');
    $lyric.find('[name="pure"]').parent().remove();
    song.lyric_extra = utils.trim($lyric.html());

    // 获取音乐评论
    song.comments = await utils.parseAndFetchPageComments($('#wall_list').html(), async function(page) {
        console.log('>> try to get ' + page + 'th page comments of song - ' + song.name + ' ...');

        const response = await fetch("https://emumo.xiami.com/commentlist/turnpage/id/"+song.id+"/page/"+page+"/ajax/1", {
            "credentials": "include",
            "headers": {
                "User-Agent": config.browser_agent,
                "X-Requested-With": "XMLHttpRequest",
                "Referer": song.link,
                "Cookie": config.cookie,
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            },
            "body": "type=4",
            "method": "POST",
            "mode": "cors"
        });

        return await response.text();
    });

    if (!song.comments) {
        return null;
    }

    return song;
}

async function fetchSongPlayCount(song) {
    const response = await fetch("https://emumo.xiami.com/count/getplaycount?id="+song.id+"&type=song&_xiamitoken="+config.xiami_token, {
        "credentials": "include",
        "headers": {
            "User-Agent": config.browser_agent,
            "Cookie": config.cookie,
            "X-Requested-With": "XMLHttpRequest",
            "Referer": song.link,
        },
        "method": "GET",
        "mode": "cors"
    });

    const json = await response.json();
    return json.plays || 0;
}

async function saveMusicianAlbumSongs(musician) {
    const albums_dir = config.get_musician_album_data_dir(musician);
    const album_json_files = shell.ls(albums_dir + "/*.json");

    for (let i = 0; i < album_json_files.length; i++) {
        let album_json_file = album_json_files[i];
        let album = await utils.readJson(album_json_file);

        let album_dir = config.get_file_from_musician_album_data_dir(musician, album.id);
        shell.mkdir('-p', album_dir);

        let songs = album.songs || [];
        for (let j = 0; j < songs.length; j++) {
            let song = songs[j];
            let json_file = path.join(album_dir, song.link.replaceAll(/^.+\//g, '') + ".json");

            await utils.writeJsonIfFileNotExist(json_file, async function() {
                console.log('Fetch [' + album.name + '(' + album.id + ')] song - ' + song.name + ' ...');

                return await fetchAlbumSong(song);
            });
        }
    }
}

(async () => {
    const files = shell.ls(config.musicians_data_file + ".*");

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let musicians = await utils.readJson(file);

        for (let j = 0; j < musicians.length; j++) {
            let musician = musicians[j];

            await saveMusicianAlbumSongs(musician);
        }
    }
})();
