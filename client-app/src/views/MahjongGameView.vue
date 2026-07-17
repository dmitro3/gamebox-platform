<template>
  <!-- 第 0 步：正版进入页（加载动画 → 封面 → 点开始） -->
  <MahjongCover v-if="showPgCover" @start="onPgCoverStart" />

  <div v-show="!showPgCover" class="mahjong-game-page" :class="{ 'is-free-spin-bg': isInFreeSpinFeature }">
    <!-- 全屏铺底：专属封面2（与开始界面一致，宽屏两侧红金延伸） -->
    <img
      v-if="pageBgUrl"
      class="page-bg-fill"
      :src="pageBgUrl"
      alt=""
      aria-hidden="true"
      draggable="false"
    />

    <!-- 游戏画布（尺寸来自正版 dump cocosLayout.design） -->
    <div
      class="game-container"
      :class="{ 'is-free-spin-mode': isInFreeSpinFeature, 'is-using-fs-assets': isInFreeSpinFeature && hasFreeSpinBgAsset }"
      :style="canvasBoxStyle"
    >

      <!-- PG 正版叠层：底图 → 顶栏 → 牌面 → 信息带 → 底栏按钮 -->

      <!-- ① 主界面画布内：暗色纯色底；全屏红金延伸由 page-bg-fill 承担 -->
      <div
        class="layer layer-base z-bg"
        :class="{ 'is-free-spin-mode': isInFreeSpinFeature, 'is-using-fs-assets': isInFreeSpinFeature && hasFreeSpinBgAsset }"
        :style="pctLayerStyle(bgImage)"
      >
        <div v-if="isInFreeSpinFeature && !hasFreeSpinBgAsset" class="free-spin-bg-glow" aria-hidden="true" />
      </div>

      <!-- ①c 顶部元宝装饰条 main_top_a（中间木纹靠 z-wood-top 底色，两侧铜钱） -->
      <div
        v-if="pgStep >= 1 && topCoinsBarUrl && L.woodTop"
        class="layer z-wood-top"
        :style="pctLayerStyle(L.woodTop)"
      >
        <img class="layer-img layer-img--coins-bar" :src="topCoinsBarUrl" alt="" draggable="false" />
      </div>

      <!-- ② reel_a 整图：正版坐标，z=3 在牌层下方，绿毡+木框自然呈现 -->
      <div v-if="pgStep >= 2 && pgUi('reel-green') && L.reelFrame" class="layer z-reel-green" :style="pctLayerStyle(L.reelFrame)">
        <img class="layer-img" :src="pgUi('reel-green')!" alt="" />
      </div>
      <!-- ②b reel_glow：顶部暖光晕 -->
      <div v-if="pgStep >= 2 && playReels" class="layer z-reel-glow" :style="pctLayerStyle({ topPct: playReels.topPct, heightPct: playReels.heightPct * 0.3, leftPct: playReels.leftPct, widthPct: playReels.widthPct })"></div>
      <!-- ③ 底栏木框 main_bottom_a（木纹+元宝，底部自带渐暗） -->
      <div v-if="pgStep >= 3 && pgUi('bottom-wood')" class="layer z-wood" :style="pctLayerStyle(L.bottomWood)">
        <img class="layer-img" :src="pgUi('bottom-wood')!" alt="" draggable="false" />
      </div>

      <!-- ③a 底栏分隔条 main_bottom_b（橙色弧形盖帽，信息栏与底栏交界） -->
      <div v-if="pgStep >= 3 && pgUi('bg-bottom-bar') && L.bottomBar" class="layer z-bottom-bar" :style="pctLayerStyle(L.bottomBar)">
        <img class="layer-img" :src="pgUi('bg-bottom-bar')!" alt="" draggable="false" />
      </div>

      <!-- ③a-1 按钮区半透明暗层 footer_darken（Cocos: opacity=100, color=#000000）
           叠在木纹之上、按钮之下，让旋转按钮区域变暗 -->
      <div
        v-if="pgStep >= 3 && L.footerDarken"
        class="layer z-footer-darken"
        :style="pctLayerStyle(L.footerDarken)"
      />

      <!-- ③b 信息栏框
           Cocos dump 对照：
           stage 0 = 普通旋转（normal_frontBoard = infoboard_a 金框）
           stage 1 = 免费旋转模式（bonus_frontBoard  = infoboard_b 绿框）
           stage 2 = 大赢（medium_winboard = infoboard_c 紫框，覆盖在底框之上）
           三档的尺寸/坐标统一用 L.infoboard，紫框用 L.infoboardWin -->
      <div
        v-if="pgStep >= 3 && (L.infoboard || L.infoboardWin)"
        class="layer z-infoboard"
        :class="`infoboard-stage-${infoBoardStage}`"
        :style="pctLayerStyle(infoBoardStage === 2 ? (L.infoboardWin ?? L.infoboard!) : L.infoboard!)"
      >
        <img v-if="infoBoardStage === 2" class="layer-img" :src="pgUi('infoboard-c')!" alt="" />
        <img v-else-if="infoBoardStage === 1" class="layer-img" :src="pgUi('infoboard-b')!" alt="" />
        <img v-else class="layer-img" :src="pgUi('infoboard-a')!" alt="" />
      </div>

      <!-- ③c infoboard 内容层
           Cocos dump 对照：
           content/message (info2) = ticker，active 当 win=0
           win_content/win (win_info "赢得") = 普通旋转有赢时
           win_content/total_win (totalwin_info "共赢得") = 免费旋转中
           大赢(stage 2)也显示"赢得"；免费旋转时改"共赢得" -->
      <div
        v-if="pgStep >= 3 && L.infoboardText"
        class="layer z-infoboard-text"
        :class="{ 'is-win-display': hudWinDisplay > 0 }"
        :style="pctLayerStyle(infoBoardStage === 2 ? L.infoboardWin : L.infoboardText)"
      >
        <!-- 无赢：正版 PNG 广告文案（短句居中 / 长句滚出） -->
        <template v-if="hudWinDisplay <= 0">
          <div ref="adMsgContainerRef" class="ad-msg-container">
            <img
              v-if="currentAdMsgUrl"
              :key="adMsgAnimKey"
              class="ad-msg-img"
              :class="adMsgIsFit ? 'ad-msg-center' : 'ad-msg-scroll'"
              :style="adMsgIsFit ? {} : { '--scroll-dur': adMsgScrollDur }"
              :src="currentAdMsgUrl"
              draggable="false"
              alt=""
              @animationend="onAdMsgAnimEnd"
            />
          </div>
        </template>
        <!-- 有赢：显示赢钱金额（对应 win_content active=true） -->
        <template v-else>
          <div class="infoboard-win-content" :style="infoboardWinContentStyle">
            <!-- 第一次连击「赢得」，第二次起「共赢得」 -->
            <img
              v-if="infoboardWinIsTotal"
              class="infoboard-win-label"
              :src="pgUi('totalwin-info')!"
              alt="共赢得"
              draggable="false"
            />
            <img
              v-else
              class="infoboard-win-label"
              :src="pgUi('win-info')!"
              alt="赢得"
              draggable="false"
            />
            <!-- 金色精灵数字（来自 win-digits.png atlas） -->
            <span class="infoboard-win-digits" aria-hidden="true">
              <span
                v-for="(ch, i) in infoboardWinChars"
                :key="i"
                class="win-digit-sprite"
                :class="winDigitClass(ch)"
                :style="winDigitStyle(ch)"
              />
            </span>
          </div>
        </template>
      </div>

      <!-- ④b 倍数条底框 main_top_c（木纹底，在 1024 栏下方） -->
      <div
        v-if="pgStep >= 4 && multBarFrameUrl && L.multBarFrame"
        class="layer z-mult-bar"
        :class="{ 'is-free-spin-mode': isInFreeSpinFeature, 'is-using-fs-assets': isInFreeSpinFeature && hasFreeSpinBgAsset }"
        :style="pctLayerStyle(L.multBarFrame)"
      >
        <img class="layer-img layer-img--mult-bar" :src="multBarFrameUrl" alt="" />
      </div>

      <!-- ⑥a 激活光晕：完整 multiplier_glow，由木纹条 overflow 裁切（正版做法） -->
      <div
        v-if="pgStep >= 6 && activeMultGlowInBar && activeMultGlowClip && pgUi('mult-glow')"
        class="layer z-mult-glow-mask"
        :style="pctLayerStyle(activeMultGlowClip)"
      >
        <div class="mult-glow-inner" :style="pctLayerStyle(activeMultGlowInBar)">
          <img class="mult-glow-img" :src="pgUi('mult-glow')!" alt="" />
        </div>
      </div>

      <!-- ⑥b 倍数指示牌：未激活暗刻贴图（import__0b tex0）+ 激活金色 ×（mult atlas） -->
      <template v-if="pgStep >= 6">
        <template v-for="(slot, idx) in multSlots" :key="slot.activeKey">
          <div
            v-if="activeMultiplierIndex !== idx && multInactiveUrl(slot)"
            class="layer z-mult-slot z-mult-slot--inactive"
            :style="pctLayerStyle(slot.darkBox)"
          >
            <img class="mult-slot-img mult-slot-img--inactive" :src="multInactiveUrl(slot)!" alt="" />
          </div>
          <div
            v-if="activeMultiplierIndex === idx && pgUi(slot.activeKey)"
            class="layer z-mult-slot z-mult-slot--active"
            :style="pctLayerStyle(slot.activeBox)"
          >
            <img
              class="mult-slot-img mult-slot-img--active"
              :class="{ 'is-pulsing': multPulseActive }"
              :src="pgUi(slot.activeKey)!"
              alt=""
            />
          </div>
        </template>
      </template>

      <!-- ④a 1024 橙条 main_top_b（叠在木纹倍数底上方） -->
      <div
        v-if="pgStep >= 4 && topBarMainUrl && L.topBarMain"
        class="layer z-top-bar-main"
        :style="pctLayerStyle(L.topBarMain)"
      >
        <img class="layer-img" :src="topBarMainUrl" alt="" />
      </div>

      <!-- ⑤ 1024 路中奖组合 -->
      <div
        v-if="pgStep >= 5 && pgUi('top-title-1024') && L.title1024"
        class="layer z-title1024-layer"
        :style="pctLayerStyle(L.title1024)"
      >
        <img class="title-1024-img" :src="pgUi('top-title-1024')!" alt="" />
      </div>

      <svg style="width:0;height:0;position:absolute;" aria-hidden="true" focusable="false">
        <defs>
          <filter id="carve-effect" color-interpolation-filters="sRGB">
            <!-- 获取透明度 -->
            <feComponentTransfer in="SourceAlpha" result="alpha">
              <feFuncA type="linear" slope="1"/>
            </feComponentTransfer>

            <!-- 内部阴影 (刻痕左上侧) -->
            <feGaussianBlur in="alpha" stdDeviation="1.2" result="blur_inner_shadow"/>
            <feOffset in="blur_inner_shadow" dx="1.5" dy="1.5" result="offset_inner_shadow"/>
            <feComposite in="alpha" in2="offset_inner_shadow" operator="out" result="inner_shadow_shape"/>
            <feFlood flood-color="#000000" flood-opacity="0.9" result="dark_color"/>
            <feComposite in="dark_color" in2="inner_shadow_shape" operator="in" result="inner_shadow"/>

            <!-- 内部高光 (刻痕右下侧) -->
            <feGaussianBlur in="alpha" stdDeviation="0.8" result="blur_inner_highlight"/>
            <feOffset in="blur_inner_highlight" dx="-1.5" dy="-1.5" result="offset_inner_highlight"/>
            <feComposite in="alpha" in2="offset_inner_highlight" operator="out" result="inner_highlight_shape"/>
            <feFlood flood-color="#ffffff" flood-opacity="0.6" result="light_color"/>
            <feComposite in="light_color" in2="inner_highlight_shape" operator="in" result="inner_highlight"/>

            <!-- 原图压暗加深 -->
            <feComponentTransfer in="SourceGraphic" result="darkened_source">
              <feFuncR type="linear" slope="0.7"/>
              <feFuncG type="linear" slope="0.7"/>
              <feFuncB type="linear" slope="0.7"/>
            </feComponentTransfer>

            <!-- 外部高光 (雕刻边缘右下侧受光) -->
            <feGaussianBlur in="alpha" stdDeviation="0.5" result="blur_outer"/>
            <feOffset in="blur_outer" dx="1" dy="1" result="offset_outer"/>
            <feComposite in="offset_outer" in2="alpha" operator="out" result="outer_highlight_shape"/>
            <feFlood flood-color="#ffffff" flood-opacity="0.8" result="outer_light_color"/>
            <feComposite in="outer_light_color" in2="outer_highlight_shape" operator="in" result="outer_highlight"/>

            <!-- 合并 -->
            <feMerge>
              <feMergeNode in="outer_highlight"/>
              <feMergeNode in="darkened_source"/>
              <feMergeNode in="inner_shadow"/>
              <feMergeNode in="inner_highlight"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      <!-- ①b 麻将牌 -->
      <div v-if="pgStep >= 7" class="layer-board game-board-area z-board" :style="boardStyle">
        <div id="grid-container" class="grid-container" :class="{ 'is-shaking': boardShaking }">

          <div
            class="grid-col"
            v-for="(_, colIndex) in COLS"
            :key="colIndex"
            :class="{ 'is-spinning-col': columnSpinning[colIndex] }"
          >
            <div
              class="col-inner"
              :class="{
                'is-spinning': columnSpinning[colIndex],
                'is-reel-bounce': columnReelBounce[colIndex],
                'is-turbo': isTurbo,
              }"
              :style="columnSpinning[colIndex] ? columnSpinStyle(colIndex) : undefined"
              @animationend="onColAnimationEnd(colIndex, $event)"
            >
              <MahjongTile
                v-for="(tile, rowIndex) in (columnSpinning[colIndex] ? spinningCols[colIndex] : gridData[colIndex])"
                :key="`${colIndex}-${rowIndex}-${tile.symbol}-${tile.isGolden ? 'g' : 'n'}`"
                :id="!columnSpinning[colIndex] && isVisibleRow(rowIndex) ? `tile-${colIndex}-${rowIndex}` : undefined"
                :symbol="tile.symbol"
                :is-golden="tile.isGolden"
                :is-winning="winningCells.has(`${colIndex}-${rowIndex}`)"
                :is-scatter-celebrating="scatterCelebratingCells.has(`${colIndex}-${rowIndex}`)"
                :is-exploding="explodingCells.has(`${colIndex}-${rowIndex}`)"
                :is-transforming="transformingCells.has(`${colIndex}-${rowIndex}`)"
                :fall-rows="tileDropMotions.get(`${colIndex}-${rowIndex}`)?.fallRows ?? 0"
                :fall-delay-ms="tileDropMotions.get(`${colIndex}-${rowIndex}`)?.delayMs ?? 0"
                :is-turbo="isTurbo"
                :asset-base="symbolAssetBase"
                :clickable="canClickTiles && isVisibleRow(rowIndex)"
                :is-selected="isTileSelected(colIndex, rowIndex)"
                @click="onTileClick(colIndex, rowIndex)"
              />
            </div>
          </div>

          <MahjongSymbolInfo
            :symbol="selectedTile?.symbol ?? null"
            :is-golden="selectedTile?.isGolden ?? false"
            :anchor="selectedTileAnchor"
            :asset-base="symbolAssetBase"
            :bg-image="activeBgUrl ?? ''"
          />

          <Transition name="retrigger-banner">
            <div
              v-if="retriggerBannerCount > 0"
              class="fs-retrigger-board-banner"
              aria-live="polite"
            >
              <span class="fs-retrigger-board-banner__inner">
                <span class="fs-retrigger-board-banner__plus">+</span>
                <span class="fs-retrigger-board-banner__num">{{ retriggerBannerCount }}</span>
                <span class="fs-retrigger-board-banner__label">次免费旋转</span>
              </span>
            </div>
          </Transition>
        </div>
      </div>

      <!-- ⑥ 三格金额框 -->
      <div v-if="pgStep >= 9" class="layer layer-hud z-hud" :style="pctLayerStyle(L.statusHud)">
        <div class="layer-hud__values">
          <!-- 余额面板 -->
          <div class="hud-panel hud-panel--balance clickable" @click="togglePopup('wallet')">
            <img class="hud-icon-img" :src="pgUi('icon-wallet-open')!" alt="" draggable="false" />
            <span class="hud-value">¥{{ fmtAmt(balance) }}</span>
          </div>
          <!-- 投注面板 -->
          <div
            class="hud-panel hud-panel--bet clickable"
            :class="{ 'is-disabled': !canAdjustBet }"
            @click="canAdjustBet && togglePopup('bet')"
          >
            <img class="hud-icon-img" :src="pgUi('icon-bet')!" alt="" draggable="false" />
            <span class="hud-value">¥{{ fmtAmt(hudBetDisplay) }}</span>
          </div>
          <!-- 赢取面板 -->
          <div class="hud-panel hud-panel--win clickable" @click="togglePopup('win')">
            <img class="hud-icon-img" :src="pgUi('icon-win')!" alt="" draggable="false" />
            <span class="hud-value" :class="{ 'is-win': hudWinDisplay > 0 }">¥{{ fmtAmt(hudWinDisplay) }}</span>
          </div>
        </div>
      </div>

      <!-- 免费旋转触发弹窗 -->
      <MahjongFreeSpinTriggerOverlay
        :visible="freeSpinTriggerVisible"
        :spins-awarded="freeSpinTriggerData?.spinsAwarded ?? 12"
        :is-retrigger="freeSpinTriggerData?.isRetrigger ?? false"
        :canvas-height="gameRenderHeight"
        :title-img="pgUi('fs-trigger-title') ?? ''"
        :subtitle-img="pgUi('fs-trigger-subtitle') ?? ''"
        :btn-start="pgUi('btn-start') ?? ''"
        :btn-start-pressed="pgUi('btn-start-pressed') ?? ''"
        :bg-gradient="pgUi('fs-trigger-bg-gradient') ?? ''"
        :bg-rays="pgUi('fs-trigger-bg-rays') ?? ''"
        :bg-tiles="pgUi('fs-trigger-bg-tiles') ?? ''"
        :bg-coins="pgUi('fs-trigger-bg-coins') ?? ''"
        :digits-atlas="pgUi('win-digits') ?? ''"
        :auto-dismiss-ms="isFsUiPreview ? 0 : 3200"
        @confirm="dismissFreeSpinTrigger"
      />

      <!-- 免费旋转结束总结 -->
      <MahjongFreeSpinEndOverlay
        :visible="freeSpinEndVisible"
        :total-win="freeSpinEndSnapshot.totalWin"
        :canvas-height="gameRenderHeight"
        :canvas-width="gameRenderWidth"
        :title-img="pgUi('fs-end-title') ?? ''"
        :btn-collect="pgUi('fs-end-collect') ?? ''"
        :btn-collect-pressed="pgUi('fs-end-collect-pressed') ?? ''"
        :bg-total="pgUi('fs-end-bg-total') ?? ''"
        :bg-glow-top="pgUi('fs-end-bg-glow-top') ?? ''"
        :bg-glow-bottom="pgUi('fs-end-bg-glow-bottom') ?? ''"
        :bg-flare="pgUi('fs-end-bg-flare') ?? ''"
        :bg-fg="pgUi('fs-end-bg-fg') ?? ''"
        :digits-atlas="pgUi('win-digits') ?? ''"
        :digit-dot="pgUi('win-digit-dot') ?? ''"
        :digit-comma="pgUi('win-digit-comma') ?? ''"
        :auto-dismiss-ms="isFsUiPreview ? 0 : 4800"
        @confirm="dismissFreeSpinEndSummary"
      />

      <!-- 开发：JSON 布局对照框（Alt+L 开关） -->
      <div v-if="layoutDebug" class="layout-debug" aria-hidden="true">
        <div
          v-for="region in layoutDebugRegions"
          :key="region.key"
          class="layout-debug__box"
          :class="`layout-debug__box--${region.key}`"
          :style="pctLayerStyle(region.box)"
        >
          <span class="layout-debug__label">{{ region.label }}</span>
        </div>
      </div>

      <!-- 交互层：按钮（坐标来自 Cocos dump worldPct） -->
      <div v-if="pgStep >= 10" class="btn-interactive-layer z-buttons">
        <Transition name="slide-left-page">
          <div class="bottom-action-bar" v-if="!showMenuPage && !showFsBottomPanel">
            <!-- 正版分层：深色圆底 + 琥珀色前景图标（worldPct 来自 Cocos dump） -->
            <img
              v-for="layer in bottomBtnCircles"
              :key="layer.key"
              class="pg-btn-circle"
              :class="{ 'is-visible': pressedBtn === layer.key }"
              :style="pctLayerStyle(layer.box)"
              :src="pgUi('btn-circle')!"
              alt=""
              draggable="false"
            />
            <template v-if="isTurbo">
              <div
                class="turbo-fx turbo-fx--glow"
                :style="turboFxStyle(turboFxVisuals.glow, 'turbo-fx-glow')"
                aria-hidden="true"
              />
            </template>
            <img
              class="pg-btn-label"
              :class="{ 'is-active': isTurbo }"
              :style="pctLayerStyle(bottomBtnVisuals.turbo)"
              :src="pgUi(isTurbo ? 'label-turbo-on' : 'label-turbo-off-ring')!"
              alt=""
              draggable="false"
            />
            <img
              class="pg-btn-tint turbo-center-icon"
              :class="{ 'is-active': isTurbo, 'is-flashing': isTurbo }"
              :style="pctLayerStyle(bottomBtnVisuals.turbo)"
              :src="pgUi(isTurbo ? 'btn-turbo-on' : 'btn-turbo')!"
              alt=""
              draggable="false"
            />
            <img
              class="pg-btn-tint"
              :style="pctLayerStyle(bottomBtnVisuals.minus)"
              :src="pgUi('btn-minus')!"
              alt=""
              draggable="false"
            />
            <img
              class="pg-btn-tint"
              :style="pctLayerStyle(bottomBtnVisuals.plus)"
              :src="pgUi('btn-plus')!"
              alt=""
              draggable="false"
            />
            <img
              class="pg-btn-label"
              :class="{ 'is-active': autoSpinCount > 0 }"
              :style="pctLayerStyle(bottomBtnVisuals.auto)"
              :src="pgUi('label-auto-text')!"
              alt=""
              draggable="false"
            />
            <img
              class="pg-btn-tint"
              :class="{ 'is-active': autoSpinCount > 0 }"
              :style="pctLayerStyle(bottomBtnVisuals.auto)"
              :src="pgUi('btn-auto-center')!"
              alt=""
              draggable="false"
            />
            <img
              class="pg-btn-tint"
              :style="pctLayerStyle(bottomBtnVisuals.menu)"
              :src="pgUi('btn-menu')!"
              alt=""
              draggable="false"
            />

            <button
              class="action-btn action-btn--hit action-btn--turbo"
              :class="{ 'is-active': isTurbo }"
              :style="pctLayerStyle(bottomBtnHits.turbo)"
              @pointerdown="setPressedBtn('turbo')"
              @pointerup="clearPressedBtn"
              @pointerleave="clearPressedBtn"
              @pointercancel="clearPressedBtn"
              @click="toggleTurbo"
            />
            <button
              class="action-btn action-btn--hit action-btn--minus"
              :class="{ 'is-disabled': !canAdjustBet }"
              :disabled="!canAdjustBet"
              :style="pctLayerStyle(bottomBtnHits.minus)"
              @pointerdown="setPressedBtn('minus')"
              @pointerup="clearPressedBtn"
              @pointerleave="clearPressedBtn"
              @pointercancel="clearPressedBtn"
              @click="decreaseBet"
            />
            <!-- 正版旋转钮：pgSpinLayout normal_spin_holder 子节点相对定位 -->
            <div
              class="spin-button-stack"
              :class="{ 'is-disabled': isSpinControlDisabled }"
              :style="pctLayerStyle(spinHolderBox)"
            >
              <img
                v-if="!showCenterSpinCount && pgUi('btn-spin-frame')"
                class="spin-stack-img spin-stack-disc"
                :class="{ 'is-free-spin': isFreeSpinMode }"
                :style="relPctStyle(pgSpin.disc)"
                :src="pgUi('btn-spin-frame')!"
                alt=""
                draggable="false"
              />
              <template v-else-if="showCenterSpinCount && pgUi('btn-spin-count')">
                <img
                  class="spin-stack-img spin-stack-disc--count"
                  :style="relPctStyle(pgSpin.countDisc)"
                  :src="pgUi('btn-spin-count')!"
                  alt=""
                  draggable="false"
                />
                <div
                  class="spin-stack-digits"
                  :class="{ 'is-count-bump': spinCountBumpActive }"
                  :style="relPctStyle(pgSpin.countDigits)"
                  aria-hidden="true"
                >
                  <span
                    v-for="(ch, i) in spinCountChars"
                    :key="`${spinCountBumpToken}-${i}-${ch}`"
                    class="spin-count-digit"
                    :style="spinCountDigitStyle(ch)"
                  />
                </div>
              </template>
              <div
                class="spin-stack-arrow"
                :style="relPctStyle(pgSpin.arrow)"
              >
                <MahjongSpinButton
                  :is-accelerating="isSpinning || isResolving"
                  :is-turbo="isTurbo"
                  :show-arrows="!showCenterSpinCount"
                  :retrigger-flash="spinRetriggerFlash"
                  :disabled="isSpinControlDisabled"
                />
              </div>
            </div>
            <button
              class="action-btn action-btn--hit action-btn--spin-hit"
              :class="{ 'is-disabled': isSpinControlDisabled }"
              :disabled="isSpinControlDisabled"
              :style="pctLayerStyle(pgSpin.hit)"
              aria-label="旋转"
              @click="handleSpinClick()"
            />
            <button
              class="action-btn action-btn--hit action-btn--plus"
              :class="{ 'is-disabled': !canAdjustBet }"
              :disabled="!canAdjustBet"
              :style="pctLayerStyle(bottomBtnHits.plus)"
              @pointerdown="setPressedBtn('plus')"
              @pointerup="clearPressedBtn"
              @pointerleave="clearPressedBtn"
              @pointercancel="clearPressedBtn"
              @click="increaseBet"
            />
            <button
              class="action-btn action-btn--hit action-btn--auto"
              :class="{ 'is-active': autoSpinCount > 0, 'is-disabled': !canUseAutoSpin && autoSpinCount === 0 }"
              :disabled="!canUseAutoSpin && autoSpinCount === 0"
              :style="pctLayerStyle(bottomBtnHits.auto)"
              @pointerdown="setPressedBtn('auto')"
              @pointerup="clearPressedBtn"
              @pointerleave="clearPressedBtn"
              @pointercancel="clearPressedBtn"
              @click="handleAutoBtnClick"
            >
              <div v-if="autoSpinCount > 0 && !showCenterSpinCount" class="auto-count-badge">{{ autoSpinCount }}</div>
            </button>
            <button
              class="action-btn action-btn--hit action-btn--menu"
              :style="pctLayerStyle(bottomBtnHits.menu)"
              aria-label="菜单"
              @pointerdown="setPressedBtn('menu')"
              @pointerup="clearPressedBtn"
              @pointerleave="clearPressedBtn"
              @pointercancel="clearPressedBtn"
              @click="showMenuPage = true"
            />
          </div>
        </Transition>

        <!-- 免费旋转底栏：正版替换全部底栏按钮 -->
        <div
          v-if="showFsBottomPanel"
          class="fs-bottom-panel"
          :style="pctLayerStyle(fsBottomLayout.panel)"
        >
          <img
            v-if="isLastFreeSpinLabel && pgUi('fs-last-spin-label')"
            class="fs-bottom-last"
            :src="pgUi('fs-last-spin-label')!"
            alt="最后免费旋转"
            draggable="false"
          />
          <div v-else class="fs-bottom-remaining">
            <div class="fs-bottom-remaining__label">
              <img
                v-if="pgUi('fs-remaining-label-top')"
                class="fs-remaining-line fs-remaining-line--top"
                :src="pgUi('fs-remaining-label-top')!"
                alt=""
                draggable="false"
              />
              <img
                v-if="pgUi('fs-remaining-label-bottom')"
                class="fs-remaining-line fs-remaining-line--bottom"
                :src="pgUi('fs-remaining-label-bottom')!"
                alt=""
                draggable="false"
              />
            </div>
            <img
              v-if="pgUi('fs-remaining-colon')"
              class="fs-remaining-colon"
              :src="pgUi('fs-remaining-colon')!"
              alt=""
              draggable="false"
            />
            <div
              class="fs-bottom-remaining__digits"
              :class="{ 'is-count-bump': fsCountBumpActive }"
              aria-hidden="true"
            >
              <span
                v-for="(ch, i) in fsCountChars"
                :key="`${fsCountBumpToken}-${i}-${ch}`"
                class="fs-count-digit"
                :style="fsCountDigitStyle(ch)"
              />
            </div>
          </div>
        </div>

        <Transition name="slide-right-page">
          <div class="bottom-action-menu-page" v-if="showMenuPage">
            <template v-for="item in menuPageLayers" :key="item.key">
              <img
                class="pg-btn-circle"
                :class="{ 'is-visible': pressedMenuBtn === item.key }"
                :style="pctLayerStyle(item.circle)"
                :src="pgUi('btn-circle')!"
                alt=""
                draggable="false"
              />
              <img
                class="pg-btn-tint menu-page-icon"
                :style="pctLayerStyle(item.icon)"
                :src="pgUi(item.iconKey)!"
                alt=""
                draggable="false"
              />
              <span class="menu-page-label" :style="pctLayerStyle(item.label)">{{ item.labelText }}</span>
              <button
                class="menu-page-hit"
                :style="pctLayerStyle(item.hit)"
                @pointerdown="setPressedMenuBtn(item.key)"
                @pointerup="clearPressedMenuBtn"
                @pointerleave="clearPressedMenuBtn"
                @pointercancel="clearPressedMenuBtn"
                @click="item.onClick()"
              />
            </template>
          </div>
        </Transition>
      </div>

      <MahjongInfoSheet
        :visible="infoSheetVisible"
        :initial-tab="infoSheetTab"
        :bet-amount="betAmount"
        @close="infoSheetVisible = false"
      />

      <!-- 弹窗遮罩 -->
      <Transition name="fade">
        <div
          v-if="activePopup"
          class="popup-backdrop"
          aria-hidden="true"
          @click="activePopup === 'bet' ? cancelBetPopup() : closePopup()"
        />
      </Transition>

      <!-- 底部上拉框 (点击金额格子弹出) -->
      <Transition name="slide-up">
        <div v-if="activePopup" class="hud-popup-drawer" :class="{ 'bet-popup-style': isSheetPopup }">
          
          <!-- 投注设置 -->
          <div v-if="activePopup === 'bet'" class="bet-settings-container">
            <div class="bet-sheet-handle" aria-hidden="true" />

            <div class="bet-popup-header">
              <span class="popup-title">投注设置</span>
              <button class="close-popup-btn" type="button" aria-label="关闭" @click="cancelBetPopup">×</button>
            </div>

            <div class="bet-balance-row">
              <span class="bet-balance-label">余额</span>
              <span class="bet-balance-value">¥{{ balance.toFixed(2) }}</span>
            </div>

            <div class="bet-total-pill">
              <span class="bet-total-pill__label">投注总额</span>
              <span class="bet-total-pill__value">¥{{ betAmount.toFixed(2) }}</span>
            </div>

            <div class="bet-table" :class="{ 'is-disabled': isBetPopupDisabled }">
              <div class="bet-thead">
                <div>投注大小</div>
                <div aria-hidden="true" />
                <div>投注倍数</div>
                <div aria-hidden="true" />
                <div>基础投注</div>
                <div aria-hidden="true" />
                <div>投注总额</div>
              </div>

              <div class="bet-picker-body">
                <div class="bet-highlight-row" aria-hidden="true" />

                <div class="bet-picker-col">
                  <div class="bet-wheel">
                    <button
                      v-for="offset in BET_WHEEL_OFFSETS"
                      :key="`size-${offset}`"
                      type="button"
                      class="bet-wheel-item"
                      :class="wheelItemClass(offset, currentSizeIdx, betSizes.length)"
                      :disabled="isBetPopupDisabled || !isWheelIndexValid(currentSizeIdx, offset, betSizes.length)"
                      @click="selectSizeByOffset(offset)"
                    >
                      {{ formatSizeWheelLabel(offset) }}
                    </button>
                  </div>
                </div>

                <div class="bet-separator-col">
                  <span v-for="offset in BET_WHEEL_OFFSETS" :key="`sep1-${offset}`" class="bet-sep-item">
                    {{ offset === 0 ? '×' : '' }}
                  </span>
                </div>

                <div class="bet-picker-col">
                  <div class="bet-wheel">
                    <button
                      v-for="offset in BET_WHEEL_OFFSETS"
                      :key="`mult-${offset}`"
                      type="button"
                      class="bet-wheel-item"
                      :class="wheelItemClass(offset, currentMultIdx, betMultipliers.length)"
                      :disabled="isBetPopupDisabled || !isWheelIndexValid(currentMultIdx, offset, betMultipliers.length)"
                      @click="selectMultByOffset(offset)"
                    >
                      {{ formatMultWheelLabel(offset) }}
                    </button>
                  </div>
                </div>

                <div class="bet-separator-col">
                  <span v-for="offset in BET_WHEEL_OFFSETS" :key="`sep2-${offset}`" class="bet-sep-item">
                    {{ offset === 0 ? '×' : '' }}
                  </span>
                </div>

                <div class="bet-picker-col bet-picker-col--static">
                  <div class="bet-wheel">
                    <span
                      v-for="offset in BET_WHEEL_OFFSETS"
                      :key="`base-${offset}`"
                      class="bet-wheel-item bet-wheel-item--readonly"
                      :class="wheelItemClass(offset, 0, 1)"
                    >
                      {{ offset === 0 ? baseBet : '' }}
                    </span>
                  </div>
                </div>

                <div class="bet-separator-col">
                  <span v-for="offset in BET_WHEEL_OFFSETS" :key="`sep3-${offset}`" class="bet-sep-item">
                    {{ offset === 0 ? '=' : '' }}
                  </span>
                </div>

                <div class="bet-picker-col bet-picker-col--total">
                  <div class="bet-wheel">
                    <button
                      v-for="offset in BET_WHEEL_OFFSETS"
                      :key="`total-${offset}`"
                      type="button"
                      class="bet-wheel-item bet-wheel-item--total"
                      :class="wheelItemClass(offset, currentTotalIdx, validTotals.length)"
                      :disabled="isBetPopupDisabled || !isWheelIndexValid(currentTotalIdx, offset, validTotals.length)"
                      @click="selectTotalByOffset(offset)"
                    >
                      {{ formatTotalWheelLabel(offset) }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="bet-quick-row">
              <button type="button" class="bet-quick-btn" :disabled="isBetPopupDisabled" @click="setMinBet">最小投注</button>
              <button type="button" class="bet-quick-btn bet-quick-btn--max" :disabled="isBetPopupDisabled" @click="setMaxBet">最大投注</button>
            </div>

            <div class="bet-popup-footer">
              <button type="button" class="cyber-btn cancel-btn" @click="cancelBetPopup">取 消</button>
              <button type="button" class="cyber-btn confirm-btn" @click="confirmBetPopup">确 定</button>
            </div>
          </div>

          <!-- 自动旋转设置弹窗 -->
          <div v-if="activePopup === 'auto'" class="bet-settings-container">
            <div class="bet-popup-header">
              <span class="popup-title">自动旋转</span>
              <button class="close-popup-btn" @click="closePopup">×</button>
            </div>
            
            <div class="auto-spin-section">
              <div class="auto-spin-label">自动旋转次数</div>
              <div class="auto-spin-options">
                <button 
                  v-for="opt in autoSpinOptions" 
                  :key="opt"
                  class="auto-opt-btn"
                  :class="{ 'is-selected': selectedAutoSpinCount === opt }"
                  @click="selectedAutoSpinCount = opt"
                >
                  {{ opt }}
                </button>
              </div>
            </div>

            <div class="bet-popup-footer" style="margin-top: 25px;">
              <button class="auto-start-btn" @click="startAutoSpin">开始自动旋转</button>
            </div>
          </div>
          <div v-if="activePopup === 'wallet'" class="hud-sheet-container">
            <div class="bet-sheet-handle" aria-hidden="true" />

            <div class="bet-popup-header">
              <span class="popup-title">账户余额</span>
              <button class="close-popup-btn" type="button" aria-label="关闭" @click="closePopup">×</button>
            </div>

            <div class="wallet-balance-pill">
              <img v-if="pgUi('icon-wallet')" class="wallet-pill-icon" :src="pgUi('icon-wallet')!" alt="" />
              <span class="wallet-pill-label">可用余额</span>
              <span class="wallet-pill-value">¥{{ balance.toFixed(2) }}</span>
            </div>

            <div class="wallet-stats-grid">
              <div class="wallet-stat-card">
                <span class="wallet-stat-label">{{ isInFreeSpinFeature ? '锁定投注' : '当前投注' }}</span>
                <span class="wallet-stat-value">¥{{ hudBetDisplay.toFixed(2) }}</span>
              </div>
              <div class="wallet-stat-card">
                <span class="wallet-stat-label">{{ isInFreeSpinFeature ? '免费累计' : '本局赢取' }}</span>
                <span class="wallet-stat-value" :class="{ 'is-win': hudWinDisplay > 0 }">¥{{ hudWinDisplay.toFixed(2) }}</span>
              </div>
            </div>

            <p class="wallet-hint">余额不足时无法开始旋转，请先调整投注或充值</p>
          </div>

          <!-- 赢取详情 -->
          <div v-if="activePopup === 'win'" class="hud-sheet-container win-sheet">
            <div class="bet-sheet-handle" aria-hidden="true" />

            <div class="bet-popup-header">
              <span class="popup-title">赢取详情</span>
              <button class="close-popup-btn" type="button" aria-label="关闭" @click="closePopup">×</button>
            </div>

            <div class="win-current-pill">
              <span class="win-current-pill__label">{{ isInFreeSpinFeature ? '本转赢取' : '本局赢取' }}</span>
              <span class="win-current-pill__value" :class="{ 'is-win': winAmount > 0 }">¥{{ winAmount.toFixed(2) }}</span>
            </div>

            <div v-if="isInFreeSpinFeature" class="win-current-pill win-session-pill">
              <span class="win-current-pill__label">免费累计</span>
              <span class="win-current-pill__value" :class="{ 'is-win': hudWinDisplay > 0 }">¥{{ hudWinDisplay.toFixed(2) }}</span>
            </div>

            <div class="win-stats-row">
              <div class="win-stat-item">
                <span class="win-stat-item__label">今日局数</span>
                <span class="win-stat-item__value">{{ winSummary.count }}</span>
              </div>
              <div class="win-stat-item">
                <span class="win-stat-item__label">盈利次数</span>
                <span class="win-stat-item__value">{{ winSummary.winCount }}</span>
              </div>
              <div class="win-stat-item">
                <span class="win-stat-item__label">累计盈利</span>
                <span class="win-stat-item__value" :class="winSummary.totalProfit >= 0 ? 'is-win' : 'is-lose'">
                  {{ winSummary.totalProfit >= 0 ? '+' : '' }}¥{{ winSummary.totalProfit.toFixed(2) }}
                </span>
              </div>
            </div>

            <div class="win-history-panel">
              <div class="win-history-head">
                <span>时间</span>
                <span>投注</span>
                <span>盈利</span>
              </div>
              <div v-if="historyRecords.length" class="win-history-body">
                <div
                  v-for="record in historyRecords.slice(0, 10)"
                  :key="record.id"
                  class="win-history-row"
                >
                  <span class="win-history-time">{{ record.time }}</span>
                  <span class="win-history-bet">¥{{ record.bet.toFixed(2) }}</span>
                  <span
                    class="win-history-profit"
                    :class="record.profit > 0 ? 'is-win' : record.profit < 0 ? 'is-lose' : 'is-neutral'"
                  >
                    {{ record.profit > 0 ? '+' : '' }}{{ record.profit.toFixed(2) }}
                  </span>
                </div>
              </div>
              <div v-else class="win-history-empty">暂无记录，开始旋转后这里会显示赢取详情</div>
            </div>

            <div class="bet-popup-footer win-sheet-footer">
              <button type="button" class="cyber-btn confirm-btn win-more-btn" @click="openFullHistory">查看全部记录</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 历史记录全屏弹窗 -->
      <Transition name="fade">
        <div v-if="showHistoryModal" class="full-modal-overlay" @click.self="showHistoryModal = false">
          <div class="full-modal-content">
            <div class="modal-header">
              <span class="modal-title">今日记录</span>
              <button type="button" class="close-modal-btn" aria-label="关闭" @click="showHistoryModal = false">×</button>
            </div>

            <div class="modal-summary">
              <div class="modal-summary-item">
                <span>总局数</span>
                <strong>{{ winSummary.count }}</strong>
              </div>
              <div class="modal-summary-item">
                <span>累计盈利</span>
                <strong :class="winSummary.totalProfit >= 0 ? 'is-win' : 'is-lose'">
                  {{ winSummary.totalProfit >= 0 ? '+' : '' }}¥{{ winSummary.totalProfit.toFixed(2) }}
                </strong>
              </div>
            </div>

            <div class="modal-body">
              <table class="history-table">
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>交易单号</th>
                    <th>投注</th>
                    <th>盈利</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="record in historyRecords" :key="record.id">
                    <td>{{ record.time }}</td>
                    <td class="txn-id">{{ record.id }}</td>
                    <td>¥{{ record.bet.toFixed(2) }}</td>
                    <td :class="record.profit > 0 ? 'is-win' : record.profit < 0 ? 'is-lose' : 'is-neutral'">
                      {{ record.profit > 0 ? '+' : '' }}{{ record.profit.toFixed(2) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Big / Mega / Super Mega Win 庆祝 -->
      <Transition name="big-win">
        <div
          v-if="bigWinVisible"
          class="big-win-celebration"
          :class="`tier-${bigWinTier}`"
          aria-live="polite"
        >
          <img
            v-if="pgBigWinImage(bigWinTier)"
            class="big-win-banner"
            :src="pgBigWinImage(bigWinTier)!"
            alt=""
          />
          <template v-else>
            <div class="big-win-rays" aria-hidden="true" />
            <div class="big-win-sparkles" aria-hidden="true" />
            <div class="big-win-label">{{ bigWinLabel }}</div>
          </template>
          <div class="big-win-amount">¥{{ bigWinAmount.toFixed(2) }}</div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useWalletStore } from '@/stores/wallet'
import MahjongTile from '@/components/MahjongTile.vue'
import MahjongSymbolInfo, { type TileAnchor } from '@/components/MahjongSymbolInfo.vue'
import MahjongInfoSheet from '@/components/MahjongInfoSheet.vue'
import MahjongFreeSpinTriggerOverlay from '@/components/MahjongFreeSpinTriggerOverlay.vue'
import MahjongFreeSpinEndOverlay from '@/components/MahjongFreeSpinEndOverlay.vue'
import MahjongSpinButton from '@/components/MahjongSpinButton.vue'
import MahjongCover from '@/components/MahjongCover.vue'
import { MAHJONG_PG_VISUAL_STEP } from '@/games/mahjong/pgVisualStep'
import { useMahjongSound } from '@/composables/useMahjongSound'
import {
  BASE_BET,
  COLS,
  TOTAL_ROWS,
  VISIBLE_ROWS,
  VISIBLE_ROW_INDICES,
  CASCADE_MULTIPLIERS,
  FREE_SPIN_MULTIPLIERS,
  type TileCell,
  type GridPos,
  type MahjongSymbolId,
  createEmptyGrid,
  evaluateWins,
  getWinAnnounceSymbol,
  rollColumn,
  rollTile,
  applyGoldenToWild,
  getCellsToRemove,
  dropAndRefill,
  computeTileDropMotions,
  freeSpinsFromScatters,
  getScatterCells,
  isPaySymbol,
} from '@/games/mahjong/mahjongWays1'
import cocosLayout from '@/games/mahjong/cocosLayout.json'
import pgSpinLayout from '@/games/mahjong/pgSpinLayout.json'
import { hasPgUi, pgBigWinImage, pgUi, pgUiMode } from '@/games/mahjong/pgAssets'
import { digitSpriteStyle } from '@/games/mahjong/digitAtlas'

type PctBox = {
  topPct: number
  heightPct: number
  leftPct: number
  widthPct: number
}

const router = useRouter()
const mahjongSound = useMahjongSound()
const symbolAssetBase = '/images/games/mahjong/pg/symbols'
const isDev = import.meta.env.DEV

/** 逐层复刻：URL ?step=3 可临时预览，否则读 pgVisualStep.ts */
const pgStep = computed(() => {
  const q = Number(router.currentRoute.value.query.step)
  if (Number.isFinite(q) && q >= 1 && q <= 10) return Math.floor(q)
  return MAHJONG_PG_VISUAL_STEP
})

const showPgCover = ref(false)
function onPgCoverStart() {
  showPgCover.value = false
  void mahjongSound.startMainBgm()
}

const btnBg = (key: string) => {
  const url = pgUi(key)
  if (!url) return undefined
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'center',
  }
}

/** 正版 dump 设计稿 — 百分比坐标见 cocosLayout.json */
const CANVAS_W = cocosLayout.design[0]
const CANVAS_H = cocosLayout.design[1]

const canvasBoxStyle = computed(() => ({
  aspectRatio: `${CANVAS_W} / ${CANVAS_H}`,
  width: `min(100vw, 100vh * ${CANVAS_W / CANVAS_H})`,
  height: `min(100vh, 100vw * ${CANVAS_H / CANVAS_W})`,
}))
const L = cocosLayout.L as Record<string, PctBox>

/** 顶部两侧铜钱装饰（Cocos main_top_a） */
const topCoinsBarUrl = computed(() =>
  pgUi('top-coins-bar') ?? pgUi('wood-top-panel') ?? pgUi('wood-side-strip'),
)

const topBarMainUrl = computed(() =>
  pgUi('top-bar-main') ?? pgUi('top-bar-orange'),
)

const multBarFrameUrl = computed(() =>
  isInFreeSpinFeature.value
    ? (pgUi('multiplier-bar-bg-free') ?? pgUi('multiplier-bar-bg'))
    : (pgUi('multiplier-bar-bg') ?? pgUi('mult-bar-frame')),
)

type MultSlotLayout = {
  darkKey: string
  activeKey: string
  darkBox: PctBox
  activeBox: PctBox
  glowBox: PctBox
}

/** 正版 multiplier_glow：完整 117×55 贴图 scale×5，worldPct 来自 Cocos dump */
function glowBoxForActive(activeBox: PctBox): PctBox {
  const cx = activeBox.leftPct + activeBox.widthPct / 2
  const w = 54.167
  const h = 14.323
  const top = 0.328
  return {
    leftPct: cx - w / 2,
    topPct: top,
    widthPct: w,
    heightPct: h,
  }
}

function glowBoxInFrame(glow: PctBox, frame: PctBox): PctBox {
  return {
    leftPct: ((glow.leftPct - frame.leftPct) / frame.widthPct) * 100,
    topPct: ((glow.topPct - frame.topPct) / frame.heightPct) * 100,
    widthPct: (glow.widthPct / frame.widthPct) * 100,
    heightPct: (glow.heightPct / frame.heightPct) * 100,
  }
}

/** 正版只露出木条底边一条光带（非整条木纹高度） */
function glowClipFrame(frame: PctBox): PctBox {
  const stripH = frame.heightPct * 0.24
  return {
    leftPct: frame.leftPct,
    widthPct: frame.widthPct,
    topPct: frame.topPct + frame.heightPct - stripH,
    heightPct: stripH,
  }
}

const MULT_SLOTS_NORMAL: MultSlotLayout[] = [
  {
    darkKey: 'mult-x1-dark', activeKey: 'mult-x1',
    darkBox: { leftPct: 16.898, topPct: 9.266, widthPct: 10.593, heightPct: 4.692 },
    activeBox: { leftPct: 15.177, topPct: 8.052, widthPct: 14.035, heightPct: 6.48 },
    glowBox: { leftPct: 0, topPct: 0, widthPct: 0, heightPct: 0 },
  },
  {
    darkKey: 'mult-x2-dark', activeKey: 'mult-x2',
    darkBox: { leftPct: 34.442, topPct: 9.266, widthPct: 12.579, heightPct: 4.692 },
    activeBox: { leftPct: 33.052, topPct: 7.926, widthPct: 15.756, heightPct: 6.629 },
    glowBox: { leftPct: 0, topPct: 0, widthPct: 0, heightPct: 0 },
  },
  {
    darkKey: 'mult-x3-dark', activeKey: 'mult-x3',
    darkBox: { leftPct: 53.112, topPct: 9.192, widthPct: 12.314, heightPct: 4.767 },
    activeBox: { leftPct: 51.192, topPct: 7.926, widthPct: 16.154, heightPct: 6.703 },
    glowBox: { leftPct: 0, topPct: 0, widthPct: 0, heightPct: 0 },
  },
  {
    darkKey: 'mult-x5-dark', activeKey: 'mult-x5',
    darkBox: { leftPct: 71.715, topPct: 9.117, widthPct: 12.181, heightPct: 4.841 },
    activeBox: { leftPct: 69.861, topPct: 7.814, widthPct: 15.889, heightPct: 6.703 },
    glowBox: { leftPct: 0, topPct: 0, widthPct: 0, heightPct: 0 },
  },
]

const MULT_SLOTS_FREE: MultSlotLayout[] = [
  {
    darkKey: 'mult-x2-dark', activeKey: 'mult-x2',
    darkBox: { leftPct: 16.22, topPct: 9.345, widthPct: 11.95, heightPct: 4.458 },
    activeBox: { leftPct: 15.422, topPct: 8.283, widthPct: 14.181, heightPct: 5.966 },
    glowBox: { leftPct: 0, topPct: 0, widthPct: 0, heightPct: 0 },
  },
  {
    darkKey: 'mult-x4-dark', activeKey: 'mult-x4',
    darkBox: { leftPct: 34.757, topPct: 9.203, widthPct: 11.95, heightPct: 4.599 },
    activeBox: { leftPct: 33.343, topPct: 8.142, widthPct: 14.777, heightPct: 6.167 },
    glowBox: { leftPct: 0, topPct: 0, widthPct: 0, heightPct: 0 },
  },
  {
    darkKey: 'mult-x6-dark', activeKey: 'mult-x6',
    darkBox: { leftPct: 53.419, topPct: 9.274, widthPct: 11.698, heightPct: 4.528 },
    activeBox: { leftPct: 52.059, topPct: 8.209, widthPct: 14.419, heightPct: 6.1 },
    glowBox: { leftPct: 0, topPct: 0, widthPct: 0, heightPct: 0 },
  },
  {
    darkKey: 'mult-x10-dark', activeKey: 'mult-x10',
    darkBox: { leftPct: 69.629, topPct: 9.203, widthPct: 16.352, heightPct: 4.599 },
    activeBox: { leftPct: 68.153, topPct: 8.231, widthPct: 19.305, heightPct: 6.033 },
    glowBox: { leftPct: 0, topPct: 0, widthPct: 0, heightPct: 0 },
  },
]

const multSlots = computed(() =>
  (isInFreeSpinFeature.value ? MULT_SLOTS_FREE : MULT_SLOTS_NORMAL).map((slot) => ({
    ...slot,
    glowBox: glowBoxForActive(slot.activeBox),
  })),
)

/** 正版暗刻 ×：优先 mult-xN-dark，无资源时不硬叠 CSS 压暗 */
function multInactiveUrl(slot: MultSlotLayout): string | null {
  return pgUi(slot.darkKey) ?? pgUi(slot.activeKey)
}
const spinFrame = cocosLayout.spinFrame as PctBox
/** 正版旋转钮（pg-cocos-dump normal_spin_holder，1080×1920） */
const pgSpin = pgSpinLayout as {
  holder: PctBox
  countHolder: PctBox
  hit: PctBox
  disc: PctBox
  arrow: PctBox
  countDisc: PctBox
  countDigits: PctBox
}
const liveNodes = (cocosLayout as { liveNodes?: Record<string, PctBox> }).liveNodes
const btnBar = cocosLayout.btnBar as PctBox

const bottomBtnHits = {
  turbo: { leftPct: 3.889, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 },
  minus: { leftPct: 19.167, topPct: 83.438, widthPct: 16.667, heightPct: 10.313 },
  spin: pgSpin.hit,
  plus: { leftPct: 64.167, topPct: 83.438, widthPct: 16.667, heightPct: 10.313 },
  auto: { leftPct: 79.444, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 },
  menu: { leftPct: 92.11, topPct: 83.906, widthPct: 18.076, heightPct: 9.375 },
} satisfies Record<string, PctBox>

const bottomBtnCircles = [
  { key: 'turbo', box: { leftPct: 3.889, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 } },
  { key: 'minus', box: { leftPct: 19.167, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 } },
  { key: 'plus', box: { leftPct: 64.167, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 } },
  { key: 'auto', box: { leftPct: 79.444, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 } },
  { key: 'menu', box: { leftPct: 93.519, topPct: 83.906, widthPct: 16.667, heightPct: 9.375 } },
] as const

const bottomBtnVisuals = {
  turbo: { leftPct: 8.056, topPct: 86.25, widthPct: 8.333, heightPct: 4.688 },
  minus: { leftPct: 22.5, topPct: 85.781, widthPct: 10, heightPct: 5.625 },
  plus: { leftPct: 67.5, topPct: 85.781, widthPct: 10, heightPct: 5.625 },
  auto: { leftPct: 83.611, topPct: 86.25, widthPct: 8.333, heightPct: 4.688 },
  menu: { leftPct: 94.151, topPct: 85.772, widthPct: 9.662, heightPct: 5.435 },
} satisfies Record<string, PctBox>

/** 极速开启光晕（Cocos dump worldPct） */
const turboFxVisuals = {
  glow: { leftPct: 9.907, topPct: 87.292, widthPct: 4.63, heightPct: 2.604 },
} satisfies Record<string, PctBox>

function turboFxStyle(box: PctBox, sheetKey: string) {
  const url = pgUi(sheetKey)
  return {
    ...pctLayerStyle(box),
    ...(url ? { backgroundImage: `url(${url})` } : {}),
  }
}

/** 菜单第二页：与主按钮行同高 */
const MENU_ROW = { circleTop: 83.906, circleH: 9.375, iconTop: 85.781, iconH: 5.625, labelTop: 90.989, labelH: 4.583 }
const menuPageLayers = computed(() => [
  {
    key: 'sound',
    hit: { leftPct: 4.056, topPct: MENU_ROW.circleTop, widthPct: 16.667, heightPct: MENU_ROW.circleH },
    circle: { leftPct: 4.056, topPct: MENU_ROW.circleTop, widthPct: 16.667, heightPct: MENU_ROW.circleH },
    icon: { leftPct: 7.389, topPct: MENU_ROW.iconTop, widthPct: 10, heightPct: MENU_ROW.iconH },
    label: { leftPct: 4.519, topPct: MENU_ROW.labelTop, widthPct: 15.741, heightPct: MENU_ROW.labelH },
    iconKey: soundEnabled.value ? 'btn-sound-on' : 'btn-sound-off',
    labelText: '声音',
    onClick: toggleSound,
  },
  {
    key: 'paytable',
    hit: { leftPct: 22.861, topPct: MENU_ROW.circleTop, widthPct: 16.667, heightPct: MENU_ROW.circleH },
    circle: { leftPct: 22.861, topPct: MENU_ROW.circleTop, widthPct: 16.667, heightPct: MENU_ROW.circleH },
    icon: { leftPct: 26.194, topPct: MENU_ROW.iconTop, widthPct: 10, heightPct: MENU_ROW.iconH },
    label: { leftPct: 23.324, topPct: MENU_ROW.labelTop, widthPct: 15.741, heightPct: MENU_ROW.labelH },
    iconKey: 'btn-paytable',
    labelText: '赔付表',
    onClick: () => openInfoSheet('pay'),
  },
  {
    key: 'rules',
    hit: { leftPct: 41.667, topPct: MENU_ROW.circleTop, widthPct: 16.667, heightPct: MENU_ROW.circleH },
    circle: { leftPct: 41.667, topPct: MENU_ROW.circleTop, widthPct: 16.667, heightPct: MENU_ROW.circleH },
    icon: { leftPct: 45, topPct: MENU_ROW.iconTop, widthPct: 10, heightPct: MENU_ROW.iconH },
    label: { leftPct: 42.13, topPct: MENU_ROW.labelTop, widthPct: 15.741, heightPct: MENU_ROW.labelH },
    iconKey: 'btn-rules',
    labelText: '规则',
    onClick: () => openInfoSheet('rules'),
  },
  {
    key: 'history',
    hit: { leftPct: 60.472, topPct: MENU_ROW.circleTop, widthPct: 16.667, heightPct: MENU_ROW.circleH },
    circle: { leftPct: 60.472, topPct: MENU_ROW.circleTop, widthPct: 16.667, heightPct: MENU_ROW.circleH },
    icon: { leftPct: 63.806, topPct: MENU_ROW.iconTop, widthPct: 10, heightPct: MENU_ROW.iconH },
    label: { leftPct: 60.935, topPct: MENU_ROW.labelTop, widthPct: 15.741, heightPct: MENU_ROW.labelH },
    iconKey: 'btn-history',
    labelText: '历史',
    onClick: () => { showHistoryModal.value = true },
  },
  {
    key: 'close',
    hit: { leftPct: 78.352, topPct: MENU_ROW.circleTop, widthPct: 18.519, heightPct: MENU_ROW.circleH },
    circle: { leftPct: 78.352, topPct: MENU_ROW.circleTop, widthPct: 18.519, heightPct: MENU_ROW.circleH },
    icon: { leftPct: 82.611, topPct: MENU_ROW.iconTop, widthPct: 10, heightPct: MENU_ROW.iconH },
    label: { leftPct: 78.352, topPct: MENU_ROW.labelTop, widthPct: 18.519, heightPct: MENU_ROW.labelH },
    iconKey: 'btn-back',
    labelText: '关闭',
    onClick: () => { showMenuPage.value = false },
  },
])

const bgImage = (cocosLayout as { bgImage?: PctBox }).bgImage ?? {
  topPct: 0,
  leftPct: 0,
  widthPct: 100,
  heightPct: 100,
}
const playReels = (cocosLayout as { playReels?: PctBox }).playReels ?? L.board

const layoutDebug = ref(false)

const layoutDebugRegions = computed(() => {
  const items: { key: string; label: string; box: PctBox }[] = [
    { key: 'bg', label: '底图 bg-base', box: bgImage },
    { key: 'woodTop', label: '钱币底图 main_top_a', box: L.woodTop },
    { key: 'topBarMain', label: '1024橙条 main_top_b', box: L.topBarMain },
    { key: 'multBarFrame', label: '倍数底框 main_top_c', box: L.multBarFrame },
    { key: 'title1024', label: '1024标题', box: L.title1024 },
    { key: 'reelFrame', label: '牌框 reel_a', box: L.reelFrame },
    { key: 'board', label: '牌区 reel_a', box: L.board },
    { key: 'playReels', label: '转轴 dark_reel', box: playReels },
    { key: 'message', label: '广告条 message', box: L.message },
    { key: 'bottomWood', label: '底栏木框', box: L.bottomWood },
    { key: 'statusHud', label: '三格金额', box: L.statusHud },
    { key: 'spinFrame', label: '旋转钮框(live)', box: spinFrame },
    { key: 'spinHolder', label: '旋转钮 holder', box: pgSpin.holder },
    { key: 'spinHit', label: '旋转热区', box: pgSpin.hit },
    { key: 'btnBar', label: '底栏按钮', box: btnBar },
  ]
  return items.filter((i) => i.box)
})

const bgImageStyle = computed(() => pctLayerStyle(bgImage))

function pctLayerStyle(box: PctBox | undefined) {
  if (!box) return { display: 'none' }
  return {
    top: `${box.topPct}%`,
    height: `${box.heightPct}%`,
    left: `${box.leftPct}%`,
    width: `${box.widthPct}%`,
  }
}

/** spin-button-stack 内子层：相对父盒 0~100% */
function relPctStyle(box: PctBox) {
  return {
    left: `${box.leftPct}%`,
    top: `${box.topPct}%`,
    width: `${box.widthPct}%`,
    height: `${box.heightPct}%`,
  }
}

function layerStyle(box: Pick<PctBox, 'topPct' | 'heightPct'>) {
  return {
    top: `${box.topPct}%`,
    height: `${box.heightPct}%`,
  }
}

function boxStyle(box: PctBox) {
  return pctLayerStyle(box)
}

const btnBarStyle = computed(() => boxStyle(btnBar))

/** 牌区：正版 dark_reel 区域（与符号网格一致） */
const boardStyle = computed(() => pctLayerStyle(playReels))

const isVisibleRow = (row: number) =>
  (VISIBLE_ROW_INDICES as readonly number[]).includes(row)

/** 倍数档位仅驱动逻辑；高亮已烘焙在 bg-base 内，不再叠图层 */
// 中奖高亮与级联动画状态
const explodingCells = ref<Set<string>>(new Set())
const winningCells = ref<Set<string>>(new Set())
const transformingCells = ref<Set<string>>(new Set())
const tileDropMotions = ref(new Map<string, { fallRows: number; delayMs: number }>())
const isResolving = ref(false)

const CASCADE_ANIM = {
  normal: { win: 480, transform: 460, dissolve: 360, drop: 400, colStagger: 68 },
  turbo: { win: 240, transform: 230, dissolve: 185, drop: 210, colStagger: 34 },
} as const

/** PG 式逐列停轮：左→右依次落牌（与音效 scheduleReelStops 对齐） */
const REEL_STOP_DELAYS = {
  normal: [180, 360, 540, 720, 900],
  turbo: [60, 100, 140, 180, 220],
} as const

const REEL_BOUNCE_MS = { normal: 160, turbo: 90 } as const

/** 正版 slot_scroller 每列约 30 格，滚动段用 blur 符号条带 */
const REEL_BLUR_TILE_COUNT = 20

const columnSpinning = ref<boolean[]>(Array(COLS).fill(false))
const columnReelBounce = ref<boolean[]>(Array(COLS).fill(false))
const multPulseActive = ref(false)

const bigWinVisible = ref(false)
const bigWinTier = ref<'big' | 'mega' | 'super'>('big')
const bigWinAmount = ref(0)

const bigWinLabel = computed(() => {
  switch (bigWinTier.value) {
    case 'super':
      return 'SUPER MEGA WIN'
    case 'mega':
      return 'MEGA WIN'
    default:
      return 'BIG WIN'
  }
})

const columnSpinStyle = (colIndex: number) => {
  const delays = isTurbo.value ? REEL_STOP_DELAYS.turbo : REEL_STOP_DELAYS.normal
  return {
    '--reel-duration': `${delays[colIndex]}ms`,
    '--pg-blur-count': String(REEL_BLUR_TILE_COUNT),
  }
}

const onReelSpinEnd = (colIndex: number) => {
  if (!columnSpinning.value[colIndex]) return
  columnSpinning.value[colIndex] = false
  columnReelBounce.value[colIndex] = true
  gridData.value[colIndex] = spinningCols.value[colIndex]
    .slice(-TOTAL_ROWS)
    .map((t) => ({ ...t }))
  mahjongSound.playReelStop(colIndex, isTurbo.value)
  const bounceMs = isTurbo.value ? REEL_BOUNCE_MS.turbo : REEL_BOUNCE_MS.normal
  setTimeout(() => {
    columnReelBounce.value[colIndex] = false
  }, bounceMs)
}

const onColAnimationEnd = (colIndex: number, e: AnimationEvent) => {
  if (e.animationName !== 'slot-spin') return
  onReelSpinEnd(colIndex)
}

const showBigWinIfNeeded = async (totalWin: number) => {
  const bet = effectiveSpinBet.value || betAmount.value
  if (bet <= 0 || totalWin <= 0) return
  const mult = totalWin / bet
  let tier: 'big' | 'mega' | 'super' | null = null
  if (mult >= 100) tier = 'super'
  else if (mult >= 50) tier = 'mega'
  else if (mult >= 20) tier = 'big'
  if (!tier) return
  bigWinTier.value = tier
  bigWinAmount.value = totalWin
  bigWinVisible.value = true
  await sleep(isTurbo.value ? 1400 : 2600)
  bigWinVisible.value = false
}

// 自动旋转状态
const autoSpinCount = ref(0)
const selectedAutoSpinCount = ref(10)
const autoSpinOptions = [10, 30, 50, 80, 1000]

// 菜单页状态
const showMenuPage = ref(false)
const pressedBtn = ref<string | null>(null)
const pressedMenuBtn = ref<string | null>(null)

function setPressedBtn(key: string) {
  pressedBtn.value = key
}

function clearPressedBtn() {
  pressedBtn.value = null
}

function setPressedMenuBtn(key: string) {
  pressedMenuBtn.value = key
}

function clearPressedMenuBtn() {
  pressedMenuBtn.value = null
}

const soundEnabled = ref(localStorage.getItem('sound_off') !== '1')

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  if (soundEnabled.value) {
    localStorage.removeItem('sound_off')
  } else {
    localStorage.setItem('sound_off', '1')
  }
  mahjongSound.syncSoundEnabled()
}

