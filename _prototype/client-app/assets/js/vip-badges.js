/* ==========================================================================
 * VIP 徽章 SVG 生成器（V1 - V10）· 两套样式
 * --------------------------------------------------------------------------
 * 用法：
 *   const html = App.makeVipBadge(7, 'diamond');         // A 套：钻石盾
 *   const html = App.makeVipBadge(10, 'medal', { size: 80, locked: false });  // B 套：勋章
 *   $container.html(html);
 *
 *   // 在元素上直接渲染：
 *   App.renderVipBadge($('#myBadge')[0], 5, 'diamond');
 *
 * 颜色完全由 vip-badges.css 中 [data-level=N] 的 CSS 变量驱动，
 * 这里的 SVG 模板用 currentColor / var() 引用变量，做到「一份模板 × 10 套色」。
 *
 * 之所以每个 badge 内联一份 <defs>：因为多个 badge 可能并存于同一页（如预览页），
 * SVG 内 id 全局共享，所以 defs 用调用时生成的随机 id（uid）确保不冲突。
 * ========================================================================== */
(function () {
  if (typeof window === 'undefined') return;
  const App = (window.App = window.App || {});

  // 单调递增的 uid，给 <defs> 里的渐变 / 滤镜起唯一 id，避免多 badge 共存时撞 id
  let _uidSeq = 0;
  const uid = () => 'vb' + (++_uidSeq) + '_' + Math.random().toString(36).slice(2, 6);

  /* =========================================================================
   * A 套：钻石盾牌（v3 · 7 点五边盾 · 银铬钻石质感 · 完全对齐用户参考图）
   * --------------------------------------------------------------------------
   * 核心几何：7 点五边盾（顶平 + 肩斜 + 底尖）
   *   TL (18, 8)    顶左角
   *   TR (82, 8)    顶右角        ── 顶部 64 单位平边
   *   R  (95, 36)   右肩
   *   BR (78, 70)   下右收腰
   *   B  (50, 95)   底尖
   *   BL (22, 70)   下左收腰
   *   L  (5,  36)   左肩
   *
   * 7 块切割面从每个顶点对 → 中心 (50, 50)，加灯光从「上方」打：
   *   F-top   (TL→TR→C)  最亮      ── 顶平面，正面接光
   *   F-utr   (TR→R →C)  中亮
   *   F-lwr   (R →BR→C)  暗
   *   F-bot-r (BR→B →C)  最暗      ── 底斜，反射最少
   *   F-bot-l (B →BL→C)  最暗
   *   F-lwl   (BL→L →C)  暗
   *   F-utl   (L →TL→C)  中亮（左侧也打到一些光）
   *
   * 关键风格点（对齐参考图）：
   *   1. 暗面真的暗（near-black），亮面真的亮（near-white silver）
   *   2. 切面交界处一律压一道亮银线（让每个棱面边缘都"反光"）
   *   3. 上半切面叠 4-5 块小三角亮银高光，模拟宝石被光打中的"碎光"
   *   4. V 字镂刻：暗深底 + 顶部一道宽亮银（V 顶上沿是最亮的地方）
   *   5. 外圈一层 silver aura 淡光晕
   *   6. 升级用的射芒/光环/顶冠/彩虹层都保留，但 V0 默认全 0
   * ========================================================================= */
  function diamondShieldSvg(id) {
    const cx = 50, cy = 50;
    // 7 顶点（顺时针，TL 起）
    const P = {
      TL: [18, 8],
      TR: [82, 8],
      R:  [95, 36],
      BR: [78, 70],
      B:  [50, 95],
      BL: [22, 70],
      L:  [5,  36]
    };
    const tri = (a, b) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]} L${cx} ${cy} Z`;
    const outline =
      `M${P.TL[0]} ${P.TL[1]} L${P.TR[0]} ${P.TR[1]} L${P.R[0]} ${P.R[1]} L${P.BR[0]} ${P.BR[1]}` +
      ` L${P.B[0]} ${P.B[1]} L${P.BL[0]} ${P.BL[1]} L${P.L[0]} ${P.L[1]} Z`;

    // 单个射芒模板：从切割钻顶点向上指出（V0 默认不显示，升级才出）
    const ray =
      `<path d="M47 14 L50 1 L53 14 Z" fill="url(#${id}-ray-grad)" stroke="var(--bd-c-shade)" stroke-width="0.4" stroke-linejoin="miter"/>` +
      `<path d="M48.7 7.5 L50 2.5" fill="none" stroke="var(--bd-c-hi)" stroke-width="0.6" stroke-linecap="round" opacity="0.75"/>`;

    return `
<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <!-- 外金属描边渐变（顶亮 → 底暗，模拟环境光从上打在金属边） -->
    <linearGradient id="${id}-rim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-hi)"/>
      <stop offset="40%"  stop-color="var(--bd-c-mid)"/>
      <stop offset="100%" stop-color="var(--bd-c-shade)"/>
    </linearGradient>
    <!-- 切面交界亮银线渐变（顶段亮 → 底段稍暗，让上半部边线最闪） -->
    <linearGradient id="${id}-edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-hi)"/>
      <stop offset="55%"  stop-color="var(--bd-c-mid)"/>
      <stop offset="100%" stop-color="var(--bd-c-deep)"/>
    </linearGradient>
    <!-- 顶面渐变：上方亮 → 中央稍暗（模拟切面平面的反光梯度） -->
    <linearGradient id="${id}-top-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-mid)"/>
      <stop offset="100%" stop-color="var(--bd-c-base)"/>
    </linearGradient>
    <!-- 底面深色渐变 -->
    <linearGradient id="${id}-bot-face" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-deep)"/>
      <stop offset="100%" stop-color="var(--bd-c-shade)"/>
    </linearGradient>
    <!-- 银光晕外圈 -->
    <radialGradient id="${id}-aura" cx="50%" cy="50%" r="55%">
      <stop offset="40%" stop-color="transparent"/>
      <stop offset="65%" stop-color="var(--bd-c-mid)" stop-opacity="0.18"/>
      <stop offset="85%" stop-color="var(--bd-c-hi)"  stop-opacity="0.10"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <!-- V 字主体填充：上亮下暗（模拟阴刻 V 内侧也接光） -->
    <linearGradient id="${id}-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-gem)"/>
      <stop offset="40%"  stop-color="var(--bd-c-deep)"/>
      <stop offset="100%" stop-color="var(--bd-c-shade)"/>
    </linearGradient>
    <!-- 射芒填充（升级用） -->
    <linearGradient id="${id}-ray-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-hi)"/>
      <stop offset="60%"  stop-color="var(--bd-c-mid)"/>
      <stop offset="100%" stop-color="var(--bd-c-deep)"/>
    </linearGradient>
    <!-- V10 彩虹镭射条 -->
    <linearGradient id="${id}-rainbow" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%"   stop-color="#ff64a8"/>
      <stop offset="25%"  stop-color="#a484ff"/>
      <stop offset="50%"  stop-color="#64d4ff"/>
      <stop offset="75%"  stop-color="#80ffc8"/>
      <stop offset="100%" stop-color="#ffe79a"/>
    </linearGradient>
    <!-- 镭射光环径向渐变（V7+） -->
    <radialGradient id="${id}-halo" cx="50%" cy="50%" r="50%">
      <stop offset="58%" stop-color="transparent"/>
      <stop offset="68%" stop-color="var(--bd-c-mid)" stop-opacity="0.45"/>
      <stop offset="80%" stop-color="var(--bd-c-hi)" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <!-- 顶冠渐变（V9+） -->
    <linearGradient id="${id}-crown" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-hi)"/>
      <stop offset="60%"  stop-color="var(--bd-c-base)"/>
      <stop offset="100%" stop-color="var(--bd-c-deep)"/>
    </linearGradient>
    <!-- 7 边切割钻 clip-path（裁切彩虹层） -->
    <clipPath id="${id}-clip">
      <path d="${outline}"/>
    </clipPath>
  </defs>

  <!-- ===== L0. 银光晕外圈 ===== -->
  <circle cx="50" cy="50" r="50" fill="url(#${id}-aura)"/>

  <!-- ===== L1. 镭射光环（V7+ CSS 控制 fade-in） ===== -->
  <circle class="bd-halo" cx="50" cy="50" r="50" fill="url(#${id}-halo)"/>

  <!-- ===== L2. 升级用的 8 道射芒（V0 默认 opacity=0） ===== -->
  <g class="bd-rays-card">
    <g>${ray}</g>
    <g transform="rotate(90 50 50)">${ray}</g>
    <g transform="rotate(180 50 50)">${ray}</g>
    <g transform="rotate(270 50 50)">${ray}</g>
  </g>
  <g class="bd-rays-diag">
    <g transform="rotate(45 50 50)">${ray}</g>
    <g transform="rotate(135 50 50)">${ray}</g>
    <g transform="rotate(225 50 50)">${ray}</g>
    <g transform="rotate(315 50 50)">${ray}</g>
  </g>

  <!-- ===== L3. 切割钻主体：先填底色防接缝 ===== -->
  <path d="${outline}" fill="var(--bd-c-shade)"/>

  <!-- ===== L4. 7 块切面三角（按光源在「正上方」分配明暗） ===== -->
  <g shape-rendering="geometricPrecision">
    <!-- 顶面（最亮，正面接光） -->
    <path d="${tri(P.TL, P.TR)}" fill="url(#${id}-top-face)"/>
    <!-- 上右面（中亮） -->
    <path d="${tri(P.TR, P.R)}"  fill="var(--bd-c-base)"/>
    <!-- 下右面（暗） -->
    <path d="${tri(P.R,  P.BR)}" fill="var(--bd-c-deep)"/>
    <!-- 底右面（最暗） -->
    <path d="${tri(P.BR, P.B)}"  fill="url(#${id}-bot-face)"/>
    <!-- 底左面（最暗） -->
    <path d="${tri(P.B,  P.BL)}" fill="url(#${id}-bot-face)"/>
    <!-- 下左面（暗） -->
    <path d="${tri(P.BL, P.L)}"  fill="var(--bd-c-deep)"/>
    <!-- 上左面（中亮） -->
    <path d="${tri(P.L,  P.TL)}" fill="var(--bd-c-base)"/>
  </g>

  <!-- ===== L5. 上半切面的 4 块「亮银碎光」三角高光（贴到顶/上左/上右切面） ===== -->
  <g opacity="0.85">
    <!-- 顶面 · 左侧亮银碎光（占顶面左半） -->
    <path d="M${P.TL[0]} ${P.TL[1]} L${cx-2} ${cy-2} L${P.TL[0]+12} ${P.TL[1]+18} Z"
          fill="var(--bd-c-hi)" opacity="0.5"/>
    <!-- 顶面 · 右侧亮银碎光（占顶面右半，对称） -->
    <path d="M${P.TR[0]} ${P.TR[1]} L${cx+2} ${cy-2} L${P.TR[0]-12} ${P.TR[1]+18} Z"
          fill="var(--bd-c-hi)" opacity="0.45"/>
    <!-- 上右面 · 边缘亮银（贴外缘） -->
    <path d="M${P.TR[0]} ${P.TR[1]} L${P.R[0]} ${P.R[1]} L${P.TR[0]+5} ${P.TR[1]+10} Z"
          fill="var(--bd-c-mid)" opacity="0.7"/>
    <!-- 上左面 · 边缘亮银（对称） -->
    <path d="M${P.TL[0]} ${P.TL[1]} L${P.L[0]} ${P.L[1]} L${P.TL[0]-5} ${P.TL[1]+10} Z"
          fill="var(--bd-c-mid)" opacity="0.7"/>
  </g>

  <!-- ===== L6. 切面交界亮银线：每条 vertex → center 都压一道（这是 V0 的灵魂） ===== -->
  <g fill="none" stroke="url(#${id}-edge)" stroke-width="0.7" stroke-linecap="round" opacity="0.95">
    <line x1="${P.TL[0]}" y1="${P.TL[1]}" x2="${cx}" y2="${cy}"/>
    <line x1="${P.TR[0]}" y1="${P.TR[1]}" x2="${cx}" y2="${cy}"/>
    <line x1="${P.R[0]}"  y1="${P.R[1]}"  x2="${cx}" y2="${cy}"/>
    <line x1="${P.BR[0]}" y1="${P.BR[1]}" x2="${cx}" y2="${cy}"/>
    <line x1="${P.B[0]}"  y1="${P.B[1]}"  x2="${cx}" y2="${cy}"/>
    <line x1="${P.BL[0]}" y1="${P.BL[1]}" x2="${cx}" y2="${cy}"/>
    <line x1="${P.L[0]}"  y1="${P.L[1]}"  x2="${cx}" y2="${cy}"/>
  </g>

  <!-- ===== L7. V10 彩虹镭射层（CSS 控制 V10 才可见） ===== -->
  <g class="bd-rainbow" clip-path="url(#${id}-clip)">
    <rect x="0" y="0" width="100" height="100" fill="url(#${id}-rainbow)"/>
  </g>

  <!-- ===== L8. 外金属描边（外轮廓主线） ===== -->
  <path d="${outline}"
        fill="none"
        stroke="url(#${id}-rim)"
        stroke-width="1.6"
        stroke-linejoin="miter"/>

  <!-- ===== L9. 中央阴刻 V 字 ===== -->
  <g>
    <!-- V 主体：宽顶尖底，刻入感深底 -->
    <path d="M28 26 L42 26 L50 60 L58 26 L72 26 L50 88 Z"
          fill="url(#${id}-v)"
          stroke="var(--bd-c-shade)"
          stroke-width="0.6"
          stroke-linejoin="round"/>
    <!-- V 顶部一道宽亮银（V 顶上沿是最亮的地方，模拟阴刻凹槽顶部接光） -->
    <path d="M28 26 L42 26"
          stroke="var(--bd-c-hi)" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M58 26 L72 26"
          stroke="var(--bd-c-hi)" stroke-width="1.4" stroke-linecap="round"/>
    <!-- V 顶部两端的小凸点（让两侧顶角更亮） -->
    <circle cx="28" cy="26" r="1.2" fill="var(--bd-c-hi)"/>
    <circle cx="72" cy="26" r="1.2" fill="var(--bd-c-hi)"/>
    <!-- V 左外侧斜边（受光斜面，亮一道） -->
    <path d="M28 26 L50 88"
          fill="none" stroke="var(--bd-c-mid)" stroke-width="0.5" opacity="0.7"/>
    <!-- V 内 V 形折点处亮一小点（让 V 中央焦点也有反光） -->
    <circle cx="50" cy="60" r="1" fill="var(--bd-c-mid)" opacity="0.7"/>
  </g>

  <!-- ===== L10. 顶冠（V9+ CSS 控制 fade-in） ===== -->
  <g class="bd-crown">
    <rect x="40" y="-2" width="20" height="3" rx="0.4"
          fill="url(#${id}-crown)" stroke="var(--bd-c-shade)" stroke-width="0.4"/>
    <path d="M40 -2 L43 -8 L46 -2 Z" fill="url(#${id}-crown)" stroke="var(--bd-c-shade)" stroke-width="0.4"/>
    <path d="M46 -2 L50 -10 L54 -2 Z" fill="url(#${id}-crown)" stroke="var(--bd-c-shade)" stroke-width="0.4"/>
    <path d="M54 -2 L57 -8 L60 -2 Z" fill="url(#${id}-crown)" stroke="var(--bd-c-shade)" stroke-width="0.4"/>
    <circle cx="43" cy="-7" r="0.9" fill="var(--bd-c-gem)"/>
    <circle cx="50" cy="-9" r="1.2" fill="var(--bd-c-gem)"/>
    <circle cx="57" cy="-7" r="0.9" fill="var(--bd-c-gem)"/>
  </g>
