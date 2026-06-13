/**
 * 777 经典拉霸 · 进入游戏前加载页
 */
(function () {
  const V = '?v=1';
  const PRELOAD_URLS = [
    './assets/splash.png' + V,
    './assets/room-bg.jpg' + V,
    './assets/top-header.png' + V,
    './assets/machine-frame.png' + V,
    './assets/bottom-deco.png' + V,
    './assets/spin-btn.png' + V,
    './assets/paytable-panel.png' + V,
    './assets/icon-wallet.png' + V,
    './assets/icon-coin.png' + V,
    './assets/icon-prize.png' + V,
    './assets/icon-turbo.png' + V,
    './assets/icon-auto.png' + V,
    './assets/icon-menu.png' + V,
    './assets/arrow-l.png' + V,
    './assets/arrow-r.png' + V,
    './assets/tiles/bar3.png' + V,
    './assets/tiles/seven.png' + V,
    './assets/tiles/watermelon.png' + V
  ];
  const MIN_LOAD_MS = 2000;

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
    $('#lbSplash').addClass('is-leaving');
    $('body').removeClass('lb-body--splash');
    window.setTimeout(function () {
      $('#lbSplash').remove();
      $('#lbRoom').prop('hidden', false);
      if (typeof window.__lbBoot === 'function') {
        window.__lbBoot();
      }
    }, 320);
  }

  $(function () {
    setProgress(0);
    preloadAssets().then(showStartButton);
    $('#splashStart').on('click', enterGame);
  });
})();
