/**
 * 账号管理：个人头像 / 修改昵称 / 修改密码 / 点击音效 / 背景音乐
 *  - 头像 / 昵称：跳已有 profile 页（原型 mock）
 *  - 密码：toast 占位（后期接 server）
 *  - 点击音效：App.getSoundOn / setSoundOn（localStorage app_sound）
 *  - 背景音乐：App.getBgmOn / setBgmOn（循环播放 assets/audio/1.mp3）
 */
$(function () {
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const qs = roomNo ? `?roomNo=${roomNo}` : '';

  const user = App.getUser();
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem(`profile_${user.uid}`) || '{}') || {}; }
  catch (e) {}

  $('#curAvatar').attr('src', profile.avatar  || user.avatar);
  $('#curNickname').text(profile.nickname || user.name);

  $('#backBtn').on('click', () => history.length > 1 ? history.back() : App.go(`../settings/settings.html${qs}`));

  $('.am-row').on('click', function () {
    const key = $(this).data('key');
    if (key === 'avatar' || key === 'nickname') {
      App.go(`../profile/profile.html${qs}`);
      return;
    }
    if (key === 'password') {
      App.toast('修改密码 · 即将开放');
      return;
    }
    // sound / bgm 行点击事件交给开关本身
  });

  // ===== 点击音效开关 =====
  $('#soundSwitch').prop('checked', App.getSoundOn());
  $('#soundSwitch').on('change', function () {
    const on = this.checked;
    App.setSoundOn(on);
    if (on) {
      App.playClickSound();
      App.toast('点击音效已开启');
    } else {
      App.toast('点击音效已关闭');
    }
  });

  // ===== 背景音乐开关 =====
  $('#bgmSwitch').prop('checked', App.getBgmOn(user.uid));
  $('#bgmSwitch').on('change', function () {
    App.setBgmOn(this.checked, user.uid);
    App.toast(this.checked ? '背景音乐已开启' : '背景音乐已关闭');
  });
});
