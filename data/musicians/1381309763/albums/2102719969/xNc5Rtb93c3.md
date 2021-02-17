[怎样走](https://emumo.xiami.com/song/xNc5Rtb93c3)
====================================================

- **所属专辑**: [贝瓦儿歌 系列19](../2102719969.md)
- **演唱者**: 贝瓦儿歌
- **作词**: 
- **作曲**: 
- **编曲**: 
- **播放数**: 8732
- **分享数**: 1
- **评论数**: 0

## 歌词

<div>

</div>
</br>

> <p>
> <script>
> function doPure() {
> $.get('/song/puresong',
> {
> 'mark': 1,
> 'song_id': 1795694725
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
> 'song_id': 1795694725
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

|  |  |  |  |
| :-- | :-- | :-- | :-- |
