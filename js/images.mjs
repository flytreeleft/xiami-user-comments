// .mjs 表示该文件为ES6模块，从而可以直接使用 import 等特性
// debug: https://nodejs.org/en/docs/guides/debugging-getting-started/
// - node --inspect-brk js/artists.mjs
// - chrome open `chrome://inspect`

// https://github.com/shelljs/shelljs
import shell from 'shelljs';

// https://github.com/cheeriojs/cheerio
import * as cheerio from 'cheerio';

import * as config from './config.mjs';
import * as utils from './utils.mjs';

function getImageUrlFromHtml(html) {
    if (!html) {
        return [];
    }

    const $ = cheerio.load(html);

    return $('img').map(function () {
        const src = $(this).attr('src');
        const image_url = utils.patchLink(utils.cleanLink(src));

        return image_url;
    }).get();
}

function getCommentImages(comments) {
    const user_photo_urls = {};
    const comment_image_urls = {};

    (comments || []).forEach(function (comment) {
        const photo_url = utils.patchLink(utils.cleanLink(comment.author.photo_url));
        user_photo_urls[photo_url] = {};

        getImageUrlFromHtml(comment.brief).forEach(function (url) {
            comment_image_urls[url] = {};
        });

        const reply_images = getCommentImages(comment.replies);

        Object.assign(user_photo_urls, reply_images.users);
        Object.assign(comment_image_urls, reply_images.comments);
    });

    return {
        users: user_photo_urls,
        comments: comment_image_urls,
    };
}

async function fetchAndSaveCommentImages(comments) {
    const comment_images = getCommentImages(comments);

    const user_image_dir = config.get_file_from_images_dir('users');
    for (let url in comment_images.users) {
        await utils.fetchAndSaveImage(user_image_dir, url);
    }

    const comment_image_dir = config.get_file_from_images_dir('comments');
    for (let url in comment_images.comments) {
        await utils.fetchAndSaveImage(comment_image_dir, url);
    }
}

async function fetchAndSaveAlbumImages(musician) {
    const albums_dir = config.get_musician_album_data_dir(musician);
    const album_json_files = shell.ls(albums_dir + "/*.json");

    let comments = [];
    let album_photo_urls = [];
    let song_image_urls = [];
    for (let i = 0; i < album_json_files.length; i++) {
        let album_json_file = album_json_files[i];
        let album = await utils.readJson(album_json_file);

        album_photo_urls.push(album.photo_url);

        comments = comments.concat(album.comments);
        album_photo_urls = album_photo_urls.concat(getImageUrlFromHtml(album.intro));

        let album_dir = config.get_file_from_musician_album_data_dir(musician, album.id);
        let song_json_files = shell.ls(album_dir + "/*.json");
        for (let j = 0; j < song_json_files.length; j++) {
            let song_json_file = song_json_files[j];
            let song = await utils.readJson(song_json_file);

            comments = comments.concat(song.comments);
            song_image_urls = song_image_urls.concat(getImageUrlFromHtml(song.lyric));
        }
    }

    console.log('Fetch album and song comment images for [' + musician.name + '] ...');
    await fetchAndSaveCommentImages(comments);

    console.log('Fetch album and song images for [' + musician.name + '] ...');
    const album_image_dir = config.get_file_from_images_dir('albums');
    for (let i = 0; i < album_photo_urls.length; i++) {
        let url = album_photo_urls[i];
        await utils.fetchAndSaveImage(album_image_dir, url);
    }

    const song_image_dir = config.get_file_from_images_dir('songs');
    for (let i = 0; i < song_image_urls.length; i++) {
        let url = song_image_urls[i];
        await utils.fetchAndSaveImage(song_image_dir, url);
    }
}

async function fetchAndSaveMusicianImages(musician) {
    const musician_profile_json_file = config.get_file_from_musician_data_dir(musician, "profile.json");
    const musician_comments_json_file = config.get_file_from_musician_data_dir(musician, "comments.json");

    const musician_profile = await utils.readJson(musician_profile_json_file);
    const musician_comments = await utils.readJson(musician_comments_json_file);

    const musician_photo_dir = config.get_file_from_images_dir('musicians');

    console.log('Fetch profile images for [' + musician.name + '] ...');
    await utils.fetchAndSaveImage(musician_photo_dir, musician_profile.photo_url);

    console.log('Fetch comment images for [' + musician.name + '] ...');
    await fetchAndSaveCommentImages(musician_comments);

    // 保存专辑中的图片
    await fetchAndSaveAlbumImages(musician);
}

(async () => {
    const files = shell.ls(config.musicians_data_file + ".*");

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let musicians = await utils.readJson(file);

        for (let j = 0; j < musicians.length; j++) {
            let musician = musicians[j];

            await fetchAndSaveMusicianImages(musician);
        }
    }
})();
