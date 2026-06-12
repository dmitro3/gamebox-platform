/**
 * 麻将胡了 · 进入游戏前加载页
 */
(function () {
  const PRELOAD_URLS = [
    './assets/splash.png?v=3',
    './assets/room-bg.jpg?v=17',
    './assets/top-header.png?v=23',
    './assets/bottom-deco.png?v=11',
    './assets/spin-btn.png?v=6',
    './assets/mj-icon-wallet.png?v=1',
    './assets/mj-icon-coin.png?v=1',
    './assets/mj-icon-prize.png?v=1',
    './assets/tiles/wan1.png?v=1',
    './assets/tiles/wild.png?v=1',
    './assets/tiles/hu.png?v=1',
    './assets/mult-active/x1.png?v=1'
  ];
  const MIN_LOAD_MS = 2200;

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
    $('#mjSplash').addClass('is-leaving');
    $('body').removeClass('mj-body--splash');
    window.setTimeout(function () {
      $('#mjSplash').remove();
      $('#mjRoom').prop('hidden', false);
      if (typeof window.__mjBoot === 'function') {
        window.__mjBoot();
      }
    }, 320);
  }

  $(function () {
    setProgress(0);
    preloadAssets().then(showStartButton);
    $('#splashStart').on('click', enterGame);
  });
})();
