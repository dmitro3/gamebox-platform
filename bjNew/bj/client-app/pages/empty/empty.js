/**
 * 通用空状态页
 *
 * URL 参数（全部可选）：
 *   ?title=自定义标题
 *   ?desc=自定义副文
 *   ?backText=按钮文案
 *   ?backUrl=返回路径（不传 → history.back()）
 *
 * 复用示例：
 *   App.go('../empty/empty.html?title=暂无邀请&desc=您还没邀请过任何好友&backText=去邀请&backUrl=../share/share.html');
 */
$(function () {
  const params = new URLSearchParams(location.search);
  const title    = params.get('title');
  const desc     = params.get('desc');
  const backText = params.get('backText');
  const backUrl  = params.get('backUrl');

  if (title)    $('#spTitle').text(title);
  if (desc)     $('#spSub').text(desc);
  if (backText) $('#backBtn').text(backText);

  $('#backBtn').on('click', function () {
    if (backUrl) {
      location.href = backUrl;
    } else if (history.length > 1) {
      history.back();
    } else {
      App.go('../game-lobby/game-lobby.html');
    }
  });
});
