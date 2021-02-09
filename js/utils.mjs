import { promises as fs } from "fs";
import crypto from 'crypto';
// https://github.com/shelljs/shelljs
import shell from 'shelljs';
import path from 'path';

// https://github.com/cheeriojs/cheerio
import * as cheerio from 'cheerio';

import fetch from './fetch-timeout.mjs';

export function patchLink(link) {
    if (link.startsWith('//')) {
        return `https:${link}`;
    }
    return link;
}

export function cleanLink(link) {
    return link.replaceAll(/\?.*$/g, '');
}

export function trim(str) {
    return (str || '').replaceAll(/^\s*|\s*$/g, '');
}

export function parseComment(html) {
    // 用户头像、名称、title、时间、赞、弱、评论内容
    // 用户详细信息从用户链接中获取
    // 评论用户可能为音乐人，可根据其用户链接的最终地址是否变化进行判断
    // 评论有多级
    const $ = cheerio.load(`<div id="root">${html}</div>`);
    const user_cover = $('#root > .usr_cover img').attr('src');
    const $info = $('#root > .info');

    const $author = $info.children('.author');
    const $author_link = $author.children('a');
    const user_link = cleanLink($author_link.attr('href'));
    const user_name = trim($author_link.text());

    $author_link.remove();
    const user_motto = trim($author.text()).replaceAll(/^\(|\)$/g, '');

    const time = trim($info.children('.time').text());

    const $ageree = $info.children('.ageree').find('a');
    const ageree_num = parseInt($ageree.attr('rel') || '0');
    const $disageree = $info.children('.disageree').find('a');
    const disageree_num = parseInt($disageree.attr('rel') || '0');

    const $brief = $('#root > .brief');
    // 评论中的表情为图片链接，直接保留HTML片段，以便于分析图片链接
    const brief = trim($brief.children(':not(.post_item)').html()).replaceAll(/[\t\n]+/g, '');

    return {
        author: {
            id: user_link.replaceAll(/^.+\//g, ''),
            name: user_name,
            motto: user_motto,
            link: patchLink(user_link),
            photo_url: patchLink(user_cover),
        },
        time: time,
        ageree_num: ageree_num,
        disageree_num: disageree_num,
        brief: brief,
        replies: $brief.children('.post_item').map(function() {
            return parseComment($(this).html());
        }).get(),
    };
}

export function parseWallList(html) {
    const $ = cheerio.load(`<div id="root">${html}</div>`);
    // 根据html中是否包含下一页判断是否还存在其他数据
    const hasNextPage = $('#root > .all_page').text().indexOf('下一页') > 0;

    return {
        hasNextPage: hasNextPage,
        comments: $('#root > ul > li > .post_item').map(function() {
            return parseComment($(this).html());
        }).get() || [],
    };
}

export async function parseAndFetchPageComments(html, fetchPageCb, page = 2) {
    const wall_list = parseWallList(html);

    let comments = wall_list.comments;
    // Note: 最多只能获取200页评论，超过后，获取的将始终为第200页的评论
    if (page <= 200 && wall_list.hasNextPage) {
        const pageHtml = await fetchPageCb(page);

        // // 若是不能正常获取到下一页的评论页面（即，有下一页，但得到的页面不包含评论），则返回null
        // const $ = cheerio.load(pageHtml);
        // if ($('.post_item').length == 0) {
        //     return null;
        // }

        // 解析得到的评论页面，并尝试递归处理下一页评论
        const list = await parseAndFetchPageComments(pageHtml, fetchPageCb, page + 1);
        if (!list) {
            return null;
        }
        comments = comments.concat(list);
    }

    return comments;
}

export async function writeJson(file, obj, pretty = false) {
    const json = JSON.stringify(obj, null, pretty ? 2 : 0);

    await fs.writeFile(file, json, 'utf8');
}

export async function writeJsonIfFileNotExist(file, cb) {
    if (shell.test('-e', file)) {
        console.log(file + ' already exist, nothing to do.');
        return;
    }

    const obj = await cb();
    if (obj) {
        await writeJson(file, obj);
    }
}

export async function readJson(file) {
    if (!shell.test('-e', file)) {
        return {};
    }

    return JSON.parse(shell.cat(file));
}

export function sleep(ms) {
    shell.exec(`sleep ${ms}s`);
}

export function md5(str) {
    return crypto.createHash('md5').update(str).digest("hex");
}

export async function fetchAndSaveImage(dir, url) {
    // https://pic.xiami.net/images/avatar_new/557074726_1554829324.jpg@1e_1c_0i_1o_100Q_100w_100h
    // https://img.xiami.net/res/js/jquery/editor/sets/bbcode/images/smilies/default/425.png
    const image_suffix = url.replaceAll(/@[^@]+$/g, '').replaceAll(/.+\.([^.]+)$/g, '$1');
    const image_file = path.join(dir, md5(url) + '.' + image_suffix);

    if (shell.test('-e', image_file)) {
        console.log('>> ' + url + ' is already fetched.');
        return;
    }

    shell.mkdir('-p', dir);

    console.log('>> fetch ' + url + ' to ' + image_file + ' ...');

    try {
        const response = await fetch(url, {timeout: 30 * 1000});
        const buffer = await response.buffer();

        await fs.writeFile(image_file, buffer);
    } catch (e) {
        console.log('>> fetch ' + url + ' failed: ' + e.message);
    }
}