const startAutoSpin = () => {
  if (!canUseAutoSpin.value) return
  autoSpinCount.value = selectedAutoSpinCount.value
  closePopup()
  if (!isSpinning.value) {
    handleSpinClick()
  }
}

const stopAutoSpin = () => {
  autoSpinCount.value = 0
}

const handleAutoBtnClick = () => {
  if (autoSpinCount.value > 0) {
    stopAutoSpin()
    return
  }
  if (!canUseAutoSpin.value) return
  togglePopup('auto')
}

const checkNextAutoSpin = () => {
  if (isFreeSpinMode.value && freeSpinsRemaining.value > 0) return
  if (autoSpinCount.value > 0) {
    autoSpinCount.value--
    if (autoSpinCount.value > 0 && balance.value >= betAmount.value) {
      setTimeout(() => {
        handleSpinClick()
      }, 500)
    } else {
      autoSpinCount.value = 0
    }
  }
}

// 赔付表 / 规则弹窗
const infoSheetVisible = ref(false)
const infoSheetTab = ref<'pay' | 'rules'>('pay')
const openInfoSheet = (tab: 'pay' | 'rules') => {
  infoSheetTab.value = tab
  infoSheetVisible.value = true
  showMenuPage.value = false
}

// 免费旋转（官方：3 胡 = 12 次，每多 1 个 +2）
const isFreeSpinMode = ref(false)
const freeSpinsRemaining = ref(0)
/** 触发免费旋转时锁定的投注额（整段免费功能共用） */
const freeSpinBetAmount = ref(0)
/** 当前免费旋转功能累计赢分（整段功能共用，供 HUD / 结束弹窗） */
const freeSpinSessionWin = ref(0)
/** 本段免费功能已完成的旋转次数 */
const freeSpinTotalSpinsPlayed = ref(0)
/** 当前这一转是否属于免费旋转（用于最后一转仍按 ×2~×10 结算） */
const isActiveFreeSpinSpin = ref(false)
const freeSpinTriggerVisible = ref(false)
const freeSpinTriggerData = ref<{
  scatterCount: number
  spinsAwarded: number
  isRetrigger: boolean
} | null>(null)
const freeSpinEndVisible = ref(false)
const freeSpinEndSnapshot = ref({ totalWin: 0, spinsPlayed: 0 })
const scatterCelebratingCells = ref(new Set<string>())
let freeSpinTriggerResolve: (() => void) | null = null
let freeSpinEndResolve: (() => void) | null = null
let freeSpinChainTimer: ReturnType<typeof setTimeout> | null = null
const spinCountBumpToken = ref(0)
const spinCountBumpActive = ref(false)
const spinRetriggerFlash = ref(0)

