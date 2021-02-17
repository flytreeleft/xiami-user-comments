// .mjs 表示该文件为ES6模块，从而可以直接使用 import 等特性
// debug: https://nodejs.org/en/docs/guides/debugging-getting-started/
// - node --inspect-brk js/artists.mjs
// - chrome open `chrome://inspect`

// https://github.com/shelljs/shelljs
import shell from 'shelljs';
import path from 'path';

// https://github.com/cheeriojs/cheerio
import * as cheerio from 'cheerio';

import * as config from './config.mjs';
import * as utils from './utils.mjs';

function get_user_photo_file(user) {
    // https://pic.xiami.net/images/default/xiami_8/avatar_new_3x.png@1e_1c_0i_1o_100Q_100w_100h
    return `../images/users/default.png`;
}

function get_musician_photo_file(musician) {
    const file = utils.get_image_url_md5_name(musician.photo_url);

    return `../images/musicians/${file}`;
}

function get_album_photo_file(album) {
    const file = utils.get_image_url_md5_name(album.photo_url);

    return `../images/albums/${file}`;
}

function get_comment_image_file(url) {
    const file = utils.get_image_url_md5_name(url);

    return `../images/comments/${file}`;
}

function get_song_code(song) {
    return song.link.replaceAll(/^.+\//g, '');
}

function convert_comment_brief(brief, relative_path = '.') {
    const $ = cheerio.load(brief);

    $('img').each(function () {
        const $this = $(this);
        const src = $this.attr('src');
        const image_url = utils.patchLink(utils.cleanLink(src));

        $this.attr('src', `${relative_path}/${get_comment_image_file(image_url)}`);
    });
    $('a').each(function () {
        const $this = $(this);
        const href = $this.attr('href');

        if (href == "//emumo.xiami.com/apps/mobile") {
            $this.remove();
        } else {
            $this.attr('href', utils.patchLink(href));
        }
    });

    return $('body').html().replaceAll(/\s*<br>\s*/g, '');
}

function convert_comment(comment, indent = 0, relative_path = '.') {
    let text = "";

    for (let i = 0; i < indent; i++) {
        text += `| ⇒ `;
    }

    // 用户
    text += `| `;
    text += `![](${relative_path}/${get_user_photo_file(comment.author)})<br>[${comment.author.name}](${comment.author.link})<br>${comment.author.motto}<br>${comment.time}<br>赞(${comment.ageree_num}) 踩(${comment.disageree_num})`;

    // 评论
    text += ` | `;
    // 加上<div>以避免出现markdown语法
    text += `<div>${convert_comment_brief(comment.brief, relative_path)}</div>`;
    text += ` |\n`;

    // 回复
    comment.replies.forEach((reply) => {
        text += `${convert_comment(reply, indent + 1, relative_path)}`;
    });

    return text;
}

function convert_comments(comments, relative_path = '.') {
    let text = "";

    text += `|  |  |  |  |\n`;
    text += `| :-- | :-- | :-- | :-- |\n`;

    comments.forEach((comment) => {
        text += `${convert_comment(comment, 0, relative_path)}`;
    });

    return text;
}

function convert_albums(albums) {
    let text = "";

    text += `| 名称 | 语种 | 唱片公司 | 发行时间 | 专辑类别 | 专辑风格 |\n`;
    text += `| :--: | :-- | :-- | :-- | :-- | :-- |\n`;

    albums.forEach((album) => {
        text += `| `;
        text += `[![](../${get_album_photo_file(album)})<br>${album.name}](./albums/${album.id}.md)`;
        text += ` | `;
        text += `${(album.languages || []).join(', ')}`;
        text += ` | `;
        text += `${(album.companies || []).join(', ')}`;
        text += ` | `;
        text += `${(album.published_date || []).join(', ')}`;
        text += ` | `;
        text += `${(album.categories || []).join(', ')}`;
        text += ` | `;
        text += `${(album.styles || []).join(', ')}`;
        text += ` |\n`;
    });

    return text;
}

function convert_song_lyric_extra(song) {
    const $ = cheerio.load(song.lyric_extra);

    $('a').each(function () {
        const $this = $(this);
        const href = $this.attr('href');

        if (href.startsWith('/')) {
            $this.attr('href', `https://emumo.xiami.com${href}`);
        }
    });

    return $('body').html().replaceAll(/\s*\n\s*/g, '\n').replaceAll(/^/mg, '> ');
}

async function convertMusicianAlbumSong(musician, album, song) {
    const album_dir = config.get_file_from_musician_album_data_dir(musician, album.id);
    const index_file = path.join(album_dir, `${get_song_code(song)}.md`);
    console.log(`>>>> convert song [${song.name}] to ${index_file} ...`);

    let text = "";
    text += `[${song.name}](${song.link})\n`;
    text += "====================================================\n";
    text += "\n";

    text += `- **所属专辑**: [${song.album_name}](../${album.id}.md)\n`;
    text += `- **演唱者**: ${song.singers}\n`;
    text += `- **作词**: ${(song.lyrics_by || []).join(',')}\n`;
    text += `- **作曲**: ${(song.composed_by || []).join(',')}\n`;
    text += `- **编曲**: ${(song.arranged_by || []).join(',')}\n`;
    text += `- **播放数**: ${song.play_count_num}\n`;
    text += `- **分享数**: ${song.share_count_num}\n`;
    text += `- **评论数**: ${song.comments_num}\n`;

    text += `\n`;
    text += `## 歌词\n`;
    text += `\n`;
    text += `<div>\n${song.lyric.replaceAll(/\s*\n\s*/g, '<br>\n')}\n</div>\n`;

    if (song.lyric_extra) {
        text += `</br>\n\n`;
        text += `${convert_song_lyric_extra(song)}\n`;
    }

    text += `\n`;
    text += `## 评论\n`;
    text += `\n`;
    text += `${convert_comments(song.comments, '../../..')}`;

    await utils.writeText(index_file, text);
}

async function convertMusicianAlbumSongs(musician, album) {
    const actual_songs = [];

    const songs = album.songs;
    for (let i = 0; i < songs.length; i++) {
        let song = songs[i];
        let album_dir = config.get_file_from_musician_album_data_dir(musician, album.id);
        let json_file = path.join(album_dir, `${get_song_code(song)}.json`);

        let data = await utils.readJson(json_file);
        if (!data.id) {
            continue;
        }
        Object.assign(song, data);

        await convertMusicianAlbumSong(musician, album, song);

        actual_songs.push(song);
    };

    return actual_songs;
}

async function convertMusicianAlbum(musician, album) {
    const index_file = config.get_file_from_musician_album_data_dir(musician, `${album.id}.md`);
    console.log(`>> convert album [${album.name} - ${album.id}] to ${index_file} ...`);

    const songs = await convertMusicianAlbumSongs(musician, album);

    let text = "";
    text += `${album.name}\n`;
    text += "============================\n";
    text += "\n";

    text += `|  |  |\n`;
    text += `| :--: | :-- |\n`;
    text += `| `;
    text += `[![](../../${get_album_photo_file(album)})<br>${album.name}](${album.link})`;
    text += ` | `;
    text += `**艺人**: [${musician.name}](../index.md)<br>`;
    text += `**语种**: ${(album.languages || []).join(', ')}<br>`;
    text += `**唱片公司**: ${(album.companies || []).join(', ')}<br>`;
    text += `**发行时间**: ${(album.published_date || []).join(', ')}<br>`;
    text += `**专辑类别**: ${(album.categories || []).join(', ')}<br>`;
    text += `**专辑风格**: ${(album.styles || []).join(', ')}<br>`;
    text += `**播放数**: ${album.play_count_num}<br>`;
    text += `**收藏数**: ${album.favorite_count_num}<br>`;
    text += `**评论数**: ${album.comments_num}<br>`;
    text += ` |\n`;

    text += `\n`;
    text += `## 简介\n`;
    text += `\n`;
    text += `<div>\n${album.intro.replaceAll(/\s*\n\s*/g, '<br>\n')}\n</div>\n`;

    text += `\n`;
    text += `## 曲目\n`;
    text += `\n`;
    songs.forEach((song) => {
        text += `- [${song.name}](./${album.id}/${song.link.replaceAll(/^.+\//g, '')}.md)\n`;
    });

    text += `\n`;
    text += `## 评论\n`;
    text += `\n`;
    text += `${convert_comments(album.comments, '../..')}`;

    await utils.writeText(index_file, text);
}

async function convertMusicianAlbums(musician, albums) {
    const actual_albums = [];

    for (let i = 0; i < albums.length; i++) {
        let album = albums[i];
        let json_file = config.get_file_from_musician_album_data_dir(musician, `${album.id}.json`);

        let data = await utils.readJson(json_file);
        if (!data.id) {
            continue;
        }
        Object.assign(album, data);

        await convertMusicianAlbum(musician, album);

        actual_albums.push(album);
    };

    return actual_albums;
}

async function convertMusician(musician) {
    const index_file = config.get_file_from_musician_data_dir(musician, "index.md");
    console.log(`Convert musician [${musician.name} - ${musician.id}] to ${index_file} ...`);

    let json_file = config.get_file_from_musician_data_dir(musician, "profile.json");
    const profile = await utils.readJson(json_file);
    Object.assign(musician, profile);

    json_file = config.get_file_from_musician_data_dir(musician, "comments.json");
    musician.comments = await utils.readJson(json_file);

    json_file = config.get_file_from_musician_data_dir(musician, "albums.json");
    let albums = await utils.readJson(json_file);
    albums = await convertMusicianAlbums(musician, albums);

    let text = "";
    text += `${musician.name}\n`;
    text += "============================\n";
    text += "\n";

    text += `|  |  |\n`;
    text += `| :--: | :-- |\n`;
    text += `| `;
    text += `[![](../${get_musician_photo_file(musician)})<br>${musician.name}](${musician.real_link})`;
    text += ` | `;
    text += `**播放数**: ${musician.play_count_num}<br>`;
    text += `**粉丝数**: ${musician.fans_num}<br>`;
    text += `**评论数**: ${musician.comments_num}<br>`;
    text += `**地区**: ${musician.area}<br>`;
    text += `**风格**: ${(musician.music_styles || []).join(', ')}<br>`;
    text += ` |\n`;

    text += `\n`;
    text += `## 档案\n`;
    text += `\n`;
    text += `<div>\n${musician.profile.replaceAll(/\s*\n\s*/g, '<br>\n')}\n</div>\n`;

    text += `\n`;
    text += `## 专辑\n`;
    text += `\n`;
    text += `${convert_albums(albums)}`;

    text += `\n`;
    text += `## 评论\n`;
    text += `\n`;
    text += `${convert_comments(musician.comments, '..')}`;

    await utils.writeText(index_file, text);

    return musician;
}

async function convertMusicians(musicians) {
    const index_file = config.get_file_from_musicians_dir("index.md");
    console.log(`Convert musicians list to ${index_file} ...`);

    const column_size = 4;
    const page_size = column_size * column_size;

    let text = "";
    text += "虾米音乐人\n";
    text += "================\n";

    for (let i = 0; i < musicians.length; i++) {
        let musician = musicians[i];
        let page = Math.round(i / page_size);

        // 章节 + 表头
        if (i % page_size == 0) {
            text += `\n`;
            text += `## Table ${page}\n`;
            text += `\n`;

            for (let j = 0; j < column_size; j++) {
                text += `|  `;
            }
            text += `|\n`;

            for (let j = 0; j < column_size; j++) {
                text += `| :--: `;
            }
            text += `|\n`;
        }

        // 列
        text += `| [![](${get_musician_photo_file(musician)})<br>${musician.name}](./${musician.id}/index.md) `;
        if (i % column_size == column_size - 1 || i == musicians.length - 1) {
            text += `|\n`;
        }
    }

    await utils.writeText(index_file, text);
}

(async () => {
    const files = shell.ls(config.musicians_data_file + ".*");

    const musicians = [];
    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let data = await utils.readJson(file);

        for (let j = 0; j < data.length; j++) {
            let musician = data[j];

            musician = await convertMusician(musician);
            musicians.push(musician);
        }
    }

    convertMusicians(musicians);
})();
