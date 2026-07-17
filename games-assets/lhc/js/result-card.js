/**
 * 幸运六合彩 · 开奖结果卡（简洁版）
 * 七球依次停定 → 正下方出对应生肖 → 再出底部汇总
 */
(function (global) {
  const ZODIAC_ORDER = ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊'];
  const RED = [1, 2, 7, 8, 12, 13, 18, 19, 23, 24, 29, 30, 34, 35, 40, 45, 46];
  const BLUE = [3, 4, 9, 10, 14, 15, 20, 25, 26, 31, 36, 37, 41, 42, 47, 48];

  function pad2(n) {
    return String(n).padStart(2, '0');
  }
  function zodiacOf(n) {
    return ZODIAC_ORDER[(n - 1) % 12];
  }
  function waveColor(n) {
    if (RED.includes(n)) return '红';
    if (BLUE.includes(n)) return '蓝';
    return '绿';
  }
  function ballSrc(n) {
    return './assets/balls/ball_' + pad2(n) + '.png';
  }
  function temaMeta(nums) {
    const sp = nums[6];
    return {
      size: sp === 49 ? '和' : (sp >= 25 ? '大' : '小'),
      oe: sp === 49 ? '和' : (sp % 2 ? '单' : '双'),
      wave: waveColor(sp),
      zodiac: zodiacOf(sp),
    };
  }

  function buildResultCardHtml(nums, issue) {
    const meta = temaMeta(nums);
    const slots = Array.from({ length: 7 }, (_, i) => {
      const isTe = i === 6 ? ' is-te' : '';
      return `<div class="lhc-roll-slot${isTe}" data-idx="${i}">
        <img class="lhc-roll-slot__ball" src="${ballSrc(1 + (i % 49))}" alt="" draggable="false">
        <span class="lhc-zx-cell"><i></i></span>
      </div>`;
    }).join('');

    return `<div class="lhc-result-card is-drawing" data-issue="${issue}">
      <div class="lhc-result-card__head">
        <span class="lhc-result-card__title">幸运六合彩</span>
        <span class="lhc-result-card__issue">${issue}</span>
      </div>
      <div class="lhc-result-card__body">
        <div class="lhc-result-card__rolls">${slots}</div>
      </div>
      <div class="lhc-result-card__foot is-hidden">
        <div class="lhc-result-stat"><span class="k">期号</span><span class="v">${String(issue).slice(-7)}</span></div>
        <div class="lhc-result-stat"><span class="k">大小</span><span class="v">${meta.size}</span></div>
        <div class="lhc-result-stat"><span class="k">单双</span><span class="v">${meta.oe}</span></div>
        <div class="lhc-result-stat"><span class="k">波色</span><span class="v">${meta.wave}</span></div>
      </div>
    </div>`;
  }

  function bindReveal(root, nums, onDone) {
    const card = root && root.classList && root.classList.contains('lhc-result-card')
      ? root
      : root && root.querySelector && root.querySelector('.lhc-result-card');
    if (!card || !nums || nums.length !== 7) {
      if (typeof onDone === 'function') onDone();
      return 0;
    }

    const slots = card.querySelectorAll('.lhc-roll-slot');
    const foot = card.querySelector('.lhc-result-card__foot');
    const startGap = 200;
    const spinBase = 480;
    const spinStep = 80;
    let settled = 0;

    slots.forEach((slot, i) => {
      const img = slot.querySelector('.lhc-roll-slot__ball');
      const zxEl = slot.querySelector('.lhc-zx-cell');
      if (!img) return;
      const target = nums[i];
      const startDelay = i * startGap;
      const spinMs = spinBase + i * spinStep;

      setTimeout(() => {
        slot.classList.add('is-rolling');
        const t0 = performance.now();
        let lastSwap = 0;
        function frame(now) {
          const elapsed = now - t0;
          if (elapsed < spinMs) {
            if (now - lastSwap > 55) {
              lastSwap = now;
              img.src = ballSrc(1 + Math.floor(Math.random() * 49));
            }
            requestAnimationFrame(frame);
          } else {
            img.src = ballSrc(target);
            slot.classList.remove('is-rolling');
            slot.classList.add('is-settled');
            if (zxEl) {
              zxEl.innerHTML = '<i>' + zodiacOf(target) + '</i>';
              zxEl.classList.add('is-show');
            }
            settled += 1;
            if (settled >= 7) {
              card.classList.remove('is-drawing');
              card.classList.add('is-reveal');
              if (foot) {
                foot.classList.remove('is-hidden');
                foot.classList.add('is-show');
              }
              if (typeof onDone === 'function') setTimeout(onDone, 280);
            }
          }
        }
        requestAnimationFrame(frame);
      }, startDelay);
    });

    return 6 * startGap + spinBase + 6 * spinStep + 400;
  }

  global.LhcResultCard = {
    build: buildResultCardHtml,
    bindReveal,
    temaMeta,
    zodiacOf,
    waveColor,
  };
})(typeof window !== 'undefined' ? window : this);