/** 中间旋转钮计数：仅自动旋转（免费旋转走底栏替换面板） */
const centerSpinCount = computed(() => {
  if (autoSpinCount.value > 0) return autoSpinCount.value
  return 0
})

const showCenterSpinCount = computed(() => centerSpinCount.value > 0)

/** 免费旋转进行中：正版底栏替换（隐藏 turbo/±/旋转/自动/菜单） */
const showFsBottomPanel = computed(
  () =>
    isFreeSpinMode.value &&
    freeSpinsRemaining.value > 0 &&
    !freeSpinTriggerVisible.value &&
    !freeSpinEndVisible.value,
)

const isLastFreeSpinLabel = computed(() => freeSpinsRemaining.value === 1)

/** 正版 free_spins/zh 图集裁切，底栏居中区 */
const fsBottomLayout = {
  panel: { leftPct: 6, topPct: 74.2, widthPct: 88, heightPct: 9.2 },
} as const

const fsCountChars = computed(() => String(freeSpinsRemaining.value).split(''))
const fsCountBumpToken = ref(0)
const fsCountBumpActive = ref(false)

watch(freeSpinsRemaining, (next, prev) => {
  if (!showFsBottomPanel.value || next <= 1 || next === prev) return
  fsCountBumpToken.value++
  fsCountBumpActive.value = false
  requestAnimationFrame(() => {
    fsCountBumpActive.value = true
    setTimeout(() => {
      fsCountBumpActive.value = false
    }, 620)
  })
})

