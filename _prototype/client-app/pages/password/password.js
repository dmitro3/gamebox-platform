/**
 * 修改密码页
 *
 * 当前实现：
 *   - 顶部展示当前账号（avatar / name / account）
 *   - 三栏：当前密码、新密码、确认新密码
 *   - 眼睛按钮显隐密码
 *   - 新密码实时强度评分（弱 / 中 / 强）
 *   - 提交前本地校验，再调 App.changePassword 修改 gamebox_accounts
 *   - 成功后 toast → 回到账号管理页
 */

$(function () {

  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();

  // ===== 顶部账号信息 =====
  const user = App.getUser();
  // 优先从账号表查最新的 avatar/name（避免 gamebox_user 是登录前的旧 mock 用户）
  const allAccounts = App.getAllAccounts();
  const acc = allAccounts.find(a => a.uid === user.uid) || {};
  const account = acc.account || user.account || '';
  let profile = {};
  try { profile = JSON.parse(localStorage.getItem(`profile_${user.uid}`) || '{}') || {}; }
  catch (_) {}

  $('#userAvatar').attr('src', profile.avatar || acc.avatar || user.avatar);
  $('#userName').text(profile.nickname || acc.name || user.name);
  $('#userAccount').text(account || '未登录');

  // ===== 返回 =====
  $('#backBtn').on('click', function () {
    if (window.history.length > 1) window.history.back();
    else App.go(roomNo ? `../account-manage/account-manage.html?roomNo=${roomNo}` : `../account-manage/account-manage.html`);
  });

  // ===== 眼睛按钮：显隐密码 =====
  $('.pwd-eye').on('click', function () {
    const $btn = $(this);
    const target = $btn.data('target');
    const $input = $('#' + target);
    const isPwd = $input.attr('type') === 'password';
    $input.attr('type', isPwd ? 'text' : 'password');
    $btn.find('.eye-close').toggle(!isPwd);
    $btn.find('.eye-open').toggle(isPwd);
  });

  // ===== 新密码强度评分 =====
  function evalStrength(pwd) {
    if (!pwd || pwd.length < 6) return 0;
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd) || pwd.length >= 12) score++;
    return Math.min(3, Math.max(1, score));
  }
  const $psFill = $('#psFill');
  const $psText = $('#psText');
  const TEXT = { 0: '—', 1: '弱', 2: '中', 3: '强' };
  $('#newPwd').on('input', function () {
    const lv = evalStrength($(this).val());
    $psFill.removeClass('lv-1 lv-2 lv-3');
    $psText.removeClass('lv-1 lv-2 lv-3');
    if (lv > 0) {
      $psFill.addClass('lv-' + lv);
      $psText.addClass('lv-' + lv);
    }
    $psText.text(TEXT[lv]);
  });

  // ===== 提交 =====
  $('#submitBtn').on('click', async function () {
    const $btn = $(this);
    if ($btn.prop('disabled')) return;

    const oldPwd  = $('#oldPwd').val();
    const newPwd  = $('#newPwd').val();
    const newPwd2 = $('#newPwd2').val();

    if (!account) { App.toast('未检测到当前账号，请重新登录'); return; }
    if (!oldPwd)  { App.toast('请输入当前密码'); return; }
    if (!newPwd)  { App.toast('请输入新密码'); return; }
    if (newPwd.length < 6) { App.toast('新密码至少 6 位'); return; }
    if (newPwd === oldPwd) { App.toast('新密码不能与当前密码相同'); return; }
    if (newPwd !== newPwd2) { App.toast('两次输入的新密码不一致'); return; }

    $btn.prop('disabled', true);
    $btn.find('.ps-text').text('提 交 中 …');
    await App.delay(500);

    const ret = App.changePassword(account, oldPwd, newPwd);
    $btn.prop('disabled', false);
    $btn.find('.ps-text').text('确 认 修 改');

    if (!ret.ok) {
      App.toast(ret.msg || '修改失败');
      return;
    }
    App.toast('密码修改成功');
    setTimeout(function () {
      App.go(roomNo ? `../account-manage/account-manage.html?roomNo=${roomNo}` : `../account-manage/account-manage.html`);
    }, 700);
  });

});
