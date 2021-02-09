// .mjs 表示该文件为ES6模块，从而可以直接使用 import 等特性
// debug: https://nodejs.org/en/docs/guides/debugging-getting-started/
// - node --inspect-brk js/artists.mjs
// - chrome open `chrome://inspect`

// https://github.com/shelljs/shelljs
import shell from 'shelljs';

import * as config from './config.mjs';
import * as utils from './utils.mjs';

function desensitizeComment(comment) {
    console.log('>>>> desensitize user name from [' + comment.author.name + '] to [' + config.desensitized_user_name + '] ...');
    comment.author.name = config.desensitized_user_name;

    desensitizeComments(comment.replies || []);
}

function desensitizeComments(comments) {
    (comments || []).forEach(function(comment) {
        desensitizeComment(comment);
    });
}

async function desensitizeAlbums(musician) {
    const albums_dir = config.get_musician_album_data_dir(musician);
    const album_json_files = shell.ls(albums_dir + "/*.json");

    for (let i = 0; i < album_json_files.length; i++) {
        let album_json_file = album_json_files[i];
        let album = await utils.readJson(album_json_file);

        console.log('>> desensitize comments for album [' + album.name + '] ...');
        desensitizeComments(album.comments);
        await utils.writeJson(album_json_file, album);

        let album_dir = config.get_file_from_musician_album_data_dir(musician, album.id);
        let song_json_files = shell.ls(album_dir + "/*.json");
        for (let j = 0; j < song_json_files.length; j++) {
            let song_json_file = song_json_files[j];
            let song = await utils.readJson(song_json_file);

            console.log('>> desensitize comments for song [' + song.name + '] ...');
            desensitizeComments(song.comments);
            await utils.writeJson(song_json_file, song);
        }
    }
}

async function desensitizeMusicians(musician) {
    const musician_comments_json_file = config.get_file_from_musician_data_dir(musician, "comments.json");

    const musician_comments = await utils.readJson(musician_comments_json_file);

    console.log('Desensitize comments for musician [' + musician.name + '] ...');
    desensitizeComments(musician_comments);
    await utils.writeJson(musician_comments_json_file, musician_comments);

    await desensitizeAlbums(musician);
}

(async () => {
    const files = shell.ls(config.musicians_data_file + ".*");

    for (let i = 0; i < files.length; i++) {
        let file = files[i];
        let musicians = await utils.readJson(file);

        for (let j = 0; j < musicians.length; j++) {
            let musician = musicians[j];

            await desensitizeMusicians(musician);
        }
    }
})();