const fsCountDigitPx = computed(() =>
  Math.max(22, Math.round(gameRenderHeight.value * 5.6 / 100)),
)

function fsCountDigitStyle(digit: string): Record<string, string> {
  const atlas = pgUi('spin-count-digits') ?? pgUi('win-digits')
  const base = digitSpriteStyle(digit, fsCountDigitPx.value, atlas)
  if (!Object.keys(base).length) return {}
  return {
    ...base,
    filter: 'drop-shadow(0 2px 5px rgba(0, 0, 0, 0.6))',
  }
}

const spinHolderBox = computed(() =>
  showCenterSpinCount.value ? pgSpin.countHolder : pgSpin.holder,
)

function triggerSpinCountBump() {
  spinCountBumpToken.value++
  spinCountBumpActive.value = false
  requestAnimationFrame(() => {
    spinCountBumpActive.value = true
    setTimeout(() => {
      spinCountBumpActive.value = false
    }, 620)
  })
}

watch(centerSpinCount, (next, prev) => {
  if (next > 0 && next !== prev) triggerSpinCountBump()
})

const spinCountChars = computed(() => String(centerSpinCount.value).split(''))

const viewportSize = ref({
  w: typeof window !== 'undefined' ? window.innerWidth : CANVAS_W,
  h: typeof window !== 'undefined' ? window.innerHeight : CANVAS_H,
})

/** 画布实际渲染高度（与 canvasBoxStyle 一致） */
const gameRenderHeight = computed(() => {
  const { w, h } = viewportSize.value
  return Math.min(h, w * (CANVAS_H / CANVAS_W))
})

const gameRenderWidth = computed(() => {
  const { w, h } = viewportSize.value
  return Math.min(w, h * (CANVAS_W / CANVAS_H))
})

/** Cocos numberSprite heightPct 3.239 → 像素高度 */
const spinCountDigitPx = computed(() =>
  Math.max(16, Math.round(gameRenderHeight.value * 3.239 / 100)),
)

function spinCountDigitStyle(digit: string): Record<string, string> {
  const atlas = pgUi('spin-count-digits') ?? pgUi('win-digits')
  const base = digitSpriteStyle(digit, spinCountDigitPx.value, atlas)
  if (!Object.keys(base).length) return {}
  return {
    ...base,
    filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.55))',
  }
}
const retriggerBannerCount = ref(0)
const boardShaking = ref(false)
let retriggerBannerTimer: ReturnType<typeof setTimeout> | null = null

const triggerBoardShake = () => {
  boardShaking.value = true
  setTimeout(() => {
    boardShaking.value = false
  }, isTurbo.value ? 220 : 380)
}

const showRetriggerBanner = (count: number) => {
  if (count <= 0) return
  if (retriggerBannerTimer) {
    clearTimeout(retriggerBannerTimer)
    retriggerBannerTimer = null
  }
  retriggerBannerCount.value = count
  retriggerBannerTimer = setTimeout(() => {
    retriggerBannerCount.value = 0
    retriggerBannerTimer = null
  }, 2800)
}

/** 开发预览：快捷键弹出免费旋转 UI，不影响真实对局数据 */
const isFsUiPreview = ref(false)

interface FsPreviewRestore {
  isFreeSpinMode: boolean
  freeSpinsRemaining: number
  freeSpinBetAmount: number
  freeSpinSessionWin: number
  freeSpinTotalSpinsPlayed: number
}

let fsPreviewRestore: FsPreviewRestore | null = null

const closeFsUiPreview = () => {
  if (!isFsUiPreview.value) return
  freeSpinTriggerVisible.value = false
  freeSpinEndVisible.value = false
  freeSpinTriggerData.value = null
  scatterCelebratingCells.value.clear()
  isFsUiPreview.value = false
  if (fsPreviewRestore) {
    isFreeSpinMode.value = fsPreviewRestore.isFreeSpinMode
    freeSpinsRemaining.value = fsPreviewRestore.freeSpinsRemaining
    freeSpinBetAmount.value = fsPreviewRestore.freeSpinBetAmount
    freeSpinSessionWin.value = fsPreviewRestore.freeSpinSessionWin
    freeSpinTotalSpinsPlayed.value = fsPreviewRestore.freeSpinTotalSpinsPlayed
    fsPreviewRestore = null
  }
}

const openFsUiPreview = (mode: 'trigger' | 'retrigger' | 'end') => {
  if (!import.meta.env.DEV) return
  closeFsUiPreview()
  closePopup()
  infoSheetVisible.value = false
  showHistoryModal.value = false
  showMenuPage.value = false
  clearFreeSpinChainTimer()

  fsPreviewRestore = {
    isFreeSpinMode: isFreeSpinMode.value,
    freeSpinsRemaining: freeSpinsRemaining.value,
    freeSpinBetAmount: freeSpinBetAmount.value,
    freeSpinSessionWin: freeSpinSessionWin.value,
    freeSpinTotalSpinsPlayed: freeSpinTotalSpinsPlayed.value,
  }
  isFsUiPreview.value = true

  if (mode === 'end') {
    isFreeSpinMode.value = true
    freeSpinBetAmount.value = betAmount.value
    freeSpinSessionWin.value = 8888.88
    freeSpinTotalSpinsPlayed.value = 12
    freeSpinsRemaining.value = 0
    freeSpinEndSnapshot.value = { totalWin: 8888.88, spinsPlayed: 12 }
    freeSpinEndVisible.value = true
    return
  }

  if (mode === 'retrigger') {
    isFreeSpinMode.value = true
    freeSpinsRemaining.value = 13
    freeSpinBetAmount.value = betAmount.value
    freeSpinSessionWin.value = 1288.5
    freeSpinTriggerData.value = {
      scatterCount: 5,
      spinsAwarded: 16,
      isRetrigger: true,
    }
    scatterCelebratingCells.value = new Set(['0-2', '1-3', '2-1', '3-4', '4-2'])
    showRetriggerBanner(16)
    triggerBoardShake()
  } else {
    enterFreeSpinFeature()
    freeSpinsRemaining.value = 0
    freeSpinTriggerData.value = {
      scatterCount: 3,
      spinsAwarded: 12,
      isRetrigger: false,
    }
  }
  freeSpinTriggerVisible.value = true
}

/** 开发：预览级联消除火焰 + 粒子（Alt+4） */
const previewCascadeFx = async () => {
  if (!import.meta.env.DEV) return
  if (isSpinning.value || isResolving.value) return
  const demoKeys = ['0-2', '1-2', '2-2', '3-2', '4-2', '1-3', '2-3', '3-3']
  await showWinHighlight(
    demoKeys.map((k) => {
      const [col, row] = k.split('-').map(Number)
      return { col: col!, row: row! }
    }),
    0,
  )
  explodingCells.value = new Set(demoKeys)
  triggerBoardShake()
  await sleep(isTurbo.value ? 200 : 380)
  explodingCells.value.clear()
  winningCells.value.clear()
}

const onFsPreviewKeydown = (event: KeyboardEvent) => {
  if (!import.meta.env.DEV) return
  if (!event.altKey || event.ctrlKey || event.metaKey) {
    if (event.key === 'Escape' && isFsUiPreview.value) {
      event.preventDefault()
      closeFsUiPreview()
    }
    return
  }
  if (event.key === '1') {
    event.preventDefault()
    openFsUiPreview('trigger')
  } else if (event.key === '2') {
    event.preventDefault()
    openFsUiPreview('retrigger')
  } else if (event.key === '3') {
    event.preventDefault()
    openFsUiPreview('end')
  } else if (event.key === '4') {
    event.preventDefault()
    previewCascadeFx()
  } else if (event.key === 'l' || event.key === 'L') {
    event.preventDefault()
    layoutDebug.value = !layoutDebug.value
  }
}

const clearFreeSpinChainTimer = () => {
  if (freeSpinChainTimer) {
    clearTimeout(freeSpinChainTimer)
    freeSpinChainTimer = null
  }
}

const scheduleNextFreeSpin = () => {
  clearFreeSpinChainTimer()
  freeSpinChainTimer = setTimeout(() => {
    freeSpinChainTimer = null
    handleSpinClick({ fromFreeSpinChain: true })
  }, isTurbo.value ? 400 : 800)
}

/** 整段免费功能进行中（含弹窗、最后一转间隙、结束总结） */
const isInFreeSpinFeature = computed(
  () =>
    isFreeSpinMode.value &&
    (freeSpinsRemaining.value > 0 ||
      isActiveFreeSpinSpin.value ||
      freeSpinTriggerVisible.value ||
      freeSpinEndVisible.value),
)

const hasFreeSpinBgAsset = computed(() => hasPgUi('multiplier-bar-bg-free'))

/** 全屏视口底图：专属封面2（#background-img / launch.jpg 同源） */
const pageBgUrl = computed(() => pgUi('cover-bottom-bg'))
/** 符号说明弹层仍用画布内 bg-base */
const symbolInfoBgUrl = computed(() => pgUi('bg-base'))
const activeBgUrl = computed(() => symbolInfoBgUrl.value)

/** 免费局由系统自动连转，按钮仅展示状态 */
const isFreeSpinAutoPlaying = computed(
  () =>
    isFreeSpinMode.value &&
    freeSpinsRemaining.value > 0 &&
    !isSpinning.value &&
    !isResolving.value &&
    !freeSpinTriggerVisible.value &&
    !freeSpinEndVisible.value,
)

const isSpinControlDisabled = computed(
  () =>
    isSpinning.value ||
    isResolving.value ||
    freeSpinTriggerVisible.value ||
    freeSpinEndVisible.value ||
    isFreeSpinAutoPlaying.value,
)

/** 免费旋转进行中不可改投注 */
const canAdjustBet = computed(
  () => !isInFreeSpinFeature.value && !isSpinning.value && !isResolving.value,
)

/** 免费旋转进行中不可开启自动旋转 */
const canUseAutoSpin = computed(
  () => !isInFreeSpinFeature.value && !isSpinning.value && !isResolving.value,
)

const hudBetDisplay = computed(() =>
  isInFreeSpinFeature.value && freeSpinBetAmount.value > 0
    ? freeSpinBetAmount.value
    : betAmount.value,
)

/** 格式化金额：千位分隔符 + 两位小数（如原版 ¥100,000.00） */
function fmtAmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 免费局 HUD 奖金：已完成转累计 + 当前转进行中的赢分 */
const hudWinDisplay = computed(() =>
  isInFreeSpinFeature.value
    ? freeSpinSessionWin.value + winAmount.value
    : winAmount.value,
)

/**
 * 信息栏框三档（对照 Cocos dump）：
 *   0 = 普通旋转 → normal_frontBoard (infoboard_a) 金框
 *       · win=0  → ticker 滚动（message/info2 active）
 *       · win>0  → 第1次连击「赢得 XX」，第2次起「共赢得 XX」
 *   1 = 免费旋转模式 → bonus_frontBoard (infoboard_b) 绿框
 *       · win>0  → 同上（连击标签逻辑一致）
 *   2 = 大赢（win ≥ 50×bet）→ medium_winboard (infoboard_c) 紫框
 *       · 覆盖在底框之上，标签随连击次数切换
 */
/** 将赢钱金额拆为字符数组（用于精灵数字渲染） */
const infoboardWinChars = computed(() => {
  const s = hudWinDisplay.value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return s.split('')
})

/** 连击第 2 次起显示「共赢得」（单次旋转内） */
const infoboardWinIsTotal = ref(false)

/**
 * Cocos worldPct（相对整屏）：win_info 5.208% / numberSprite 4.156%，垂直中线对齐。
 */
const INFOBOARD_LABEL_H_PCT = 5.208
const INFOBOARD_DIGIT_H_PCT = 4.156
const INFOBOARD_WIN_SCALE = 0.9

const infoboardWinMetrics = computed(() => {
  const scale = INFOBOARD_WIN_SCALE
  const labelPx = Math.max(16, Math.round(gameRenderHeight.value * INFOBOARD_LABEL_H_PCT / 100 * scale))
  const digitPx = Math.max(14, Math.round(gameRenderHeight.value * INFOBOARD_DIGIT_H_PCT / 100 * scale))
  return { labelPx, digitPx }
})

const infoboardWinContentStyle = computed(() => ({
  '--win-label-h': `${infoboardWinMetrics.value.labelPx}px`,
  '--win-digit-h': `${infoboardWinMetrics.value.digitPx}px`,
}))

function winDigitClass(ch: string): string {
  if (ch === '.') return 'win-digit-dot'
  if (ch === ',') return 'win-digit-comma'
  return `win-digit-${ch}`
}

function winDigitStyle(digit: string): Record<string, string> {
  return digitSpriteStyle(
    digit,
    infoboardWinMetrics.value.digitPx,
    pgUi('win-digits'),
    pgUi('win-digit-dot'),
    pgUi('win-digit-comma'),
  )
}

const infoBoardStage = computed<0 | 1 | 2>(() => {
  // 大赢阈值：≥ 50 倍下注 → 紫框
  const win = hudWinDisplay.value
  const bet = hudBetDisplay.value
  if (win > 0 && bet > 0 && win >= bet * 50) return 2
  // 免费旋转模式 → 绿框
  if (isFreeSpinMode.value) return 1
  // 普通旋转 → 金框（win=0 ticker，win>0 赢钱）
  return 0
})

/** 普通模式 3 条轮播（正版 atlas PNG，含百搭/胡图标） */
const AD_MSGS = [
  { key: 'info2-msg1', imgW: 434, imgH: 62 },  // 赢得高达1024路！
  { key: 'info2-msg2', imgW: 724, imgH: 84 },  // 获得镀金符号，有机会赢得百搭
  { key: 'info2-msg3', imgW: 928, imgH: 74 },  // 3个或更多胡奖励12次或更多免费旋转
] as const
/** 免费旋转模式单条 */
const FS_MSG = { key: 'info2-msg4', imgW: 936, imgH: 72 } // 在免费旋转中，赢得高达10倍奖金倍数！

const currentAdMsgUrl = computed(() => {
  const key = isFreeSpinMode.value ? FS_MSG.key : AD_MSGS[adMsgIdx.value].key
  return pgUi(key)
})

const adMsgIdx = ref(0)
const adMsgAnimKey = ref(0)
const adMsgContainerRef = ref<HTMLElement | null>(null)
const adMsgIsFit = ref(true)
const adMsgScrollDur = ref('8s')

function refreshAdMsgState() {
  const el = adMsgContainerRef.value
  const containerW = el?.clientWidth ?? 411
  const containerH = el?.clientHeight ?? 38
  const msg = isFreeSpinMode.value ? FS_MSG : AD_MSGS[adMsgIdx.value]
  const displayW = (msg.imgW / msg.imgH) * containerH
  adMsgIsFit.value = displayW <= containerW
  adMsgScrollDur.value = `${(displayW / 70).toFixed(1)}s`
}

function onAdMsgAnimEnd() {
  if (!isFreeSpinMode.value) {
    adMsgIdx.value = (adMsgIdx.value + 1) % AD_MSGS.length
  }
  adMsgAnimKey.value++
  nextTick(refreshAdMsgState)
}

watch(isFreeSpinMode, () => {
  if (!isFreeSpinMode.value) adMsgIdx.value = 0
  adMsgAnimKey.value++
  nextTick(refreshAdMsgState)
})

