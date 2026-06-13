/**
 * 分享好友：随机生成下载链接 + 二维码，支持复制链接
 */
$(function () {
  const params = new URLSearchParams(location.search);
  const roomNo = (params.get('roomNo') || '').trim();
  const qs = roomNo ? `?roomNo=${roomNo}` : '';

  const $canvas = $('#qrCanvas');
  const $link = $('#linkText');

  function randomSegment(len) {
    const chars = 'abcdefghijkmnopqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < len; i++) {
      s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
  }

  function generateLink() {
    const line = randomSegment(6);
    const code = randomSegment(12);
    return `https://line.${line}.goldhub.app/dl/${code}`;
  }

  function renderQr(url) {
    $link.val(url);
    if (typeof QRCode === 'undefined') {
      App.toast('二维码库加载失败，请刷新重试');
      return;
    }
    QRCode.toCanvas($canvas[0], url, {
      width: 200,
      margin: 1,
      color: { dark: '#1a1408', light: '#ffffff' }
    }, function (err) {
      if (err) App.toast('二维码生成失败');
    });
  }

  function refresh() {
    renderQr(generateLink());
  }

  function copyLink() {
    const text = $link.val();
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        App.toast('链接已复制');
      }).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  function saveQr() {
    const canvas = $canvas[0];
    if (!canvas || !canvas.width) {
      App.toast('二维码尚未生成，请稍候');
      return;
    }

    const pad = 12;
    const out = document.createElement('canvas');
    out.width = canvas.width + pad * 2;
    out.height = canvas.height + pad * 2;
    const ctx = out.getContext('2d');
    if (!ctx) {
      App.toast('保存失败');
      return;
    }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(canvas, pad, pad);

    function triggerDownload(blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '分享二维码.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 500);
      App.toast('二维码已保存');
    }

    if (out.toBlob) {
      out.toBlob(function (blob) {
        if (!blob) {
          App.toast('保存失败');
          return;
        }
        triggerDownload(blob);
      }, 'image/png');
      return;
    }

    const dataUrl = out.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = '分享二维码.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    App.toast('二维码已保存');
  }

  function fallbackCopy() {
    const el = $link[0];
    el.focus();
    el.select();
    el.setSelectionRange(0, el.value.length);
    try {
      document.execCommand('copy');
      App.toast('链接已复制');
    } catch (_) {
      App.toast('复制失败，请长按链接手动复制');
    }
  }

  $('#backBtn').on('click', function () {
    if (history.length > 1) history.back();
    else App.go(`../settings/settings.html${qs}`);
  });

  $('#copyBtn').on('click', copyLink);
  $('#saveBtn').on('click', saveQr);
  $link.on('click', function () {
    this.select();
  });

  refresh();
});
