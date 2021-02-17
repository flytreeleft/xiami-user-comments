[像我一样飞翔 (伴奏带)](https://emumo.xiami.com/song/b1Qsea8c5)
====================================================

- **所属专辑**: [你是我的玫瑰花](../3688.md)
- **演唱者**: 庞龙
- **作词**: 庞龙
- **作曲**: 杨嘉松
- **编曲**: 孟繁浩,吉他,杨嘉凇
- **播放数**: 212
- **分享数**: 0
- **评论数**: 0

## 歌词

</br>

> <p>
> <script>
> function doPure() {
> $.get('/song/puresong',
> {
> 'mark': 1,
> 'song_id': 45358
> },
> function(data) {
> if (data.status) {
> $('input[name="pure"]').attr('checked', true);
> closedialog();
> }
> });
> }
> function undoPure() {
> $.get('/song/puresong',
> {
> 'mark': 0,
> 'song_id': 45358
> },
> function(data) {
> if (data.status) {
> $('input[name="pure"]').attr('checked', false);
> closedialog();
> }
> });
> }
> $(function() {
> $('input[name="pure"]').click(function() {
> if ($(this).attr('checked')) {
> showDialog('', '<h3>提示</h3><div class="dialog_content"><p class="alert"><span>歌曲是否为纯音乐，没有歌词？</span><a class="button major" href="" onclick="doPure();return false;">是，纯音乐</a><a class="button minor" href="" onclick="closedialog();return false;">取消</a></p></div><a href="" class="jqmClose">关闭</a>');
> }
> else {
> showDialog('', '<h3>提示</h3><div class="dialog_content"><p class="alert"><span>歌曲是否为纯音乐，没有歌词？</span><a class="button major" href="" onclick="undoPure();return false;">不是纯音乐</a><a class="button minor" href="" onclick="closedialog();return false;">取消</a></p></div><a href="" class="jqmClose">关闭</a>');
> }
> return false;
> });
> });
> </script>
> </p>

## 评论