const effectiveSpinBet = computed(() =>
  isActiveFreeSpinSpin.value && freeSpinBetAmount.value > 0
    ? freeSpinBetAmount.value
    : betAmount.value,
)

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** PG 式中奖高亮：火焰脉冲 → 消除 */
const showWinHighlight = async (winCells: GridPos[], cascadeStep = 0) => {
  if (!winCells.length) return
  mahjongSound.playWin(
    cascadeStep,
    getWinAnnounceSymbol(gridData.value),
    isActiveFreeSpinSpin.value,
  )
  winningCells.value = new Set(winCells.map(({ col, row }) => `${col}-${row}`))
  triggerBoardShake()
  const timings = isTurbo.value ? CASCADE_ANIM.turbo : CASCADE_ANIM.normal
  await sleep(timings.win)
}

/** 首次 Scatter：立刻锁注并进入免费局 UI（弹窗叠在上面） */
const enterFreeSpinFeature = () => {
  if (isFreeSpinMode.value) return
  freeSpinBetAmount.value = betAmount.value
  freeSpinSessionWin.value = 0
  freeSpinTotalSpinsPlayed.value = 0
  autoSpinCount.value = 0
  activeMultiplierIndex.value = 0
  isFreeSpinMode.value = true
}

const addFreeSpinsFromTrigger = (scatterCount: number) => {
  const added = freeSpinsFromScatters(scatterCount)
  if (added <= 0) return 0
  freeSpinsRemaining.value += added
  return added
}

const showFreeSpinTrigger = (scatterCount: number): Promise<void> => {
  const spinsAwarded = freeSpinsFromScatters(scatterCount)
  if (spinsAwarded <= 0) return Promise.resolve()

  const isRetrigger = isFreeSpinMode.value

  // PG：首次触发立刻锁注 + 切免费局视觉，庆祝弹窗叠层
  if (!isRetrigger) {
    enterFreeSpinFeature()
    mahjongSound.playFreeSpinEnter()
  }
  mahjongSound.playScatterTrigger(isRetrigger)

  const cells = getScatterCells(gridData.value)
  scatterCelebratingCells.value = new Set(cells.map(({ col, row }) => `${col}-${row}`))
  if (isRetrigger) {
    showRetriggerBanner(spinsAwarded)
    triggerBoardShake()
  }
  freeSpinTriggerData.value = {
    scatterCount,
    spinsAwarded,
    isRetrigger,
  }
  freeSpinTriggerVisible.value = true

  return new Promise((resolve) => {
    freeSpinTriggerResolve = resolve
  })
}

const dismissFreeSpinTrigger = () => {
  if (!freeSpinTriggerVisible.value) return
  const data = freeSpinTriggerData.value
  freeSpinTriggerVisible.value = false
  scatterCelebratingCells.value.clear()
  freeSpinTriggerData.value = null
  if (isFsUiPreview.value) {
    isFsUiPreview.value = false
    if (fsPreviewRestore) {
      isFreeSpinMode.value = fsPreviewRestore.isFreeSpinMode
      freeSpinsRemaining.value = fsPreviewRestore.freeSpinsRemaining
      freeSpinBetAmount.value = fsPreviewRestore.freeSpinBetAmount
      freeSpinSessionWin.value = fsPreviewRestore.freeSpinSessionWin
      freeSpinTotalSpinsPlayed.value = fsPreviewRestore.freeSpinTotalSpinsPlayed
      fsPreviewRestore = null
    }
    freeSpinTriggerResolve?.()
    freeSpinTriggerResolve = null
    return
  }
  if (data) {
    const wasRetrigger = data.isRetrigger
    const added = addFreeSpinsFromTrigger(data.scatterCount)
    if (wasRetrigger && added > 0) {
      spinRetriggerFlash.value = added
      setTimeout(() => {
        spinRetriggerFlash.value = 0
      }, 900)
    }
  }
  freeSpinTriggerResolve?.()
  freeSpinTriggerResolve = null
}

const showFreeSpinEndSummary = (): Promise<void> => {
  if (freeSpinEndVisible.value) return Promise.resolve()
  mahjongSound.playFreeSpinEnd()
  freeSpinEndSnapshot.value = {
    totalWin: freeSpinSessionWin.value,
    spinsPlayed: freeSpinTotalSpinsPlayed.value,
  }
  freeSpinEndVisible.value = true
  clearFreeSpinChainTimer()
  return new Promise((resolve) => {
    freeSpinEndResolve = resolve
  })
}

const dismissFreeSpinEndSummary = () => {
  if (!freeSpinEndVisible.value) return
  freeSpinEndVisible.value = false
  if (isFsUiPreview.value) {
    isFsUiPreview.value = false
    if (fsPreviewRestore) {
      isFreeSpinMode.value = fsPreviewRestore.isFreeSpinMode
      freeSpinsRemaining.value = fsPreviewRestore.freeSpinsRemaining
      freeSpinBetAmount.value = fsPreviewRestore.freeSpinBetAmount
      freeSpinSessionWin.value = fsPreviewRestore.freeSpinSessionWin
      freeSpinTotalSpinsPlayed.value = fsPreviewRestore.freeSpinTotalSpinsPlayed
      fsPreviewRestore = null
    }
    freeSpinEndResolve?.()
    freeSpinEndResolve = null
    return
  }
  finalizeFreeSpinSession()
  freeSpinEndResolve?.()
  freeSpinEndResolve = null
}

const finalizeFreeSpinSession = () => {
  isFreeSpinMode.value = false
  freeSpinBetAmount.value = 0
  freeSpinSessionWin.value = 0
  freeSpinTotalSpinsPlayed.value = 0
  clearFreeSpinChainTimer()
}

const completeFreeSpinRound = () => {
  if (!isActiveFreeSpinSpin.value) return
  isActiveFreeSpinSpin.value = false
  freeSpinsRemaining.value = Math.max(0, freeSpinsRemaining.value - 1)
  freeSpinTotalSpinsPlayed.value += 1
}

const finishRound = () => {
  historyRecords.value.unshift({
    id: currentRecordId.value,
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    bet: isActiveFreeSpinSpin.value ? 0 : betAmount.value,
    profit: winAmount.value,
  })
  checkNextAutoSpin()
}

/** 官方级联：中奖 → 结算 → 镀金转百搭 → 消除下落 → 连击倍数递增 */
const runCascadeResolution = async () => {
  isResolving.value = true
  infoboardWinIsTotal.value = false
  let cascadeStep = 0
  let totalScatter = 0

  while (true) {
    activeMultiplierIndex.value = Math.min(cascadeStep, 3)

    const { totalWin, winCells, scatterCount } = evaluateWins(
      gridData.value,
      effectiveSpinBet.value,
      cascadeStep,
      isActiveFreeSpinSpin.value,
    )
    totalScatter = Math.max(totalScatter, scatterCount)

    if (totalWin <= 0 || winCells.length === 0) break

    infoboardWinIsTotal.value = cascadeStep >= 1

    winAmount.value += totalWin
    balance.value += totalWin
    if (isActiveFreeSpinSpin.value) {
      freeSpinSessionWin.value += totalWin
    }

    await showWinHighlight(winCells, cascadeStep)

    const timings = isTurbo.value ? CASCADE_ANIM.turbo : CASCADE_ANIM.normal
    const toRemove = getCellsToRemove(gridData.value, winCells)

    const goldenKeys = winCells
      .filter(({ col, row }) => {
        const cell = gridData.value[col][row]
        return cell?.isGolden && isPaySymbol(cell.symbol)
      })
      .map(({ col, row }) => `${col}-${row}`)

    if (goldenKeys.length) {
      transformingCells.value = new Set(goldenKeys)
      const transformMid = Math.floor(timings.transform / 2)
      setTimeout(() => applyGoldenToWild(gridData.value, winCells), transformMid)
      await sleep(timings.transform)
      transformingCells.value.clear()
    }

    explodingCells.value = new Set(toRemove.map(({ col, row }) => `${col}-${row}`))
    triggerBoardShake()
    await sleep(timings.dissolve)

    explodingCells.value.clear()
    winningCells.value.clear()

    const motions = computeTileDropMotions(toRemove, timings.colStagger)
    dropAndRefill(gridData.value, toRemove)
    tileDropMotions.value = motions
    await nextTick()

    const maxColDelay = (COLS - 1) * timings.colStagger
    await sleep(timings.drop + maxColDelay)

    tileDropMotions.value.clear()

    cascadeStep++
  }

  await showBigWinIfNeeded(winAmount.value)

  isResolving.value = false
  finishRound()
  completeFreeSpinRound()

  const willRetrigger = totalScatter >= 3
  if (willRetrigger) {
    await showFreeSpinTrigger(totalScatter)
  }

  if (isFreeSpinMode.value && freeSpinsRemaining.value <= 0) {
    await showFreeSpinEndSummary()
  } else if (
    isFreeSpinMode.value &&
    freeSpinsRemaining.value > 0 &&
    !freeSpinTriggerVisible.value &&
    !freeSpinEndVisible.value
  ) {
    scheduleNextFreeSpin()
  }
}

// 旋转状态
const isSpinning = ref(false)

// 极速模式状态
const isTurbo = ref(false)
const toggleTurbo = () => {
  if (isSpinning.value) return // 旋转中不允许切换
  isTurbo.value = !isTurbo.value
}

// 投注逻辑
const betSizes = [0.01, 0.03, 0.10, 1.00, 5.00]
const betMultipliers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const baseBet = BASE_BET

const validCombinations = []
for(let s=0; s<betSizes.length; s++) {
  for(let m=0; m<betMultipliers.length; m++) {
    validCombinations.push({
      sizeIdx: s,
      multIdx: m,
      total: betSizes[s] * betMultipliers[m] * baseBet
    })
  }
}
validCombinations.sort((a, b) => a.total - b.total)
const validTotals = Array.from(new Set(validCombinations.map(c => c.total))).sort((a,b) => a-b)

const currentSizeIdx = ref(1) // 默认 0.03
const currentMultIdx = ref(2) // 默认 3

const betAmount = computed(() => betSizes[currentSizeIdx.value] * betMultipliers[currentMultIdx.value] * baseBet)
const currentTotalIdx = computed(() => validTotals.indexOf(betAmount.value))

const BET_WHEEL_OFFSETS = [-2, -1, 0, 1, 2] as const
const betSnapshot = ref({ sizeIdx: 1, multIdx: 2 })
const isBetPopupDisabled = computed(() => isSpinning.value || isResolving.value || !canAdjustBet.value)

const isWheelIndexValid = (currentIdx: number, offset: number, length: number) => {
  const idx = currentIdx + offset
  return idx >= 0 && idx < length
}

const wheelItemClass = (offset: number, currentIdx: number, length: number) => ({
  'is-active': offset === 0,
  'fade-1': Math.abs(offset) === 1,
  'fade-2': Math.abs(offset) === 2,
  'is-empty': !isWheelIndexValid(currentIdx, offset, length),
})

const applyComboByTotal = (total: number) => {
  const combo = validCombinations.find((c) => Math.abs(c.total - total) < 0.001)
  if (combo) {
    currentSizeIdx.value = combo.sizeIdx
    currentMultIdx.value = combo.multIdx
  }
}

const selectSizeByOffset = (offset: number) => {
  const next = currentSizeIdx.value + offset
  if (next >= 0 && next < betSizes.length) currentSizeIdx.value = next
}

const selectMultByOffset = (offset: number) => {
  const next = currentMultIdx.value + offset
  if (next >= 0 && next < betMultipliers.length) currentMultIdx.value = next
}

const selectTotalByOffset = (offset: number) => {
  if (!canAdjustBet.value) return
  const next = currentTotalIdx.value + offset
  if (next >= 0 && next < validTotals.length) applyComboByTotal(validTotals[next])
}

const formatSizeWheelLabel = (offset: number) => {
  const idx = currentSizeIdx.value + offset
  return idx >= 0 && idx < betSizes.length ? `¥${betSizes[idx].toFixed(2)}` : '—'
}

const formatMultWheelLabel = (offset: number) => {
  const idx = currentMultIdx.value + offset
  return idx >= 0 && idx < betMultipliers.length ? String(betMultipliers[idx]) : '—'
}

const formatTotalWheelLabel = (offset: number) => {
  const idx = currentTotalIdx.value + offset
  return idx >= 0 && idx < validTotals.length ? `¥${validTotals[idx].toFixed(2)}` : '—'
}

const setMinBet = () => applyComboByTotal(validTotals[0])
const setMaxBet = () => applyComboByTotal(validTotals[validTotals.length - 1])

const increaseBet = () => selectTotalByOffset(1)
const decreaseBet = () => selectTotalByOffset(-1)

// 金额状态：进页同步服务端余额；局内本地演示扣派，离页再拉真余额
const walletStore = useWalletStore()
const balance = ref(0)
const winAmount = ref(0.00)

// 历史记录数据结构
interface GameRecord {
  id: string;
  time: string;
  bet: number;
  profit: number;
}
const historyRecords = ref<GameRecord[]>([])
const showHistoryModal = ref(false)

const winSummary = computed(() => {
  const records = historyRecords.value
  return {
    count: records.length,
    winCount: records.filter((r) => r.profit > 0).length,
    totalProfit: records.reduce((sum, r) => sum + r.profit, 0),
  }
})

// 生成一些初始的假数据，让列表看起来有内容
for(let i=0; i<15; i++) {
  const isWin = Math.random() > 0.6;
  const dummyWin = isWin ? (Math.random() * 100 + 20) : 0;
  historyRecords.value.push({
    id: 'TXN' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
    time: new Date(Date.now() - i * 60000).toLocaleTimeString('zh-CN', { hour12: false }),
    bet: 20.00,
    profit: dummyWin
  })
}

const currentRecordId = ref('')

// 底部上拉框状态 (wallet, bet, win)
const activePopup = ref<string | null>(null)
const togglePopup = (type: string) => {
  if (type === 'bet' && !canAdjustBet.value) return
  if (type === 'auto' && !canUseAutoSpin.value) return
  if (activePopup.value === type) {
    if (type === 'bet') cancelBetPopup()
    else activePopup.value = null
    return
  }
  if (type === 'bet') {
    betSnapshot.value = { sizeIdx: currentSizeIdx.value, multIdx: currentMultIdx.value }
  }
  activePopup.value = type
}
const closePopup = () => {
  activePopup.value = null
}
const cancelBetPopup = () => {
  currentSizeIdx.value = betSnapshot.value.sizeIdx
  currentMultIdx.value = betSnapshot.value.multIdx
  closePopup()
}
const confirmBetPopup = () => {
  closePopup()
}
const openFullHistory = () => {
  showHistoryModal.value = true
  closePopup()
}

const isSheetPopup = computed(() => ['bet', 'wallet', 'win'].includes(activePopup.value ?? ''))

interface SelectedTileInfo {
  col: number
  row: number
  symbol: MahjongSymbolId
  isGolden: boolean
}

const selectedTile = ref<SelectedTileInfo | null>(null)
const selectedTileAnchor = ref<TileAnchor | null>(null)

const canClickTiles = computed(
  () =>
    !isSpinning.value &&
    !isResolving.value &&
    !activePopup.value &&
    !infoSheetVisible.value &&
    !showHistoryModal.value &&
    !showMenuPage.value &&
    !freeSpinTriggerVisible.value &&
    !freeSpinEndVisible.value,
)

const isTileSelected = (col: number, row: number) =>
  selectedTile.value?.col === col && selectedTile.value?.row === row

const updateTileAnchor = (col: number, row: number) => {
  const el = document.getElementById(`tile-${col}-${row}`)
  const container = document.getElementById('grid-container')
  if (!el || !container) {
    selectedTileAnchor.value = null
    return
  }

  const tileRect = el.getBoundingClientRect()
  const gridRect = container.getBoundingClientRect()
  const tileW = tileRect.width
  const tileH = tileRect.height
  const panelW = tileW * 2.35
  const panelH = tileH

  let x = tileRect.left - gridRect.left + tileW / 2
  let y = tileRect.top - gridRect.top + tileH / 2

  // 上下行微调，避免贴边裁切
  const visibleRow = row - VISIBLE_ROW_INDICES[0]
  if (visibleRow <= 0) y += tileH * 0.08
  else if (visibleRow >= VISIBLE_ROW_INDICES.length - 1) y -= tileH * 0.08

  x = Math.max(panelW / 2 + 2, Math.min(gridRect.width - panelW / 2 - 2, x))
  y = Math.max(panelH / 2 + 2, Math.min(gridRect.height - panelH / 2 - 2, y))

  const gameEl = document.querySelector('.game-container')
  let bgW = gridRect.width
  let bgH = gridRect.height
  let bgPosX = x - panelW / 2
  let bgPosY = y - panelH / 2

  if (gameEl) {
    const gameRect = gameEl.getBoundingClientRect()
    bgW = gameRect.width
    bgH = gameRect.height
    const centerInGameX = tileRect.left - gameRect.left + tileW / 2
    const centerInGameY = tileRect.top - gameRect.top + tileH / 2
    bgPosX = centerInGameX - panelW / 2
    bgPosY = centerInGameY - panelH / 2
  }

  selectedTileAnchor.value = { x, y, w: tileW, h: tileH, bgW, bgH, bgPosX, bgPosY }
}

const clearSelectedTile = () => {
  selectedTile.value = null
  selectedTileAnchor.value = null
}

const onTileClick = async (col: number, row: number) => {
  if (!canClickTiles.value || !isVisibleRow(row)) return
  const cell = gridData.value[col]?.[row]
  if (!cell) return

  if (isTileSelected(col, row)) {
    clearSelectedTile()
    return
  }

  selectedTile.value = {
    col,
    row,
    symbol: cell.symbol,
    isGolden: cell.isGolden,
  }
  await nextTick()
  updateTileAnchor(col, row)
}

watch(isSpinning, (spinning) => {
  if (spinning) clearSelectedTile()
})

watch(isResolving, (resolving) => {
  if (resolving) clearSelectedTile()
})

watch([activePopup, infoSheetVisible, showHistoryModal, showMenuPage], () => {
  clearSelectedTile()
})

watch(isInFreeSpinFeature, () => {
  if (isInFreeSpinFeature.value) {
    if (activePopup.value === 'auto') closePopup()
    if (autoSpinCount.value > 0) autoSpinCount.value = 0
  }
  setupTickerMessage()
})

// 底部走马灯：每条单独配置（不再自动判断）
type TickerSlot = {
  mode: 'center' | 'scroll'
  html: string
  /** 居中句停留时长（ms） */
  centerHoldMs?: number
  /** 长句：先露开头，停顿后再滚（ms） */
  scrollLeadMs?: number
  /** 长句：滚完淡出后，切下一条前的间隔（ms） */
  gapAfterMs?: number
}

const normalTickerSlots: TickerSlot[] = [
  {
    mode: 'center',
    html: '<span class="ticker-line"><span class="ticker-body">赢得高达 </span><span class="ticker-hl">1024</span><span class="ticker-body"> 路！</span></span>',
    centerHoldMs: 3000,
  },
  {
    mode: 'scroll',
    html: '<span class="ticker-line"><span class="ticker-body">获得镀金符号，有机会赢得 </span><span class="ticker-hl">百搭</span></span>',
    scrollLeadMs: 500,
    gapAfterMs: 1000,
  },
  {
    mode: 'scroll',
    html: '<span class="ticker-line"><span class="ticker-body">在免费旋转中，赢得高达 </span><span class="ticker-hl">10</span><span class="ticker-body"> 倍奖金倍数！</span></span>',
    scrollLeadMs: 500,
    gapAfterMs: 1000,
  },
]

const freeSpinTickerSlots = computed((): TickerSlot[] => [
  {
    mode: 'center',
    html: '<span class="ticker-line"><span class="ticker-body">赢得高达 </span><span class="ticker-hl">1024</span><span class="ticker-body"> 路！</span></span>',
    centerHoldMs: 3000,
  },
  {
    mode: 'scroll',
    html: '<span class="ticker-line"><span class="ticker-body">3 个或更多 </span><span class="ticker-hl">胡</span><span class="ticker-body"> 奖励 </span><span class="ticker-hl">12</span><span class="ticker-body"> 次或更多免费旋转</span></span>',
    scrollLeadMs: 500,
    gapAfterMs: 1000,
  },
  {
    mode: 'scroll',
    html: '<span class="ticker-line"><span class="ticker-body">在免费旋转中，赢得高达 </span><span class="ticker-hl">10</span><span class="ticker-body"> 倍奖金倍数！</span></span>',
    scrollLeadMs: 500,
    gapAfterMs: 1000,
  },
])

const activeTickerSlots = computed(() =>
  isInFreeSpinFeature.value ? freeSpinTickerSlots.value : normalTickerSlots,
)

const currentInfoIndex = ref(0)
const tickerMode = ref<'center' | 'scroll'>('center')
const tickerItemRef = ref<HTMLElement | null>(null)
const tickerBarRef = ref<HTMLElement | null>(null)
const tickerItemStyle = ref<Record<string, string>>({})

const currentTickerSlot = computed(() => {
  const slots = activeTickerSlots.value
  if (slots.length === 0) return null
  return slots[currentInfoIndex.value % slots.length] ?? slots[0]
})

const currentMessageHtml = computed(() => currentTickerSlot.value?.html ?? '')