</svg>`.trim();
  }

  /* =========================================================================
   * B 套：翼羽月桂勋章
   * 中央圆勋章 + 左右展翼月桂枝 + 顶部小冠 + 底部丝带 + 中央 V 字 + 镭射光环（V10 专属）
   *
   * 月桂枝设计：
   *   主茎是从外向内的曲线（左侧从 (8, 78) 弯曲到 (35, 35)），
   *   叶片是 5-6 片细长的椭圆，沿茎方向斜出。
   * ========================================================================= */
  function laurelMedalSvg(id) {
    return `
<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <!-- 圆勋章主体径向渐变：中心暗 → 边亮，模拟凸面金属盘 -->
    <radialGradient id="${id}-disk" cx="50%" cy="35%" r="65%">
      <stop offset="0%"   stop-color="var(--bd-c-mid)"/>
      <stop offset="60%"  stop-color="var(--bd-c-base)"/>
      <stop offset="100%" stop-color="var(--bd-c-deep)"/>
    </radialGradient>
    <!-- 内圈凹下去的暗色：比主体更深，做"勋章内凹"感 -->
    <radialGradient id="${id}-disk-inner" cx="50%" cy="40%" r="55%">
      <stop offset="0%"   stop-color="var(--bd-c-deep)"/>
      <stop offset="100%" stop-color="var(--bd-c-shade)"/>
    </radialGradient>
    <!-- 月桂叶 / 翼羽渐变：沿叶脉方向 -->
    <linearGradient id="${id}-leaf" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-hi)"/>
      <stop offset="50%"  stop-color="var(--bd-c-base)"/>
      <stop offset="100%" stop-color="var(--bd-c-shade)"/>
    </linearGradient>
    <!-- V 字渐变 -->
    <linearGradient id="${id}-v" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-gem)"/>
      <stop offset="60%"  stop-color="var(--bd-c-mid)"/>
      <stop offset="100%" stop-color="var(--bd-c-gem2)"/>
    </linearGradient>
    <!-- 顶冠 / 丝带渐变 -->
    <linearGradient id="${id}-orn" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="var(--bd-c-hi)"/>
      <stop offset="100%" stop-color="var(--bd-c-deep)"/>
    </linearGradient>
    <!-- V10 彩虹镭射光环 -->
    <radialGradient id="${id}-halo" cx="50%" cy="50%" r="55%">
      <stop offset="50%"  stop-color="transparent"/>
      <stop offset="65%"  stop-color="#ff64a8" stop-opacity="0.5"/>
      <stop offset="75%"  stop-color="#a484ff" stop-opacity="0.6"/>
      <stop offset="85%"  stop-color="#64d4ff" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
  </defs>

  <!-- 1. V10 彩虹光环（最底层，css 控制只有 V10 显示） -->
  <circle class="bd-halo-rainbow" cx="50" cy="50" r="48" fill="url(#${id}-halo)"/>

  <!-- 2. 左右月桂枝 / 翼羽：成对镜像分布 -->
  <g>
    <!-- 左侧月桂主茎 -->
    <path d="M11 76 Q18 60 24 48 Q30 38 38 32"
          fill="none"
          stroke="var(--bd-c-deep)"
          stroke-width="1.6"
          stroke-linecap="round"/>
    <!-- 左侧月桂叶（5 片，由外向内排列，叶尖向上指） -->
    <path d="M9 72 Q3 64 9 58 Q14 60 13 70 Z"   fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <path d="M14 62 Q7 54 13 48 Q19 51 18 60 Z"  fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <path d="M19 51 Q12 44 19 39 Q25 41 24 50 Z" fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <path d="M25 41 Q19 33 26 28 Q32 31 30 39 Z" fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <path d="M32 33 Q27 25 34 21 Q40 24 38 31 Z" fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>

    <!-- 右侧月桂主茎（X 镜像） -->
    <path d="M89 76 Q82 60 76 48 Q70 38 62 32"
          fill="none"
          stroke="var(--bd-c-deep)"
          stroke-width="1.6"
          stroke-linecap="round"/>
    <!-- 右侧月桂叶 -->
    <path d="M91 72 Q97 64 91 58 Q86 60 87 70 Z"   fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <path d="M86 62 Q93 54 87 48 Q81 51 82 60 Z"  fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <path d="M81 51 Q88 44 81 39 Q75 41 76 50 Z" fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <path d="M75 41 Q81 33 74 28 Q68 31 70 39 Z" fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <path d="M68 33 Q73 25 66 21 Q60 24 62 31 Z" fill="url(#${id}-leaf)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
  </g>

  <!-- 3. 底部交叉丝带 / 短缎结：左右月桂在底部交叉，做一个小金钉 -->
  <g>
    <path d="M38 80 Q50 86 62 80"
          fill="none"
          stroke="var(--bd-c-base)"
          stroke-width="2"
          stroke-linecap="round"/>
    <circle cx="50" cy="83" r="3" fill="url(#${id}-orn)" stroke="var(--bd-c-shade)" stroke-width="0.5"/>
    <circle cx="50" cy="82.5" r="0.8" fill="var(--bd-c-hi)"/>
  </g>

  <!-- 4. 顶部小冠：三个尖刺 + 中央宝石点（点缀感，不太大） -->
  <g>
    <path d="M50 4 L46 13 L42 8 L38 13 L40 18 L60 18 L62 13 L58 13 L54 8 Z"
          fill="url(#${id}-orn)"
          stroke="var(--bd-c-shade)"
          stroke-width="0.5"
          stroke-linejoin="round"/>
    <!-- 三颗小宝石点 -->
    <circle cx="50" cy="9" r="1.4" fill="var(--bd-c-gem)"/>
    <circle cx="42" cy="13" r="0.9" fill="var(--bd-c-hi)" opacity="0.75"/>
    <circle cx="58" cy="13" r="0.9" fill="var(--bd-c-hi)" opacity="0.75"/>
  </g>

  <!-- 5. 中央圆勋章：外环 + 主体 + 内凹环 + 内圈高光 -->
  <g>
    <!-- 外金环 -->
    <circle cx="50" cy="52" r="24" fill="url(#${id}-disk)" stroke="var(--bd-c-shade)" stroke-width="1.2"/>
    <!-- 内描边凹环 -->
    <circle cx="50" cy="52" r="20.5" fill="url(#${id}-disk-inner)" stroke="var(--bd-c-deep)" stroke-width="0.6"/>
    <!-- 顶部高光弧（贴在外环上半部） -->
    <path d="M32 46 Q50 36 68 46"
          fill="none"
          stroke="var(--bd-c-hi)"
          stroke-width="1"
          stroke-linecap="round"
          opacity="0.7"/>
    <!-- 内圈虚线（小钻点环），共 12 颗 -->
    ${(() => {
      const dots = [];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const r = 19;
        const x = (50 + r * Math.cos(a)).toFixed(2);
        const y = (52 + r * Math.sin(a)).toFixed(2);
        dots.push(`<circle cx="${x}" cy="${y}" r="0.55" fill="var(--bd-c-hi)" opacity="0.7"/>`);
      }
      return dots.join('');
    })()}
  </g>

  <!-- 6. 中央 V 字：与 A 套同字形，但比例更小（适合圆勋章中央） -->
  <g>
    <path d="M37 39 L46 39 L50 60 L54 39 L63 39 L52 70 L48 70 Z"
          fill="url(#${id}-v)"
          stroke="var(--bd-c-shade)"
          stroke-width="0.8"
          stroke-linejoin="round"/>
    <path d="M38.5 41 L45 41 L49 58"
          fill="none"
          stroke="var(--bd-c-hi)"
          stroke-width="0.6"
          stroke-linecap="round"
          opacity="0.7"/>
  </g>
