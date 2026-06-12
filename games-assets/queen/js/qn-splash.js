/**
 * 赏金女王 · 进入游戏前加载页
 */
(function () {
  const PRELOAD_URLS = [
    './assets/splash.png?v=5',
    './assets/room-bg.jpg?v=5',
    './assets/top-header.gif?v=9',
    './assets/bottom-deco.png?v=5',
    './assets/spin-btn.png?v=5',
    './assets/qn-icon-wallet.png?v=1',
    './assets/qn-icon-coin.png?v=1',
    './assets/qn-icon-prize.png?v=1',
    './assets/tiles/queen.png?v=1',
    './assets/tiles/wild.png?v=1',
    './assets/tiles/scatter.png?v=5'
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
    $('#qnSplash').addClass('is-leaving');
    $('body').removeClass('qn-body--splash');
    window.setTimeout(function () {
      $('#qnSplash').remove();
      $('#qnRoom').prop('hidden', false);
      if (typeof window.__qnBoot === 'function') {
        window.__qnBoot();
      }
    }, 320);
  }

  $(function () {
    setProgress(0);
    preloadAssets().then(showStartButton);
    $('#splashStart').on('click', enterGame);
  });
})();