const TICKER_SCROLL_SPEED = 100
let tickerHoldTimer: ReturnType<typeof setTimeout> | null = null
let tickerMarqueeResetting = false

function clearTickerTimers() {
  if (tickerHoldTimer) {
    clearTimeout(tickerHoldTimer)
    tickerHoldTimer = null
  }
}

function advanceTickerMessage() {
  const len = activeTickerSlots.value.length
  if (len <= 0) return
  currentInfoIndex.value = (currentInfoIndex.value + 1) % len
  runTickerForCurrentMessage()
}

function measureScrollTextWidth(el: HTMLElement): number {
  const line = el.querySelector('.ticker-line') as HTMLElement | null
  if (!line) return el.scrollWidth
  return Math.ceil(Math.max(line.scrollWidth, line.getBoundingClientRect().width))
}

function runCenterSlot(slot: TickerSlot) {
  tickerMode.value = 'center'
  tickerItemStyle.value = {}
  const hold = slot.centerHoldMs ?? 3000
  tickerHoldTimer = setTimeout(advanceTickerMessage, hold)
}

function runScrollSlot(slot: TickerSlot) {
  tickerMode.value = 'scroll'
  tickerItemStyle.value = {}

  nextTick(() => {
    void document.fonts.ready.then(() => {
      requestAnimationFrame(() => {
        const el = tickerItemRef.value
        const container = tickerBarRef.value
        if (!el || !container) return

        el.style.animation = 'none'
        el.style.transform = 'translateX(0)'
        void el.offsetWidth

        const textWidth = measureScrollTextWidth(el)
        const containerWidth = container.clientWidth
        const fadeOut = Math.round(containerWidth * 0.12)
        const scrollDistance = Math.max(textWidth - containerWidth + fadeOut, 0)
        const leadMs = slot.scrollLeadMs ?? 500
        const durationSec = Math.max(3, scrollDistance / TICKER_SCROLL_SPEED)

        tickerItemStyle.value = {
          '--ticker-scroll-delay': `${leadMs}ms`,
          '--ticker-duration': `${durationSec}s`,
          '--ticker-travel': `-${scrollDistance}px`,
        }

        tickerMarqueeResetting = true
        void el.offsetWidth
        el.style.animation = ''
        requestAnimationFrame(() => {
          tickerMarqueeResetting = false
        })
      })
    })
  })
}

function runTickerForCurrentMessage() {
  clearTickerTimers()
  const slot = currentTickerSlot.value
  if (!slot) return

  if (slot.mode === 'center') {
    runCenterSlot(slot)
  } else {
    runScrollSlot(slot)
  }
}

function setupTickerMessage() {
  currentInfoIndex.value = 0
  runTickerForCurrentMessage()
}

function onTickerAnimationEnd(e: AnimationEvent) {
  const el = tickerItemRef.value
  const slot = currentTickerSlot.value
  if (!el || !slot || slot.mode !== 'scroll') return
  if (e.target !== el || e.animationName !== 'ticker-marquee-scroll') return
  if (tickerMarqueeResetting) return

  el.style.animation = 'none'
  const gap = slot.gapAfterMs ?? 1000
  tickerHoldTimer = setTimeout(advanceTickerMessage, gap)
}

function onTickerResize() {
  runTickerForCurrentMessage()
}

const syncViewportSize = () => {
  viewportSize.value = { w: window.innerWidth, h: window.innerHeight }
}

onUnmounted(() => {
  mahjongSound.stopAll()
  clearFreeSpinChainTimer()
  clearTickerTimers()
  if (retriggerBannerTimer) {
    clearTimeout(retriggerBannerTimer)
    retriggerBannerTimer = null
  }
  window.removeEventListener('keydown', onFsPreviewKeydown)
  window.removeEventListener('resize', refreshAdMsgState)
  window.removeEventListener('resize', syncViewportSize)
  // 本地演示账不回写服务端
  void walletStore.fetchBalance()
})

onMounted(() => {
  mahjongSound.preload()
  void mahjongSound.startMainBgm()
  syncViewportSize()
  nextTick(refreshAdMsgState)
  window.addEventListener('resize', refreshAdMsgState)
  window.addEventListener('resize', syncViewportSize)
  void walletStore.fetchBalance().then(() => {
    balance.value = walletStore.balance
  })
  if (import.meta.env.DEV) {
    window.addEventListener('keydown', onFsPreviewKeydown)
    console.info(
      '[麻将 DEV] Alt+1 触发 | Alt+2 再触发 | Alt+3 结束 | Alt+4 消除预览 | Alt+L 布局对照框 | Esc 关闭',
    )
  }
})

// 当前激活的乘数 (索引: 0->X1, 1->X2, 2->X3, 3->X5)
const activeMultiplierIndex = ref(0)

const activeMultGlowInBar = computed(() => {
  const frame = L.multBarFrame ?? L.multBar
  if (!frame) return null
  const idx = activeMultiplierIndex.value
  const slots = multSlots.value
  if (idx < 0 || idx >= slots.length) return null
  return glowBoxInFrame(slots[idx].glowBox, glowClipFrame(frame))
})

const activeMultGlowClip = computed(() => {
  const frame = L.multBarFrame ?? L.multBar
  return frame ? glowClipFrame(frame) : null
})

watch(activeMultiplierIndex, () => {
  if (!isResolving.value && !isSpinning.value) return
  multPulseActive.value = true
  setTimeout(() => {
    multPulseActive.value = false
  }, 450)
})

// 官方 MW1 牌面：5 轴 × 6 行（中间 4 行可见区参与中奖）
const gridData = ref<TileCell[][]>(createEmptyGrid())
const spinningCols = ref<TileCell[][]>(Array.from({ length: COLS }, () => []))

const handleSpinClick = (opts?: { fromFreeSpinChain?: boolean }) => {
  if (isSpinning.value || isResolving.value || freeSpinTriggerVisible.value || freeSpinEndVisible.value) {
    return
  }

  const isFreeSpinSpin = isFreeSpinMode.value && freeSpinsRemaining.value > 0
  if (isFreeSpinSpin && !opts?.fromFreeSpinChain) return

  if (isFreeSpinSpin) {
    isActiveFreeSpinSpin.value = true
  } else if (balance.value < betAmount.value) {
    return
  } else {
    balance.value -= betAmount.value
  }
  winAmount.value = 0
  infoboardWinIsTotal.value = false
  activeMultiplierIndex.value = 0
  winningCells.value.clear()
  explodingCells.value.clear()
  transformingCells.value.clear()
  tileDropMotions.value.clear()
  currentRecordId.value = 'TXN' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')

  spinningCols.value = Array.from({ length: COLS }, (_, colIndex) => {
    const currentTiles = gridData.value[colIndex].map((t) => ({ ...t }))
    const finalTiles = rollColumn(colIndex)
    const blurTiles = Array.from({ length: REEL_BLUR_TILE_COUNT }, () => rollTile(colIndex))
    // 正版 slot_scroller：当前 6 行 → blur 条带 → 新结果，从静止位向下滚入
    return [...currentTiles, ...blurTiles, ...finalTiles]
  })

  columnSpinning.value = Array(COLS).fill(true)
  columnReelBounce.value = Array(COLS).fill(false)
  isSpinning.value = true
  mahjongSound.playSpinButtonClick(isTurbo.value)

  const delays = isTurbo.value ? REEL_STOP_DELAYS.turbo : REEL_STOP_DELAYS.normal
  const bounceMs = isTurbo.value ? REEL_BOUNCE_MS.turbo : REEL_BOUNCE_MS.normal
  const totalSpinMs = delays[COLS - 1]! + bounceMs

  setTimeout(async () => {
    for (let col = 0; col < COLS; col++) {
      if (columnSpinning.value[col]) {
        onReelSpinEnd(col)
      }
    }
    isSpinning.value = false
    await runCascadeResolution()
  }, totalSpinMs)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+QingKe+HuangYou&display=swap');

.mahjong-game-page {
  position: fixed;
  inset: 0;
  z-index: 100;
  overflow: hidden;
  background-color: #120a08;
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-bg-fill {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center center;
  pointer-events: none;
  z-index: 0;
}

.mahjong-game-page.is-free-spin-bg {
  background-color: #1a0806;
}

.layer-img--coins-bar {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  object-position: center bottom;
  pointer-events: none;
}

.layer-img--mult-bar {
  object-fit: fill;
  object-position: center center;
}

/* 画布比例由 canvasBoxStyle 绑定正版 design */
.game-container {
  position: relative;
  z-index: 1;
  overflow: hidden;
  color: #fff;
  font-family: 'Segoe UI', system-ui, sans-serif;
  flex-shrink: 0;
  transition: box-shadow 0.45s ease;
}

.game-container.is-free-spin-mode {
  box-shadow:
    inset 0 0 40px rgba(255, 190, 50, 0.06),
    0 0 12px rgba(255, 180, 40, 0.08);
}

.game-container.is-free-spin-mode.is-using-fs-assets {
  box-shadow: none;
}

.layer-base .layer-img--bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transition: filter 0.45s ease;
  object-fit: cover;
  object-position: center top;
}

.layer-base.is-free-spin-mode .layer-img--bg {
  filter: saturate(1.06) brightness(1.03);
}

.layer-base.is-free-spin-mode.is-using-fs-assets .layer-img--bg {
  filter: none;
}

.free-spin-bg-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 88% 58% at 50% 32%, rgba(255, 210, 80, 0.24) 0%, transparent 68%),
    radial-gradient(ellipse 70% 42% at 50% 78%, rgba(180, 60, 20, 0.12) 0%, transparent 72%);
  transition: opacity 0.45s ease;
}

.layer-base.is-free-spin-mode .free-spin-bg-glow {
  opacity: 0.35;
}

.z-message.is-free-spin-mode .layer-img--ribbon {
  filter: saturate(1.04) brightness(1.02);
  transition: filter 0.45s ease;
}

.is-using-fs-assets .z-message.is-free-spin-mode .layer-img--ribbon {
  filter: none;
}

.z-message .layer-img--ribbon {
  transition: filter 0.45s ease;
}

.ticker-fade-enter-active,
.ticker-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.ticker-fade-enter-from,
.ticker-fade-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

/* 通用图层 */
.layer {
  position: absolute;
  left: 0;
  width: 100%;
  pointer-events: none;
}

/* 图层顺序：底图→reel_a绿毡底→牌面→reel_a木框→底木→倍数栏 */
.z-bg { z-index: 1; }
.z-wood-top { z-index: 2; pointer-events: none; background: #6d3f1c; overflow: hidden; }
.z-top-bar-main { z-index: 11; pointer-events: none; }
/* z-reel-green：reel_a 整图，z=3，在牌面下方；木框四边在牌区外侧自然可见 */
.z-reel-green { z-index: 3; pointer-events: none; }
.z-board { z-index: 4; }
.z-wood { z-index: 7; }
/* main_bottom_b：橙色弧形分隔条，盖在木纹上方 */
.z-bottom-bar { z-index: 8; pointer-events: none; }
/* footer_darken：按钮区半透明暗层（Cocos opacity=100/255） */
.z-footer-darken {
  z-index: 12;
  pointer-events: none;
  background: #000;
  opacity: 0.392;
}
/* infoboard_a：深红金边框，套在 HUD 三格外层 */
.z-infoboard { z-index: 9; pointer-events: none; }
/* 广告滚动文字层：定位由 pctLayerStyle 负责，这里只负责裁切 */
.z-infoboard-text {
  z-index: 10;
  pointer-events: none;
  overflow: hidden;
  display: flex;
  align-items: stretch;
}
.z-infoboard-text.is-win-display {
  overflow: visible;
}
/* stage 1/2 赢钱：Cocos win_info + numberSprite 同高区中线对齐 */
.infoboard-win-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0 4%;
}
.infoboard-win-label {
  height: var(--win-label-h);
  width: auto;
  flex-shrink: 0;
  object-fit: contain;
  object-position: center center;
  filter: drop-shadow(0 1px 2px rgba(255, 160, 0, 0.45));
}
.infoboard-win-digits {
  display: inline-flex;
  flex-direction: row;
  align-items: flex-end;
  min-height: var(--win-digit-h);
  height: auto;
  flex-shrink: 0;
  gap: 0;
  overflow: visible;
}
/* 每个精灵数字 span */
.win-digit-sprite {
  display: inline-block;
  flex-shrink: 0;
  line-height: 0;
}
.win-digit-sprite.win-digit-comma {
  position: relative;
  top: 1px;
}

/* ── 广告消息逐条展示（正版 PNG 文案） ─────────────────────────────────── */
.ad-msg-container {
  position: absolute;
  inset: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ad-msg-img.ad-msg-center {
  height: 100%;
  width: auto;
  flex-shrink: 0;
  animation: ad-msg-hold 3.5s linear forwards;
}
@keyframes ad-msg-hold {
  from, to { opacity: 1; }
}

.ad-msg-img.ad-msg-scroll {
  position: absolute;
  left: 0;
  top: 50%;
  transform-origin: left center;
  height: 100%;
  width: auto;
  animation: ad-msg-scroll-out var(--scroll-dur, 8s) linear forwards;
}
@keyframes ad-msg-scroll-out {
  from { transform: translateY(-50%) translateX(0); }
  to   { transform: translateY(-50%) translateX(-100%); }
}

/* reel 顶部暖光晕 —— 模拟正版 reel_glow 火焰粒子向下渐隐的光 */
.z-reel-glow {
  z-index: 6;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 200, 60, 0.28) 0%,
    rgba(255, 160, 30, 0.18) 25%,
    rgba(255, 120, 10, 0.08) 60%,
    transparent 100%
  );
  border-radius: 4px 4px 0 0;
  animation: reel-glow-flicker 2.4s ease-in-out infinite alternate;
}

@keyframes reel-glow-flicker {
  0%   { opacity: 0.6; }
  20%  { opacity: 0.9; }
  45%  { opacity: 0.7; }
  60%  { opacity: 1; }
  80%  { opacity: 0.75; }
  100% { opacity: 0.85; }
}
.z-mult-bar { z-index: 6; }
.z-title1024-layer {
  z-index: 12;
  pointer-events: none;
}

.title-1024-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
  user-select: none;
}

/* 倍数：木纹底(6) → 光晕(7) → 暗刻(8) → 金色(10) → 1024栏(11) → 1024字(12) */
.z-mult-slot--inactive { z-index: 8; pointer-events: none; }
.z-mult-slot--active { z-index: 10; pointer-events: none; }

.mult-slot-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center bottom;
  pointer-events: none;
  user-select: none;
}

/* 未激活：正版暗刻贴图（mult-xN-dark） */
.mult-slot-img--inactive {
  filter: contrast(1.08) saturate(1.05);
  opacity: 1;
  image-rendering: -webkit-optimize-contrast;
}

/* 激活：亮金色（光晕在木条层 z-7，数字在其上） */
.mult-slot-img--active {
  filter: none;
  opacity: 1;
}

.mult-slot-img--active.is-pulsing {
  animation: mult-pulse 0.45s ease-out infinite alternate;
}

.z-mult-glow-mask {
  z-index: 7;
  overflow: hidden;
  pointer-events: none;
}

.mult-glow-inner {
  position: absolute;
  pointer-events: none;
}

.mult-glow-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  object-position: center bottom;
  mix-blend-mode: screen;
  opacity: 0.95;
  pointer-events: none;
  user-select: none;
}
.z-bottom-frame { z-index: 11; }
.z-message { z-index: 12; }
.z-bottom-control { z-index: 13; }
.z-btn-frame { z-index: 14; }
.z-hud { z-index: 15; }
.z-buttons { z-index: 16; }

/* 开发：JSON 区域对照框，不用口述哪里歪了 */
.layout-debug {
  position: absolute;
  inset: 0;
  z-index: 200;
  pointer-events: none;
}

.layout-debug__box {
  position: absolute;
  box-sizing: border-box;
  border: 2px dashed rgba(255, 80, 80, 0.85);
  background: rgba(255, 60, 60, 0.08);
}

.layout-debug__box--bg { border-color: rgba(120, 200, 255, 0.9); background: rgba(80, 160, 255, 0.1); }
.layout-debug__box--board { border-color: rgba(80, 255, 120, 0.9); background: rgba(60, 220, 100, 0.1); }
.layout-debug__box--message { border-color: rgba(255, 220, 80, 0.9); background: rgba(255, 200, 60, 0.1); }
.layout-debug__box--statusHud { border-color: rgba(255, 140, 255, 0.9); background: rgba(220, 100, 255, 0.1); }
.layout-debug__box--spinFrame { border-color: rgba(255, 100, 100, 0.95); background: rgba(255, 60, 60, 0.12); }
.layout-debug__box--btnBar { border-color: rgba(100, 180, 255, 0.9); background: rgba(80, 140, 255, 0.1); }

.layout-debug__label {
  position: absolute;
  top: 0;
  left: 0;
  padding: 1px 4px;
  font-size: 10px;
  line-height: 1.3;
  color: #fff;
  background: rgba(0, 0, 0, 0.72);
  white-space: nowrap;
}

.z-mult-bar {
  overflow: hidden;
  /* main_top_c 底缘半透明，正版叠在木色底上而非 #120a08 */
  background: linear-gradient(180deg, #a86130 0%, #8a4e22 55%, #7a4518 100%);
}

.layer-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

.z-mult-bar.is-free-spin-mode .layer-img {
  filter: saturate(1.04) brightness(1.02);
  transition: filter 0.35s ease;
}

.z-mult-bar.is-free-spin-mode.is-using-fs-assets .layer-img {
  filter: none;
}

.layer-img--ribbon {
  width: 100%;
  height: 100%;
  margin: 0 auto;
  display: block;
  object-fit: contain;
  object-position: center;
}

.layer-base {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #120a08;
}

/* 麻将区：不裁切，依靠 z-index 层级遮盖缓冲行（倍数条 z=6-10，底木 z=7 均高于 z-board=4） */
.layer-board {
  position: absolute;
  overflow: visible;
  pointer-events: none;
}

.layer-board .grid-container {
  pointer-events: auto;
}

/* ⑥ 三格金额栏（正版 live GameInfo 72.69% / 3.59%）────────────────────────── */
.layer-hud__values {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* 每个面板：与原版一致的深暖棕（拾色 #594017 × 0.82 alpha） */
.hud-panel {
  position: absolute;
  top: 0;
  height: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 0 3% 0 1.5%;
  gap: 2%;
  box-sizing: border-box;
  background: rgba(50, 25, 8, 0.82);
  border-radius: 7px;
  overflow: hidden;
  transition: filter 0.15s ease-out;
  pointer-events: auto;
}

/* 三面板精确左/宽定位（来自 Cocos worldPct，已是绝对 %，容器 left=0 width=100%） */
.hud-panel--balance { left: 1.11%; width: 32.22%; }
.hud-panel--bet     { left: 33.89%; width: 32.22%; }
.hud-panel--win     { left: 66.67%; width: 32.22%; }

.hud-panel.clickable { cursor: pointer; }
.hud-panel.clickable:hover  { filter: brightness(1.14); }
.hud-panel.clickable:active { filter: brightness(0.92); transform: scale(0.98); }

.hud-panel.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.hud-panel.is-free-spin-mode {
  background: rgba(50, 25, 8, 0.82);
}

.hud-value-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.hud-value-tag {
  font-size: clamp(7px, 1.3vh, 9px);
  line-height: 1;
  color: rgba(80, 220, 240, 0.85);
  letter-spacing: 0.4px;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
}

.hud-label {
  font-size: clamp(8px, 1.5vh, 11px);
  line-height: 1.1;
  color: rgba(255, 230, 180, 0.82);
  letter-spacing: 0.8px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
}

.layer-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #5c1010 0%, #380808 100%);
  border: 1.5px solid rgba(190, 130, 30, 0.6);
  border-radius: 3px;
  overflow: visible;
  box-shadow:
    inset 0 1px 0 rgba(255, 200, 80, 0.18),
    0 2px 6px rgba(0, 0, 0, 0.4);
}

/* 广告栏两侧铜钱中国结装饰 */
.ribbon-knot {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: clamp(28px, 7.5%, 44px);
  aspect-ratio: 1;
  z-index: 2;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 36%, #ffe580 0%, #d4a030 45%, #9a6800 100%);
  box-shadow:
    0 0 8px rgba(220, 160, 40, 0.75),
    0 2px 4px rgba(0, 0, 0, 0.5),
    inset 0 1px 2px rgba(255, 240, 160, 0.45);
  flex-shrink: 0;
}
.ribbon-knot::before {
  content: '';
  position: absolute;
  inset: 22%;
  border-radius: 50%;
  background: radial-gradient(circle, #8b5e00 0%, #5a3c00 100%);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}
.ribbon-knot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    linear-gradient(0deg, rgba(180, 100, 20, 0.4) 1px, transparent 1px) center/40% 40%,
    linear-gradient(90deg, rgba(180, 100, 20, 0.4) 1px, transparent 1px) center/40% 40%;
  background-repeat: no-repeat;
}
.ribbon-knot--left  { left: 0.8%; }
.ribbon-knot--right { right: 0.8%; }

.layer-copy .info-ticker-bar {
  position: absolute;
  inset: 0 9%;
  overflow: hidden;
  container-type: inline-size;
  --ticker-fade-edge: 10%;
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0%,
    #000 var(--ticker-fade-edge),
    #000 calc(100% - var(--ticker-fade-edge)),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0%,
    #000 var(--ticker-fade-edge),
    #000 calc(100% - var(--ticker-fade-edge)),
    transparent 100%
  );
  -webkit-mask-repeat: no-repeat;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  mask-size: 100% 100%;
}

@keyframes gold-transition-flash {
  0% { filter: brightness(1.3); }
  100% { filter: brightness(1); }
}

/* 麻将滑动区域（layer-board 已定位，此处只保留内部样式） */
.game-board-area {
  /* position 由 .layer-board 控制 */
}

.grid-container {
  display: flex;
  gap: 0;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 2;
  overflow: visible;
  /*
   * 正版 Cocos dump（所有值单位：占整屏 canvas %）：
   *   slot_item 高度   = 13.063 %
   *   slot_item 行距   = 11.803 % （中心间距，tile 略微重叠）
   *   6 行总高         = 5×11.803 + 13.063 = 72.078 %
   *   dark_reel 高度   = 51.282 %
   * → 4 行完全覆盖 dark_reel：4×13.063 = 52.25 ≈ 51.28 ✓
   */
  --pg-tile-pct: 13.063;
  --pg-pitch-pct: 11.803;
  --pg-strip-pct: 72.078;
  --pg-board-pct: 51.139;
  /* 初始偏移 = board顶 - row0顶 = 16.2 - 6.148 = 10.052% (canvas) */
  --pg-scroll-top-pct: 10.052;
  --pg-blur-count: 20;
  --pg-total-rows: 6;
  /*
   * CSS flex 列中 margin-bottom 的 % 解析为宽度而非高度！
   * 需要把 height-based 重叠量(1.26% canvas-h) 换算成 col-width 百分比：
   *   overlap_w% = (tile_h% - pitch_h%) / col_w% × (canvas_H/canvas_W)
   *              = 1.26 / 18.889 × (1031/579) × 100 = 11.882
   */
  --pg-overlap-w: 11.882;
  /* 静止 6 行 / 滚动 [blur×N + final×6] 位移（正版 slot_scroller 公式） */
  --pg-reel-rest-y: calc(-100% * var(--pg-scroll-top-pct) / var(--pg-strip-pct));
  --pg-reel-spin-end-y: calc(
    -100% * (
      (var(--pg-blur-count) + var(--pg-total-rows)) * var(--pg-pitch-pct) + var(--pg-scroll-top-pct)
    ) / var(--pg-strip-pct)
  );
}

.grid-container.is-shaking {
  animation: board-shake 0.36s ease-out;
}

@keyframes board-shake {
  0%, 100% { transform: translate(0, 0); }
  12% { transform: translate(-4px, 2px); }
  28% { transform: translate(4px, -3px); }
  44% { transform: translate(-3px, -2px); }
  60% { transform: translate(3px, 2px); }
  76% { transform: translate(-2px, 1px); }
}

/* 再触发免费局牌面横幅 */
.fs-retrigger-board-banner {
  position: absolute;
  left: 50%;
  top: 42%;
  transform: translate(-50%, -50%);
  z-index: 30;
  pointer-events: none;
}

.fs-retrigger-board-banner__inner {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 10px 22px 12px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 120, 40, 0.96) 0%, rgba(200, 40, 20, 0.94) 100%);
  border: 2px solid rgba(255, 230, 140, 0.95);
  box-shadow:
    0 0 24px rgba(255, 120, 30, 0.85),
    0 4px 12px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 240, 180, 0.5);
  font-family: 'Arial Black', 'ZCOOL QingKe HuangYou', sans-serif;
  color: #fff8dc;
  text-shadow: 0 2px 6px rgba(100, 20, 0, 0.75);
  white-space: nowrap;
  animation: retrigger-banner-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.fs-retrigger-board-banner__plus {
  font-size: clamp(18px, 4.5vw, 28px);
  font-weight: 900;
  color: #ffe680;
}