</svg>`.trim();
  }

  /* =========================================================================
   * 公共 API
   * ========================================================================= */
  /**
   * 生成 VIP 徽章 HTML 片段
   * @param {number} level   0-10（0 = 黯然未启）
   * @param {string} style   'diamond' | 'medal'  默认 'diamond'
   * @param {object} [opts]
   * @param {number} [opts.size]    像素大小，默认 56
   * @param {boolean}[opts.locked]  灰化态，默认 false
   * @param {boolean}[opts.pulse]   外层包一圈呼吸光晕（当前等级用），默认 false
   * @param {string} [opts.title]   tooltip 文本
   * @returns {string} HTML 字符串
   */
  App.makeVipBadge = function (level, style, opts) {
    const n = parseInt(level, 10);
    level = Math.max(0, Math.min(10, isNaN(n) ? 0 : n));
    style = style === 'medal' ? 'medal' : 'diamond';
    opts = opts || {};
    const size = opts.size || 56;
    const lockedCls = opts.locked ? ' is-locked' : '';
    const titleAttr = opts.title ? ` title="${String(opts.title).replace(/"/g, '&quot;')}"` : '';

    const id = uid();
    const svg = style === 'diamond' ? diamondShieldSvg(id) : laurelMedalSvg(id);
    const klass = `vip-badge vip-badge--${style}${lockedCls}`;
    const inner = `<span class="${klass}" data-level="${level}" style="width:${size}px;height:${size}px"${titleAttr}>${svg}</span>`;

    if (opts.pulse) {
      return `<span class="vip-badge-wrap is-cur">${inner}</span>`;
    }
    return inner;
  };

  /**
   * 直接渲染到 DOM 元素中
   * @param {HTMLElement} el
   * @param {number} level
   * @param {string} style
   * @param {object} opts
   */
  App.renderVipBadge = function (el, level, style, opts) {
    if (!el) return;
    el.innerHTML = App.makeVipBadge(level, style, opts);
  };

})();
