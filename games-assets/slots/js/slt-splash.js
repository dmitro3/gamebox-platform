/**
 * 经典水果机 · 进入游戏前加载页
 */
(function () {
  const V = '?v=2';
  const PRELOAD_URLS = [
    './assets/splash.png' + V,
    './assets/room-bg.jpg' + V,
    './assets/top-header.png' + V,
    './assets/machine-frame.png' + V,
    './assets/bottom-deco.png' + V,
    './assets/center-panel.png' + V,
    './assets/btn-start.png' + V,
    './assets/slot-cell.png' + V,
    './assets/slot-cell-lit.png' + V,
    './assets/light-dot.png' + V,
    './assets/symbols/apple.png' + V,
    './assets/symbols/seven.png' + V,
    './assets/symbols/watermelon.png' + V
  ];
  const MIN_LOAD_MS = 1800;

  function setProgress(pct) {
    const n = Math.max(0, Math.min(100, Math.round(pct)));
    $('#splashBar').css('width', n + '%');
    $('#splashPct').text(n + '%');
  }

  function preloadAssets() {
    return new Promise(function (resolve) {
      const total = PRELOAD_URLS.length;
      let done = 0;
      let finished = false;
      const start = Date.now();

      function finish() {
        if (finished) return;
        finished = true;
        setProgress(100);
        resolve();
      }

      function tick() {
        done++;
        setProgress((done / total) * 100);
        if (done >= total) {
          const wait = Math.max(0, MIN_LOAD_MS - (Date.now() - start));
          setTimeout(finish, wait);
        }
      }

      if (!total) {
        setTimeout(finish, MIN_LOAD_MS);
        return;
      }

      PRELOAD_URLS.forEach(function (url) {
        const img = new Image();
        img.onload = tick;
        img.onerror = tick;
        img.src = url;
      });
    });
  }

  function showStartButton() {
    $('#splashLoad').addClass('is-done');
    window.setTimeout(function () {
      $('#splashLoad').prop('hidden', true);
      $('#splashStart').prop('hidden', false).addClass('is-ready');
    }, 280);
  }

  function enterGame() {
    $('#sltSplash').addClass('is-leaving');
    window.setTimeout(function () {
      $('#sltSplash').remove();
      $('body').removeClass('slt-body--splash');
      $('#sltRoom').prop('hidden', false);
      if (typeof window.__sltBoot === 'function') window.__sltBoot();
    }, 320);
  }

  $(function () {
    setProgress(0);
    preloadAssets().then(function () {
      showStartButton();
    });
    $('#splashStart').on('click', enterGame);
  });
})();