.fs-retrigger-board-banner__num {
  font-size: clamp(22px, 5.5vw, 34px);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: #fff5a0;
}

.fs-retrigger-board-banner__label {
  font-size: clamp(12px, 3vw, 16px);
  font-weight: 800;
  letter-spacing: 0.04em;
}

.retrigger-banner-enter-active,
.retrigger-banner-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.retrigger-banner-enter-from,
.retrigger-banner-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.7);
}

@keyframes retrigger-banner-pop {
  0% { transform: scale(0.4); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

.grid-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  /* 正版 slot_mask：裁切 dark_reel 可见区，滚动时符号不溢出绿毡框 */
  overflow: hidden;
}

/*
 * 内部滚动条 — 按正版 Cocos 尺寸：
 *   col-inner 总高 = strip / board = 72.078 / 51.282 = 140.56% of board
 *   每格高度 = tile / strip = 13.063 / 72.078 = 18.124% of col-inner
 *   行距     = pitch/ strip = 11.803 / 72.078 = 16.375% of col-inner
 *   tile 之间重叠 = tile - pitch = 1.26% of canvas → 1.748% of col-inner
 *   初始偏移  = -1 × pitch of col-inner = -16.375%（隐藏顶部缓冲行）
 */
.col-inner {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  flex-shrink: 0;
  height: calc(100% * var(--pg-strip-pct) / var(--pg-board-pct));
  will-change: transform;
  transform: translateY(var(--pg-reel-rest-y));
}

.col-inner > :deep(.mahjong-tile) {
  flex: 0 0 calc(100% * var(--pg-tile-pct) / var(--pg-strip-pct));
  min-height: 0;
  /* 宽度多出 0.911% 让相邻牌边框微重叠 */
  width: calc(100% * 19.8 / 18.889);
  /* 行重叠：用宽度相对值 -11.882%（= 13px 的正确换算），消除行间绿缝 */
  margin-bottom: calc(-1% * var(--pg-overlap-w));
}

.col-inner > :deep(.mahjong-tile:last-child) {
  margin-bottom: 0;
}

.col-inner.is-spinning > :deep(.mahjong-tile) {
  flex: 0 0 calc(100% * var(--pg-tile-pct) / var(--pg-strip-pct));
  width: calc(100% * 19.8 / 18.889);
  margin-bottom: calc(-1% * var(--pg-overlap-w));
}

/* 滚动段：近似正版 symbol_*_blur（快速运动模糊感） */
.col-inner.is-spinning > :deep(.mahjong-tile .symbol-img) {
  filter: brightness(1.08) saturate(0.82) blur(0.6px);
}

/* PG 式逐列停轮：每列独立时长，左→右依次到位 */
.col-inner.is-spinning {
  animation: slot-spin var(--reel-duration, 900ms) cubic-bezier(0.12, 0.82, 0.28, 1) forwards;
}

.col-inner.is-reel-bounce {
  animation: reel-settle var(--reel-bounce-ms, 160ms) cubic-bezier(0.34, 1.45, 0.64, 1) forwards;
}

.col-inner.is-reel-bounce.is-turbo {
  --reel-bounce-ms: 90ms;
}

/*
 * 滚动条带 [当前6 + blur×N + 新结果6]：从 rest-y 滚到 spin-end-y，停轮后切 6 行对齐
 */
@keyframes slot-spin {
  0%   { transform: translateY(var(--pg-reel-rest-y)); }
  88%  { transform: translateY(calc(var(--pg-reel-spin-end-y) + 4px)); }
  100% { transform: translateY(var(--pg-reel-spin-end-y)); }
}

@keyframes reel-settle {
  0%   { transform: translateY(var(--pg-reel-rest-y)); }
  45%  { transform: translateY(calc(var(--pg-reel-rest-y) + 6px)); }
  100% { transform: translateY(var(--pg-reel-rest-y)); }
}

/* 倍数条档位切换脉冲 */
@keyframes mult-pulse {
  0% { filter: brightness(1); transform: scale(1); }
  35% { filter: brightness(1.22); transform: scale(1.02); }
  100% { filter: brightness(1); transform: scale(1); }
}

/* Big / Mega / Super Mega Win 全屏庆祝 */
.big-win-celebration {
  position: absolute;
  inset: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: radial-gradient(circle at 50% 45%, rgba(255, 200, 60, 0.22) 0%, rgba(0, 0, 0, 0.72) 68%);
}

.big-win-banner {
  position: relative;
  width: min(88%, 620px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.55));
  animation: big-win-label-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.big-win-rays {
  position: absolute;
  inset: -20%;
  background: conic-gradient(
    from 0deg,
    transparent 0deg,
    rgba(255, 220, 100, 0.15) 18deg,
    transparent 36deg,
    rgba(255, 200, 60, 0.12) 54deg,
    transparent 72deg
  );
  animation: big-win-rays-spin 3s linear infinite;
}

.big-win-sparkles {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 30%, rgba(255, 240, 180, 0.5) 0%, transparent 8%),
    radial-gradient(circle at 78% 25%, rgba(255, 220, 120, 0.45) 0%, transparent 6%),
    radial-gradient(circle at 65% 70%, rgba(255, 200, 80, 0.4) 0%, transparent 7%);
  animation: big-win-sparkle 1.2s ease-in-out infinite alternate;
}

.big-win-label {
  position: relative;
  font-family: 'Arial Black', 'ZCOOL QingKe HuangYou', sans-serif;
  font-size: clamp(28px, 7vw, 52px);
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #fff5c0;
  text-shadow:
    0 0 20px rgba(255, 200, 60, 0.95),
    0 3px 0 #b8860b,
    0 6px 12px rgba(0, 0, 0, 0.65);
  animation: big-win-label-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.big-win-amount {
  position: relative;
  margin-top: 12px;
  font-family: 'Arial Black', sans-serif;
  font-size: clamp(22px, 5.5vw, 40px);
  font-variant-numeric: tabular-nums;
  color: #ffe680;
  text-shadow: 0 0 16px rgba(255, 220, 100, 0.9), 0 2px 8px rgba(0, 0, 0, 0.5);
  animation: big-win-amount-pop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both;
}

.big-win-celebration.tier-mega .big-win-label {
  color: #ffd080;
  text-shadow:
    0 0 24px rgba(255, 160, 40, 0.95),
    0 3px 0 #c45c00,
    0 6px 14px rgba(0, 0, 0, 0.7);
}

.big-win-celebration.tier-super .big-win-label {
  font-size: clamp(24px, 6.5vw, 48px);
  color: #fff0a0;
  text-shadow:
    0 0 28px rgba(255, 120, 200, 0.95),
    0 0 18px rgba(255, 220, 80, 0.9),
    0 4px 0 #8b008b,
    0 8px 16px rgba(0, 0, 0, 0.75);
}

.big-win-enter-active,
.big-win-leave-active {
  transition: opacity 0.35s ease;
}

.big-win-enter-from,
.big-win-leave-to {
  opacity: 0;
}

@keyframes big-win-rays-spin {
  to { transform: rotate(360deg); }
}

@keyframes big-win-sparkle {
  0% { opacity: 0.65; transform: scale(0.98); }
  100% { opacity: 1; transform: scale(1.02); }
}

@keyframes big-win-label-pop {
  0% { opacity: 0; transform: scale(0.4) translateY(20px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes big-win-amount-pop {
  0% { opacity: 0; transform: scale(0.6); }
  100% { opacity: 1; transform: scale(1); }
}

.hud-icon-slot {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hud-icon-wrap {
  flex: 0 0 22%;
  height: 66%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 3px;
}

/* 图标：Cocos 节点高度=2.50%vh（57% 面板高）；正方形，宽=高自动 */
.hud-icon-img {
  flex-shrink: 0;
  width: auto;
  height: 57%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  transition: transform 0.15s ease-out;
  filter: invert(65%) sepia(55%) saturate(420%) hue-rotate(340deg) brightness(1.05) contrast(0.9);
}

.hud-panel.clickable:hover .hud-icon-img {
  transform: scale(1.08);
}

.btn-layer-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.btn-layer-img--label {
  z-index: 2;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.45));
}

.btn-layer-img--icon {
  z-index: 1;
  width: 58%;
  height: 58%;
  margin: auto;
  inset: 0;
}

/* 屏幕上的金额文字 */
/* 金额数值：右对齐（图标在左，数字靠右），flex:1 填满剩余宽度 */
.hud-value {
  flex: 1;
  min-width: 0;
  font-family: Arial, sans-serif;
  font-size: clamp(11px, 3.0vh, 24px);
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: #50DCF0;
  text-align: right;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.0;
  transition: color 0.2s;
}

.hud-value.is-win {
  color: #ffe066;
  text-shadow:
    0 0 8px rgba(255, 210, 60, 0.6),
    0 1px 3px rgba(0, 0, 0, 0.9);
}

/* 弹窗遮罩 */
.popup-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 49;
  backdrop-filter: blur(2px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 上拉框样式 */
.hud-popup-drawer {
  position: absolute;
  bottom: 13.7%;
  left: 10%;
  width: 80%;
  background: rgba(0, 15, 30, 0.95);
  border: 2px solid #d4af37;
  border-radius: 12px;
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.3), inset 0 0 15px rgba(212, 175, 55, 0.2);
  z-index: 50;
  padding: 15px;
  backdrop-filter: blur(10px);
  box-sizing: border-box;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(212, 175, 55, 0.3);
  padding-bottom: 10px;
  margin-bottom: 15px;
}

.popup-title {
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', sans-serif;
  color: #ffd878;
  font-size: clamp(16px, 4.2vw, 20px);
  letter-spacing: 1px;
  text-shadow: 0 0 6px rgba(255, 180, 60, 0.45);
  margin: 0;
}

.close-popup-btn {
  background: none;
  border: none;
  color: #ffb4a8;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  padding: 0 5px;
}

/* 账户余额 sheet */
.wallet-balance-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 14px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(255, 190, 60, 0.14) 0%, rgba(120, 50, 20, 0.1) 100%);
  border: 1px solid rgba(255, 200, 90, 0.4);
  box-shadow: inset 0 0 14px rgba(255, 180, 60, 0.1);
}

.wallet-pill-icon {
  width: 36px;
  height: 36px;
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(255, 200, 80, 0.45));
}

.wallet-pill-label {
  color: rgba(255, 230, 190, 0.78);
  font-size: 12px;
  letter-spacing: 1px;
}

.wallet-pill-value {
  color: #fff8e8;
  font-size: clamp(24px, 6.5vw, 30px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px rgba(255, 200, 80, 0.6);
}

.wallet-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 12px;
}

.wallet-stat-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 200, 100, 0.16);
}

.wallet-stat-label {
  color: rgba(255, 220, 180, 0.7);
  font-size: 12px;
}

.wallet-stat-value {
  color: #fff3d8;
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.wallet-stat-value.is-win {
  color: #ffd4a8;
  text-shadow: 0 0 6px rgba(255, 160, 80, 0.45);
}

.wallet-hint {
  margin: 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 220, 190, 0.55);
  font-size: 12px;
  line-height: 1.5;
  text-align: center;
}

/* 赢取详情 sheet */
.win-current-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-bottom: 14px;
  padding: 12px 14px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 140, 80, 0.14) 0%, rgba(100, 30, 20, 0.1) 100%);
  border: 1px solid rgba(255, 160, 90, 0.38);
}

.win-session-pill {
  margin-top: -6px;
  background: linear-gradient(180deg, rgba(255, 210, 80, 0.16) 0%, rgba(90, 50, 10, 0.12) 100%);
  border-color: rgba(255, 215, 0, 0.42);
}

.win-current-pill__label {
  color: rgba(255, 230, 200, 0.78);
  font-size: 12px;
  letter-spacing: 1px;
}

.win-current-pill__value {
  color: rgba(255, 240, 220, 0.85);
  font-size: clamp(22px, 6vw, 28px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.win-current-pill__value.is-win,
.is-win {
  color: #ffe0b0;
  text-shadow: 0 0 8px rgba(255, 160, 70, 0.55);
}

.is-lose {
  color: rgba(180, 180, 180, 0.85);
}

.is-neutral {
  color: rgba(255, 230, 200, 0.55);
}

.win-stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.win-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 200, 100, 0.14);
}

.win-stat-item__label {
  color: rgba(255, 210, 160, 0.65);
  font-size: 11px;
  white-space: nowrap;
}

.win-stat-item__value {
  color: #fff3dc;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.win-history-panel {
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(255, 200, 100, 0.14);
  overflow: hidden;
}

.win-history-head,
.win-history-row {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr 0.9fr;
  gap: 6px;
  align-items: center;
  padding: 0 12px;
}

.win-history-head {
  height: 36px;
  color: rgba(255, 210, 130, 0.85);
  font-size: 12px;
  letter-spacing: 0.5px;
  border-bottom: 1px solid rgba(255, 200, 100, 0.12);
  background: rgba(255, 255, 255, 0.03);
}

.win-history-head span:nth-child(2),
.win-history-head span:nth-child(3),
.win-history-bet,
.win-history-profit {
  text-align: right;
}

.win-history-body {
  max-height: 220px;
  overflow-y: auto;
}

.win-history-row {
  min-height: 38px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.win-history-row:last-child {
  border-bottom: none;
}

.win-history-time {
  color: rgba(255, 240, 220, 0.72);
}

.win-history-bet {
  color: rgba(255, 230, 200, 0.8);
}

.win-history-empty {
  padding: 28px 16px;
  text-align: center;
  color: rgba(255, 220, 190, 0.45);
  font-size: 13px;
  line-height: 1.6;
}

.win-sheet-footer {
  margin-top: 14px;
}

.win-more-btn {
  width: 100%;
  max-width: none !important;
}

/* 自动旋转弹窗样式 */
.auto-spin-section {
  display: flex;
  flex-direction: column;
  padding: 0 10px;
}

.auto-spin-label {
  color: #ffffff;
  font-size: 15px;
  margin-bottom: 15px;
}

.auto-spin-options {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.auto-opt-btn {
  flex: 1;
  background: rgba(0, 15, 30, 0.6); /* 深色半透明底座 */
  border: 1px solid rgba(212, 175, 55, 0.3); /* 明显的青色赛博边框 */
  box-shadow: inset 0 0 5px rgba(212, 175, 55, 0.1); /* 轻微的内发光 */
  color: #88ccff;
  border-radius: 8px;
  padding: 12px 0;
  font-size: 18px;
  font-family: 'Arial Black', sans-serif;
  cursor: pointer;
  transition: all 0.2s;
}

.auto-opt-btn:hover {
  background: rgba(212, 175, 55, 0.1);
  border-color: rgba(212, 175, 55, 0.8);
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.3), inset 0 0 10px rgba(212, 175, 55, 0.2);
  transform: translateY(-2px);
}

.auto-opt-btn.is-selected {
  background: rgba(196, 30, 58, 0.15); /* 选中时变成耀眼的紫红色主题 */
  border-color: #c41e3a;
  border-width: 2px; /* 选中时边框加粗 */
  color: #ffffff;
  text-shadow: 0 0 5px #c41e3a, 0 0 10px #c41e3a;
  box-shadow: 0 0 15px rgba(196, 30, 58, 0.4), inset 0 0 15px rgba(196, 30, 58, 0.3);
  transform: scale(1.05); /* 选中时稍微放大 */
}

.auto-start-btn {
  background: rgba(212, 175, 55, 0.15); /* 使用亮青色背景 */
  color: #ffffff; /* 纯白文字 */
  border: 1px solid #d4af37; /* 发光青色边框 */
  border-radius: 8px;
  padding: 14px;
  font-size: 18px;
  font-family: 'Arial Black', sans-serif;
  width: 100%;
  cursor: pointer;
  transition: all 0.2s;
  text-shadow: 0 0 5px #d4af37, 0 0 10px #d4af37; /* 赛博青色文字发光 */
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.3), inset 0 0 10px rgba(212, 175, 55, 0.2); /* 按钮整体内外发光 */
}

.auto-start-btn:hover {
  background: rgba(212, 175, 55, 0.3);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.5), inset 0 0 15px rgba(212, 175, 55, 0.4);
  transform: scale(1.02);
}

.auto-start-btn:active {
  transform: scale(0.98);
  filter: brightness(1.2);
}

/* 按钮右上角的数字徽章 */
.auto-count-badge {
  position: absolute;
  top: 5px;
  right: 5px;
  background: #c41e3a;
  color: #ffffff;
  font-size: 12px;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid #ffffff;
  box-shadow: 0 0 5px #c41e3a;
}

/* 全屏历史记录 */
.full-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(6px);
  z-index: 100;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px;
  box-sizing: border-box;
}

.full-modal-content {
  width: min(100%, 560px);
  max-height: min(86vh, 720px);
  background: linear-gradient(180deg, rgba(22, 10, 6, 0.98) 0%, rgba(10, 5, 3, 0.99) 100%);
  border: 1px solid rgba(255, 200, 90, 0.45);
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 200, 100, 0.18);
}

.modal-title {
  color: #ffd878;
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', sans-serif;
  font-size: 20px;
  letter-spacing: 1px;
  text-shadow: 0 0 8px rgba(255, 180, 60, 0.4);
}

.close-modal-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 180, 80, 0.25);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  color: #ffb4a8;
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  padding: 12px 18px 0;
}

.modal-summary-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 200, 100, 0.14);
}

.modal-summary-item span {
  color: rgba(255, 210, 160, 0.65);
  font-size: 12px;
}

.modal-summary-item strong {
  color: #fff3dc;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.modal-body {
  flex: 1;
  padding: 12px 18px 18px;
  overflow: auto;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.history-table th,
.history-table td {
  padding: 10px 8px;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.history-table th {
  color: rgba(255, 210, 130, 0.85);
  font-weight: 600;
  font-size: 12px;
  position: sticky;
  top: 0;
  background: rgba(18, 8, 4, 0.98);
}

.history-table td {
  color: rgba(255, 240, 220, 0.82);
}

.history-table .txn-id {
  color: rgba(255, 220, 180, 0.55);
  font-size: 11px;
  word-break: break-all;
}

.history-table td:last-child,
.history-table th:last-child {
  text-align: right;
}

.history-table td:nth-child(3),
.history-table th:nth-child(3) {
  text-align: right;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.cyan-text { color: #d4af37; font-family: 'Arial Black', sans-serif; font-size: 24px; text-shadow: 0 0 10px #d4af37;}
.magenta-text { color: #c41e3a; font-family: 'Arial Black', sans-serif; font-size: 24px; text-shadow: 0 0 10px #c41e3a;}
.desc-text { color: #88ccff; font-size: 12px; margin-top: 5px; }

.bet-controls {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.cyber-btn {
  flex: 1;
  padding: 10px;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid #d4af37;
  color: #d4af37;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  text-shadow: 0 0 3px #d4af37;
  transition: all 0.2s;
}

.cyber-btn:active {
  background: rgba(212, 175, 55, 0.3);
  transform: scale(0.95);
}

/* 投注设置界面 — PG 麻将风格 */
.hud-popup-drawer.bet-popup-style {
  background: linear-gradient(180deg, rgba(18, 8, 4, 0.98) 0%, rgba(8, 4, 2, 0.99) 100%);
  border: none;
  border-top: 2px solid rgba(255, 200, 80, 0.85);
  box-shadow:
    0 -8px 32px rgba(0, 0, 0, 0.55),
    inset 0 1px 0 rgba(255, 220, 140, 0.15);
  border-radius: 18px 18px 0 0;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 10px 14px calc(16px + env(safe-area-inset-bottom, 0px));
  backdrop-filter: blur(12px);
}

.bet-settings-container,
.hud-sheet-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.bet-sheet-handle {
  width: 40px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 210, 120, 0.35);
  margin: 0 auto 12px;
}

.bet-popup-header {
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin-bottom: 14px;
}

.bet-popup-header .popup-title {
  font-family: 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', sans-serif;
  color: #ffd878;
  font-size: clamp(18px, 4.8vw, 22px);
  letter-spacing: 2px;
  text-shadow: 0 0 8px rgba(255, 180, 60, 0.55);
}

.bet-popup-header .close-popup-btn {
  position: absolute;
  right: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 180, 80, 0.25);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #ffb4a8;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.2s, background 0.2s;
}

.bet-popup-header .close-popup-btn:hover {
  transform: scale(1.08);
  background: rgba(255, 120, 80, 0.12);
}

.bet-balance-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 200, 100, 0.12);
}

.bet-balance-label {
  color: rgba(255, 220, 180, 0.75);
  font-size: 13px;
}

.bet-balance-value {
  color: #fff3d0;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
}

.bet-total-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  margin-bottom: 16px;
  padding: 10px 16px;
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 190, 60, 0.16) 0%, rgba(180, 60, 20, 0.12) 100%);
  border: 1px solid rgba(255, 200, 90, 0.45);
  box-shadow: inset 0 0 16px rgba(255, 180, 60, 0.12);
}

.bet-total-pill__label {
  color: rgba(255, 230, 190, 0.8);
  font-size: 12px;
  letter-spacing: 1px;
}

.bet-total-pill__value {
  color: #fff8e8;
  font-size: clamp(22px, 6vw, 28px);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 0 10px rgba(255, 200, 80, 0.65);
}

.bet-table {
  width: 100%;
  color: rgba(255, 220, 180, 0.85);
  font-size: 12px;
}

.bet-table.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}

.bet-thead {
  display: grid;
  grid-template-columns: 1fr 16px 1fr 16px 0.72fr 16px 1fr;
  gap: 0;
  margin-bottom: 8px;
  padding: 0 22px;
  color: rgba(255, 210, 120, 0.9);
  font-size: 11px;
  letter-spacing: 0.5px;
}

.bet-thead div {
  text-align: center;
  white-space: nowrap;
}

.bet-thead div:last-child {
  color: #ffb890;
}

.bet-picker-body {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 16px 1fr 16px 0.72fr 16px 1fr;
  gap: 0;
  height: 210px;
  overflow: hidden;
  mask-image: linear-gradient(to bottom, transparent 0%, #000 18%, #000 82%, transparent 100%);
}

.bet-highlight-row {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  transform: translateY(-50%);
  height: 46px;
  background: linear-gradient(90deg, rgba(255, 180, 60, 0.04), rgba(255, 200, 90, 0.18), rgba(255, 180, 60, 0.04));
  border-top: 1px solid rgba(255, 200, 90, 0.45);
  border-bottom: 1px solid rgba(255, 200, 90, 0.45);
  box-shadow: inset 0 0 12px rgba(255, 180, 60, 0.15);
  border-radius: 8px;
  pointer-events: none;
  z-index: 1;
}

.bet-picker-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2;
  min-width: 0;
}

.bet-picker-col--static {
  justify-content: center;
}

.bet-picker-col--total .bet-wheel-item--total.is-active {
  color: #fff8ec;
  text-shadow: 0 0 8px rgba(255, 140, 80, 0.75);
}

.bet-wheel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.bet-separator-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 200, 100, 0.75);
  z-index: 2;
  font-weight: 700;
  font-size: 14px;
}

.bet-sep-item {
  height: 42px;
  line-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.bet-wheel-item {
  height: 42px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  padding: 0 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: color 0.2s, opacity 0.2s, transform 0.2s;
  font-size: clamp(11px, 2.8vw, 14px);
  font-variant-numeric: tabular-nums;
  color: rgba(180, 210, 230, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bet-wheel-item--readonly {
  cursor: default;
}

.bet-wheel-item:hover:not(:disabled):not(.bet-wheel-item--readonly) {
  color: rgba(255, 230, 200, 0.85);
}

.bet-wheel-item.is-active {
  color: #fff8e8;
  font-size: clamp(13px, 3.2vw, 16px);
  font-weight: 700;
  text-shadow: 0 0 6px rgba(255, 200, 90, 0.65);
  transform: scale(1.04);
}

.bet-wheel-item--total {
  color: rgba(255, 180, 140, 0.65);
}

.bet-wheel-item.fade-1 { opacity: 0.55; }
.bet-wheel-item.fade-2 { opacity: 0.22; }
.bet-wheel-item.is-empty { opacity: 0.15; cursor: default; }

.bet-wheel-item:disabled {
  cursor: default;
}

.bet-quick-row {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.bet-quick-btn {
  flex: 1;
  padding: 10px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 200, 100, 0.28);
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 230, 200, 0.9);
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.bet-quick-btn:hover:not(:disabled) {
  background: rgba(255, 200, 100, 0.1);
  border-color: rgba(255, 200, 100, 0.5);
}

.bet-quick-btn--max {
  border-color: rgba(255, 140, 80, 0.45);
  color: #ffe0c8;
}

.bet-quick-btn--max:hover:not(:disabled) {
  background: rgba(255, 120, 60, 0.12);
  border-color: rgba(255, 140, 80, 0.65);
}

.bet-quick-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.bet-popup-footer {
  display: flex;
  justify-content: center;
  gap: 14px;
  margin-top: 18px;
}

.bet-popup-footer .cyber-btn {
  flex: 1;
  max-width: 160px;
  padding: 12px 8px;
  font-size: 15px;
  letter-spacing: 2px;
  border-radius: 10px;
}

.bet-popup-footer .cancel-btn {
  background: transparent;
  border: 1px solid rgba(196, 30, 58, 0.5);
  color: #c41e3a;
  text-shadow: 0 0 5px #c41e3a;
}
.bet-popup-footer .cancel-btn:hover {
  background: rgba(196, 30, 58, 0.1);
  border-color: #c41e3a;
}

.bet-popup-footer .confirm-btn {
  background: rgba(212, 175, 55, 0.15);
  border: 1px solid #d4af37;
  color: #ffffff;
  text-shadow: 0 0 5px #d4af37, 0 0 10px #d4af37;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.3), inset 0 0 10px rgba(212, 175, 55, 0.2);
}
.bet-popup-footer .confirm-btn:hover {
  background: rgba(212, 175, 55, 0.3);
  box-shadow: 0 0 20px rgba(212, 175, 55, 0.5), inset 0 0 15px rgba(212, 175, 55, 0.4);
}
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(100%);
}

/* 跑马灯（位于 layer-copy 内） */
.info-ticker-bar {
  display: flex;
  justify-content: center;
  align-items: center;
  background: transparent;
  border: none;
  box-shadow: none;
  overflow: hidden;
}

.neon-info-text {
  position: absolute;
  top: 0;
  bottom: 0;
  width: max-content;
  max-width: none;
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', cursive;
  font-size: clamp(14px, 3.6vw, 22px);
  font-weight: 400;
  letter-spacing: 2px;
  white-space: nowrap;
  display: flex;
  align-items: center;
  pointer-events: none;
  will-change: transform;
}

.neon-info-text--center {
  inset: 0;
  width: 100%;
  max-width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.neon-info-text--center :deep(.ticker-line) {
  display: inline-flex;
  justify-content: center;
  width: max-content;
  max-width: calc(100% - 12px);
  margin: 0 auto;
}

.neon-info-text--scroll {
  left: 0;
  right: auto;
  width: max-content;
  min-width: 100%;
  transform: translateX(0);
  justify-content: flex-start;
  animation: ticker-marquee-scroll var(--ticker-duration, 8s) linear var(--ticker-scroll-delay, 0.5s) forwards;
}

.neon-info-text--scroll :deep(.ticker-line) {
  display: inline-flex;
  justify-content: flex-start;
  width: max-content;
  flex-shrink: 0;
}

.neon-info-text :deep(.ticker-line) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  line-height: 1;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.4));
}

.neon-info-text :deep(.ticker-body) {
  color: #ffffff;
  -webkit-text-stroke: 1px rgba(60, 20, 0, 0.6);
  paint-order: stroke fill;
  text-shadow:
    0 1px 0 rgba(80, 30, 0, 0.8),
    0 2px 4px rgba(0, 0, 0, 0.6),
    0 0 12px rgba(255, 200, 80, 0.25);
}

.neon-info-text :deep(.ticker-hl) {
  display: inline-block;
  padding: 0 4px;
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', cursive;
  font-weight: 400;
  font-size: 1.48em;
  letter-spacing: 1px;
  line-height: 0.95;
  background: linear-gradient(180deg, #fffff8 0%, #ffef70 22%, #ffb818 55%, #e87000 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  -webkit-text-stroke: 1.8px rgba(110, 48, 4, 0.72);
  paint-order: stroke fill;
  filter:
    drop-shadow(0 2px 0 rgba(80, 35, 4, 0.95))
    drop-shadow(0 0 14px rgba(255, 210, 60, 0.85))
    drop-shadow(0 0 28px rgba(255, 140, 20, 0.45));
  animation: ticker-hl-pulse 2.4s ease-in-out infinite;
}

.neon-info-text :deep(.ticker-wild) {
  height: clamp(36px, 8.8vw, 52px);
  width: auto;
  margin: 0 4px;
  vertical-align: middle;
  object-fit: contain;
  filter:
    drop-shadow(0 3px 4px rgba(0, 0, 0, 0.5))
    drop-shadow(0 0 14px rgba(255, 210, 80, 0.95));
  animation: ticker-wild-float 2.2s ease-in-out infinite;
}

@keyframes ticker-hl-pulse {
  0%, 100% {
    filter:
      drop-shadow(0 2px 0 rgba(80, 35, 4, 0.95))
      drop-shadow(0 0 12px rgba(255, 200, 60, 0.7))
      brightness(1);
  }
  50% {
    filter:
      drop-shadow(0 2px 0 rgba(80, 35, 4, 0.95))
      drop-shadow(0 0 22px rgba(255, 235, 130, 1))
      brightness(1.12);
  }
}

@keyframes ticker-wild-float {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-1px) scale(1.04);
  }
}

@keyframes ticker-marquee-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(var(--ticker-travel, -100px));
  }
}

/* 底部按钮区：Cocos worldPct 绝对定位 + 分层渲染 */
.btn-interactive-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bottom-action-bar {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pg-btn-circle,
.pg-btn-tint,
.pg-btn-label {
  position: absolute;
  object-fit: contain;
  pointer-events: none;
  display: block;
}

.pg-btn-circle {
  opacity: 0;
  transition: opacity 0.07s ease-out;
}

.pg-btn-circle.is-visible {
  opacity: 0.72;
  filter: brightness(2.8) contrast(0.85);
}

.pg-btn-tint {
  filter: brightness(0) saturate(100%) invert(68%) sepia(38%) saturate(640%)
    hue-rotate(349deg) brightness(96%) contrast(93%);
}

.pg-btn-tint.is-active {
  filter: brightness(0) saturate(100%) invert(78%) sepia(45%) saturate(820%)
    hue-rotate(352deg) brightness(108%) contrast(96%)
    drop-shadow(0 0 6px rgba(255, 190, 80, 0.45));
}

.pg-btn-label {
  filter: brightness(0) saturate(100%) invert(68%) sepia(38%) saturate(640%)
    hue-rotate(349deg) brightness(96%) contrast(93%);
}

.pg-btn-label.is-active {
  filter: brightness(0) saturate(100%) invert(78%) sepia(45%) saturate(820%)
    hue-rotate(352deg) brightness(108%) contrast(96%)
    drop-shadow(0 0 6px rgba(255, 190, 80, 0.45));
}

.pg-btn-label.is-precomposed {
  filter: none;
}

.pg-btn-label.is-precomposed.is-active {
  filter: drop-shadow(0 0 6px rgba(255, 190, 80, 0.45));
}

.turbo-fx {
  position: absolute;
  pointer-events: none;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
  image-rendering: auto;
}

.turbo-fx--glow {
  z-index: 0;
  mix-blend-mode: screen;
  animation: turbo-glow-pulse 1.85s ease-in-out infinite;
}

.turbo-center-icon.is-flashing {
  animation: turbo-center-flash 1.85s linear infinite;
}

@keyframes turbo-glow-pulse {
  0%,
  15% {
    opacity: 0.55;
  }
  20% {
    opacity: 0.15;
  }
  25%,
  35% {
    opacity: 0.55;
  }
  30% {
    opacity: 0.25;
  }
  60%,
  65% {
    opacity: 0.25;
  }
  80%,
  100% {
    opacity: 0.55;
  }
}

@keyframes turbo-center-flash {
  0%,
  10.8% {
    filter: brightness(0) saturate(100%) invert(78%) sepia(45%) saturate(820%)
      hue-rotate(352deg) brightness(108%) contrast(96%);
  }
  11%,
  48.6% {
    filter: brightness(0) saturate(100%) invert(78%) sepia(45%) saturate(820%)
      hue-rotate(352deg) brightness(138%) contrast(96%)
      drop-shadow(0 0 8px rgba(255, 190, 80, 0.65));
  }
  49%,
  100% {
    filter: brightness(0) saturate(100%) invert(78%) sepia(45%) saturate(820%)
      hue-rotate(352deg) brightness(108%) contrast(96%);
  }
}

.bottom-action-bar .action-btn--hit,
.bottom-action-bar .action-btn--spin-hit {
  position: absolute;
  padding: 0;
  border: none;
  background: transparent;
  box-shadow: none;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
}

.bottom-action-bar .action-btn--hit {
  transition: transform 0.1s, filter 0.1s;
}

.bottom-action-bar .action-btn--spin-hit {
  z-index: 2;
}

.bottom-action-bar .action-btn--spin-hit.is-disabled {
  cursor: not-allowed;
  pointer-events: none;
}

.spin-button-stack {
  position: absolute;
  pointer-events: none;
  z-index: 3;
  overflow: visible;
}

.spin-button-stack.is-disabled {
  opacity: 0.88;
}

.spin-stack-img,
.spin-stack-arrow,
.spin-stack-digits {
  position: absolute;
  pointer-events: none;
}

.spin-stack-img {
  object-fit: fill;
  display: block;
}

.spin-stack-disc.is-free-spin {
  filter: drop-shadow(0 0 8px rgba(255, 210, 60, 0.35));
}

.spin-stack-arrow {
  overflow: visible;
  z-index: 2;
}

.spin-stack-digits {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  z-index: 3;
}

.spin-count-digit {
  display: inline-block;
  flex-shrink: 0;
}

.spin-stack-digits.is-count-bump {
  animation: spin-count-bump 0.62s cubic-bezier(0.22, 1.2, 0.36, 1);
}

/* 免费旋转底栏（正版 remaining_free_spin_holder / bonus_free_spin_holder） */
.fs-bottom-panel {
  position: absolute;
  pointer-events: none;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
}

.fs-bottom-last {
  width: 72%;
  max-height: 100%;
  object-fit: contain;
  display: block;
}

.fs-bottom-remaining {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  width: 100%;
  height: 100%;
}

.fs-bottom-remaining__label {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  flex-shrink: 0;
  gap: 0;
  margin-right: 1.2%;
}

.fs-remaining-line {
  display: block;
  object-fit: contain;
}

.fs-remaining-line--top {
  height: 46%;
  max-height: 42px;
  width: auto;
}

.fs-remaining-line--bottom {
  height: 46%;
  max-height: 42px;
  width: auto;
}

.fs-remaining-colon {
  height: 62%;
  max-height: 56px;
  width: auto;
  object-fit: contain;
  flex-shrink: 0;
  margin: 0 1.8% 0 0.6%;
}

.fs-bottom-remaining__digits {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  flex-shrink: 0;
}

.fs-count-digit {
  display: inline-block;
  flex-shrink: 0;
}

.fs-bottom-remaining__digits.is-count-bump {
  animation: spin-count-bump 0.62s cubic-bezier(0.22, 1.2, 0.36, 1);
}

@keyframes spin-count-bump {
  0% {
    transform: scale(1);
  }
  35% {
    transform: scale(1.22);
  }
  100% {
    transform: scale(1);
  }
}

.bottom-action-bar :deep(.spin-btn) {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-height: none;
  pointer-events: none;
}

.bottom-action-bar .action-btn--hit:active:not(:disabled) {
  transform: scale(0.95);
}

.bottom-action-bar .action-btn--hit.is-disabled,
.bottom-action-bar .action-btn--hit:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
}

.action-btn--auto {
  position: relative;
}

.action-btn--auto .auto-count-badge {
  position: absolute;
  right: 8%;
  top: 0;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 9px;
  background: rgba(180, 120, 80, 0.92);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  pointer-events: none;
}

.bottom-action-menu-page {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
}

.action-btn {
  background-color: transparent;
  border: none;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: none;
  transition: transform 0.1s, filter 0.1s;
  outline: none;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  flex-shrink: 0;
}

.action-btn:active {
  transform: scale(0.95);
  filter: brightness(1.08);
}

.action-btn.is-disabled,
.action-btn:disabled {
  opacity: 0.42;
  cursor: not-allowed;
  pointer-events: none;
  filter: grayscale(0.25);
}

.small-btn {
  width: 12.75%;
  height: 64%;
  aspect-ratio: 76 / 77;
}

.turbo-btn,
.auto-btn {
  aspect-ratio: 76 / 77;
  position: relative;
}

.minus-btn,
.plus-btn {
  aspect-ratio: 1;
}

.turbo-btn.is-active {
  filter: brightness(1.5) drop-shadow(0 0 15px rgba(255, 200, 0, 0.8));
  transform: scale(1.1);
}

.turbo-btn.is-active:active {
  transform: scale(0.95);
}

.menu-hamburger {
  position: absolute;
  width: 5.6%;
  height: 2.8%;
  min-width: 32px;
  min-height: 32px;
  padding: 0;
  box-sizing: border-box;
  background: transparent;
  border: none;
  cursor: pointer;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 13;
  transform: translate(-50%, -50%);
}

.menu-hamburger__icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.6));
}

.menu-hamburger:active {
  transform: translate(-50%, -50%) scale(0.92);
  filter: brightness(1.15);
}

.menu-page-circle {
  pointer-events: none;
}

.menu-page-icon {
  pointer-events: none;
}

.menu-page-label {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(9px, 2.2vh, 16px);
  line-height: 1.1;
  color: rgb(180, 120, 80);
  font-family: 'PingFang SC', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
  white-space: nowrap;
  pointer-events: none;
  text-align: center;
}

.menu-page-hit {
  position: absolute;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s, filter 0.15s;
}

.menu-page-hit:active {
  transform: scale(0.95);
  filter: brightness(1.08);
}

/* 页面左右推拉切换动画 */
.slide-left-page-enter-active,
.slide-left-page-leave-active,
.slide-right-page-enter-active,
.slide-right-page-leave-active {
  transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.slide-left-page-enter-from,
.slide-left-page-leave-to {
  opacity: 0;
  transform: translateX(-30vw);
}

.slide-right-page-enter-from,
.slide-right-page-leave-to {
  opacity: 0;
  transform: translateX(30vw);
}

</style>
