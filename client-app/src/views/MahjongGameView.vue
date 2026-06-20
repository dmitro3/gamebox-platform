<template>
  <div class="mahjong-game-page">
    <!-- 游戏画布 720×1280 竖屏（灵光素材） -->
    <div class="game-container" :class="{ 'is-free-spin-mode': isInFreeSpinFeature, 'is-using-fs-assets': isInFreeSpinFeature && USE_FREE_SPIN_BG_ASSET }">

      <!-- PS 叠层：底图 → 顶栏 UI → 牌面 → 底栏 UI → 按钮 -->

      <!-- ① 底图 -->
      <div
        class="layer layer-base z-bg"
        :class="{ 'is-free-spin-mode': isInFreeSpinFeature, 'is-using-fs-assets': isInFreeSpinFeature && USE_FREE_SPIN_BG_ASSET }"
      >
        <img class="layer-img layer-img--bg" :src="`${LG}/${bgAsset}.png?v=12`" alt="" />
        <div v-if="!USE_FREE_SPIN_BG_ASSET" class="free-spin-bg-glow" aria-hidden="true" />
      </div>

      <!-- 游戏层：麻将牌（在底图之上、UI 框之下；边框已烘焙在 bg-base 内） -->
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

      <!-- ①b 麻将牌（在底图之上、顶栏 UI 之下） -->
      <div class="layer-board game-board-area z-board" :style="boardStyle">
        <div id="grid-container" class="grid-container">

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
            :bg-image="`${LG}/bg-base.png`"
          />
        </div>
      </div>

      <!-- ② 倍数框 -->
      <div
        class="layer z-mult-bar"
        :class="{ 'is-free-spin-mode': isInFreeSpinFeature, 'is-using-fs-assets': isInFreeSpinFeature && USE_FREE_SPIN_MULT_BAR_ASSET }"
        :style="layerStyle(L.multBar.y, L.multBar.h)"
      >
        <img class="layer-img layer-img--mult-bar" :src="`${LG}/${multBarAsset}.png?v=10`" alt="" />
      </div>

      <!-- ③ 1024框 -->
      <div class="layer z-title1024" :style="layerStyle(L.title1024.y, L.title1024.h)">
        <img class="layer-img" :src="`${LG}/top-title-1024.png`" alt="" />
      </div>

      <!-- ④ 倍数：常规 + 当前档位高亮叠加（免费旋转用 ×2/×4/×6/×10 素材） -->
      <div class="layer z-mult-values" :style="layerStyle(L.multValues.y, L.multValues.h)">
        <div class="mult-values-stack" :class="{ 'is-free-spin-mode': isInFreeSpinFeature }">
          <Transition name="mult-fade" mode="out-in">
            <div :key="multValuesAssetBase" class="mult-values-pair">
              <img class="mult-values-img" :src="`${LG}/${multValuesAssetBase}.png?v=9`" alt="" />
              <img
                class="mult-values-img mult-values-active"
                :class="{ 'is-pulsing': multPulseActive }"
                :src="`${LG}/${multValuesAssetBase}-active.png?v=9`"
                alt=""
                :style="activeMultClipStyle"
              />
            </div>
          </Transition>
        </div>
      </div>

      <!-- ⑤ 底图2 -->
      <div class="layer z-wood" :style="layerStyle(L.woodFooter.y, L.woodFooter.h)">
        <img class="layer-img" :src="`${LG}/wood-top-panel.png`" alt="" />
      </div>

      <!-- ⑥ 下框 -->
      <div class="layer z-bottom-frame" :style="layerStyle(L.bottomFrame.y, L.bottomFrame.h)">
        <img class="layer-img" :src="`${LG}/bottom-frame-bar.png`" alt="" />
      </div>

      <!-- ⑦ 广告框 -->
      <div
        class="layer layer-copy z-message"
        :class="{ 'is-free-spin-mode': isInFreeSpinFeature }"
        :style="layerStyle(L.message.y, L.message.h)"
      >
        <img class="layer-img layer-img--ribbon" :src="`${LG}/message-ribbon.png`" alt="" />
        <div ref="tickerBarRef" class="info-ticker-bar">
          <div
            ref="tickerItemRef"
            class="neon-info-text"
            :class="{
              'neon-info-text--center': tickerMode === 'center',
              'neon-info-text--scroll': tickerMode === 'scroll',
            }"
            :style="tickerItemStyle"
            v-html="currentMessageHtml"
            @animationend="onTickerAnimationEnd"
          />
        </div>
      </div>

      <!-- ⑧ 三格金额框（广告栏下方：余额 / 投注 / 奖金） -->
      <div class="layer layer-hud z-hud" :style="layerStyle(L.statusHud.y, L.statusHud.h)">
        <div class="layer-hud__values">
          <div class="hud-panel clickable" @click="togglePopup('wallet')">
            <span class="hud-icon-slot">
              <img class="hud-icon-img" :src="`${LG}/icons/icon-wallet.png`" alt="" />
            </span>
            <span class="hud-value">¥{{ balance.toFixed(2) }}</span>
          </div>
          <div
            class="hud-panel clickable"
            :class="{ 'is-disabled': !canAdjustBet, 'is-free-spin-mode': isInFreeSpinFeature }"
            @click="canAdjustBet && togglePopup('bet')"
          >
            <span class="hud-icon-slot">
              <img class="hud-icon-img" :src="`${LG}/icons/icon-bet.png`" alt="" />
            </span>
            <span class="hud-value-wrap">
              <span v-if="isInFreeSpinFeature" class="hud-value-tag">锁定</span>
              <span class="hud-value">¥{{ hudBetDisplay.toFixed(2) }}</span>
            </span>
          </div>
          <div
            class="hud-panel clickable"
            :class="{ 'is-free-spin-mode': isInFreeSpinFeature }"
            @click="togglePopup('win')"
          >
            <span class="hud-icon-slot">
              <img class="hud-icon-img" :src="`${LG}/icons/icon-win.png`" alt="" />
            </span>
            <span class="hud-value-wrap">
              <span v-if="isInFreeSpinFeature" class="hud-value-tag">累计</span>
              <span class="hud-value" :class="{ 'is-win': hudWinDisplay > 0 }">¥{{ hudWinDisplay.toFixed(2) }}</span>
            </span>
          </div>
        </div>
      </div>

      <!-- ⑨ 最底部色块 -->
      <div class="layer z-bottom-control" :style="layerStyle(L.bottomControl.y, L.bottomControl.h)">
        <img class="layer-img" :src="`${LG}/bottom-control-bg.png`" alt="" />
      </div>

      <!-- ⑨b 按钮边框 -->
      <div class="layer z-btn-frame" :style="btnFrameStyle">
        <img class="layer-img" :src="`${BTN}/btn-frame.png`" alt="" />
      </div>

      <!-- 免费旋转触发弹窗 -->
      <MahjongFreeSpinTriggerOverlay
        :visible="freeSpinTriggerVisible"
        :scatter-count="freeSpinTriggerData?.scatterCount ?? 3"
        :spins-awarded="freeSpinTriggerData?.spinsAwarded ?? 12"
        :is-retrigger="freeSpinTriggerData?.isRetrigger ?? false"
        :remaining-after="freeSpinsRemaining"
        :sym-base="symbolAssetBase"
        :panel-bg="`${LG_FS_PANEL}/fs-trigger-panel-bg.png?v=12`"
        :auto-dismiss-ms="isFsUiPreview ? 0 : 3200"
        @confirm="dismissFreeSpinTrigger"
      />

      <!-- 免费旋转结束总结 -->
      <MahjongFreeSpinEndOverlay
        :visible="freeSpinEndVisible"
        :total-win="freeSpinEndSnapshot.totalWin"
        :spins-played="freeSpinEndSnapshot.spinsPlayed"
        :sym-base="symbolAssetBase"
        :panel-bg="`${LG_FS_PANEL}/fs-end-panel-bg.png?v=17`"
        :auto-dismiss-ms="isFsUiPreview ? 0 : 4800"
        @confirm="dismissFreeSpinEndSummary"
      />

      <!-- 开发：免费旋转 UI 预览快捷键提示 -->
      <div v-if="isDev" class="fs-dev-hint" aria-hidden="true">
        Alt+1 触发 · Alt+2 再触发 · Alt+3 结束 · Esc 关
      </div>

      <!-- 交互层：按钮 -->
      <div class="btn-interactive-layer z-buttons">
        <Transition name="slide-left-page">
          <div class="bottom-action-bar" v-if="!showMenuPage" :style="btnBarStyle">
            <button class="action-btn small-btn turbo-btn" :class="{ 'is-active': isTurbo }" @click="toggleTurbo"></button>
            <button
              class="action-btn small-btn minus-btn"
              :class="{ 'is-disabled': !canAdjustBet }"
              :disabled="!canAdjustBet"
              @click="decreaseBet"
            ></button>
            <MahjongSpinButton
              :is-accelerating="isSpinning || isResolving"
              :is-turbo="isTurbo"
              :free-spins-remaining="freeSpinsRemaining"
              :is-free-spin-mode="isFreeSpinMode"
              :count-bump-token="spinCountBumpToken"
              :retrigger-flash="spinRetriggerFlash"
              :disabled="isSpinControlDisabled"
              @click="handleSpinClick()"
            />
            <button
              class="action-btn small-btn plus-btn"
              :class="{ 'is-disabled': !canAdjustBet }"
              :disabled="!canAdjustBet"
              @click="increaseBet"
            ></button>
            <button
              class="action-btn small-btn auto-btn"
              :class="{ 'is-active': autoSpinCount > 0, 'is-disabled': !canUseAutoSpin && autoSpinCount === 0 }"
              :disabled="!canUseAutoSpin && autoSpinCount === 0"
              @click="handleAutoBtnClick"
            >
              <div v-if="autoSpinCount > 0" class="auto-count-badge">{{ autoSpinCount }}</div>
            </button>
          </div>
        </Transition>

        <Transition name="slide-right-page">
          <div class="bottom-action-menu-page" v-if="showMenuPage" :style="btnBarStyle">
            <button class="action-btn menu-page-btn exit-btn" @click="router.back()"></button>
            <button
              class="action-btn menu-page-btn sound-btn"
              :class="soundEnabled ? 'is-on' : 'is-off'"
              @click="toggleSound"
            ></button>
            <button class="action-btn menu-page-btn paytable-btn" @click="openInfoSheet('pay')"></button>
            <button class="action-btn menu-page-btn rules-btn" @click="openInfoSheet('rules')"></button>
            <button class="action-btn menu-page-btn history-btn" @click="showHistoryModal = true"></button>
            <button class="action-btn menu-page-btn close-menu-btn" @click="showMenuPage = false"></button>
          </div>
        </Transition>

        <button
          v-if="!showMenuPage"
          class="menu-hamburger"
          :style="menuBtnStyle"
          aria-label="菜单"
          @click="showMenuPage = true"
        >
          <img :src="`${ASSET}/buttons/icon-menu.png`" alt="" class="menu-hamburger__icon" />
        </button>
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
              <img class="wallet-pill-icon" :src="`${LG}/icons/icon-wallet.png`" alt="" />
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

      <!-- Big / Mega / Super Mega Win 庆祝（PG 式分级，规则仍为 MW1） -->
      <Transition name="big-win">
        <div
          v-if="bigWinVisible"
          class="big-win-celebration"
          :class="`tier-${bigWinTier}`"
          aria-live="polite"
        >
          <div class="big-win-rays" aria-hidden="true" />
          <div class="big-win-sparkles" aria-hidden="true" />
          <div class="big-win-label">{{ bigWinLabel }}</div>
          <div class="big-win-amount">¥{{ bigWinAmount.toFixed(2) }}</div>
        </div>
      </Transition>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import MahjongTile from '../components/MahjongTile.vue'
import MahjongSymbolInfo, { type TileAnchor } from '../components/MahjongSymbolInfo.vue'
import MahjongInfoSheet from '../components/MahjongInfoSheet.vue'
import MahjongFreeSpinTriggerOverlay from '../components/MahjongFreeSpinTriggerOverlay.vue'
import MahjongFreeSpinEndOverlay from '../components/MahjongFreeSpinEndOverlay.vue'
import MahjongSpinButton from '../components/MahjongSpinButton.vue'
import { useMahjongSound } from '../composables/useMahjongSound'
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
  rollColumn,
  rollTile,
  applyGoldenToWild,
  getCellsToRemove,
  dropAndRefill,
  computeTileDropMotions,
  freeSpinsFromScatters,
  getScatterCells,
  isPaySymbol,
} from '../games/mahjong/mahjongWays1'

const router = useRouter()
const mahjongSound = useMahjongSound()
const LG = '/images/games/mahjong/lingguang'
const BTN = `${LG}/buttons`
const ASSET = '/images/games/mahjong/classic'
const symbolAssetBase = `${ASSET}/symbols`
const isDev = import.meta.env.DEV

/** 放入 PS 导出图后改为 true，见 lingguang/ASSETS_PENDING.txt */
const USE_FREE_SPIN_BG_ASSET = true
const USE_FREE_SPIN_MULT_BAR_ASSET = true
const LG_FS_PANEL = '/images/games/mahjong/lingguang'

/** 画布设计稿 720×1280 — Y 坐标按 PS 稿像素值 */
const CANVAS_W = 720
const CANVAS_H = 1280

const L = {
  title1024: { y: 0, h: 143 },
  multBar: { y: 69, h: 134 },
  multValues: { y: 109, h: 82 },
  board: { y: 234, h: 592, left: 7.5, width: 85 },
  bottomFrame: { y: 850, h: 129 },
  message: { y: 902, h: 96 },
  woodFooter: { y: 952, h: 170 },
  bottomControl: { y: CANVAS_H - 177, h: 177 },
  /** 广告栏下方三格金额框 */
  statusHud: { y: 1020, h: 58 },
}

/** 按钮区：边框 596×120，水平居中，Y=1137 */
const BTN_FRAME = { x: 62, y: 1137, w: 596, h: 120 }

function layerStyle(y: number, h: number) {
  return {
    top: `${(y / CANVAS_H) * 100}%`,
    height: `${(h / CANVAS_H) * 100}%`,
  }
}

function boxStyle(x: number, y: number, w: number, h: number) {
  return {
    top: `${(y / CANVAS_H) * 100}%`,
    left: `${(x / CANVAS_W) * 100}%`,
    width: `${(w / CANVAS_W) * 100}%`,
    height: `${(h / CANVAS_H) * 100}%`,
  }
}

const btnFrameStyle = computed(() => boxStyle(BTN_FRAME.x, BTN_FRAME.y, BTN_FRAME.w, BTN_FRAME.h))
const btnBarStyle = computed(() => btnFrameStyle.value)
/** 汉堡按钮：按钮边框右缘与页面右缘之间水平居中，垂直与边框居中 */
const menuBtnStyle = computed(() => {
  const frameRight = BTN_FRAME.x + BTN_FRAME.w
  const centerX = (frameRight + CANVAS_W) / 2
  const centerY = BTN_FRAME.y + BTN_FRAME.h / 2
  return {
    left: `${(centerX / CANVAS_W) * 100}%`,
    top: `${(centerY / CANVAS_H) * 100}%`,
  }
})

/** 6 行牌区：中间 4 行对齐 L.board(234×592)，上下各 1 行缓冲 */
const boardStyle = computed(() => {
  const rowH = (L.board.h - 3 * (VISIBLE_ROWS - 1)) / VISIBLE_ROWS
  const extend = rowH + 3
  return {
    top: `${((L.board.y - extend) / CANVAS_H) * 100}%`,
    left: `${L.board.left}%`,
    width: `${L.board.width}%`,
    height: `${((L.board.h + extend * 2) / CANVAS_H) * 100}%`,
  }
})

const isVisibleRow = (row: number) =>
  (VISIBLE_ROW_INDICES as readonly number[]).includes(row)

/** 倍数图内各档位裁切边界（569×82 素材，按像素内容分析） */
const MULT_CLIP_BOUNDS = [
  { left: 0, right: 80.0 },
  { left: 26.4, right: 53.1 },
  { left: 52.4, right: 27.2 },
  { left: 79.3, right: 0 },
] as const

/** 免费倍数高亮层裁切（multiplier-values-free-active.png，高亮区略宽） */
const MULT_CLIP_BOUNDS_FREE_ACTIVE = [
  { left: 0, right: 79.4 },
  { left: 25.1, right: 55.9 },
  { left: 49.6, right: 30.1 },
  { left: 74.0, right: 0 },
] as const

const multValuesAssetBase = computed(() =>
  isInFreeSpinFeature.value ? 'multiplier-values-free' : 'multiplier-values',
)

const bgAsset = computed(() =>
  isInFreeSpinFeature.value && USE_FREE_SPIN_BG_ASSET ? 'bg-base-free' : 'bg-base',
)

const multBarAsset = computed(() =>
  isInFreeSpinFeature.value && USE_FREE_SPIN_MULT_BAR_ASSET
    ? 'multiplier-bar-bg-free'
    : 'multiplier-bar-bg',
)

const activeMultClipStyle = computed(() => {
  const ladder = isInFreeSpinFeature.value ? MULT_CLIP_BOUNDS_FREE_ACTIVE : MULT_CLIP_BOUNDS
  const bounds = ladder[activeMultiplierIndex.value]
  return { clipPath: `inset(0 ${bounds.right}% 0 ${bounds.left}%)` }
})

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
  return { '--reel-duration': `${delays[colIndex]}ms` }
}

const onReelSpinEnd = (colIndex: number) => {
  if (!columnSpinning.value[colIndex]) return
  columnSpinning.value[colIndex] = false
  columnReelBounce.value[colIndex] = true
  gridData.value[colIndex] = spinningCols.value[colIndex]
    .slice(0, TOTAL_ROWS)
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

const soundEnabled = ref(localStorage.getItem('sound_off') !== '1')

const toggleSound = () => {
  soundEnabled.value = !soundEnabled.value
  if (soundEnabled.value) {
    localStorage.removeItem('sound_off')
  } else {
    localStorage.setItem('sound_off', '1')
  }
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
const spinRetriggerFlash = ref(0)
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

/** 免费局 HUD 奖金：已完成转累计 + 当前转进行中的赢分 */
const hudWinDisplay = computed(() =>
  isInFreeSpinFeature.value
    ? freeSpinSessionWin.value + winAmount.value
    : winAmount.value,
)

const effectiveSpinBet = computed(() =>
  isActiveFreeSpinSpin.value && freeSpinBetAmount.value > 0
    ? freeSpinBetAmount.value
    : betAmount.value,
)

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** PG 式中奖高亮：金框脉冲，无闪电连线 */
const showWinHighlight = async (winCells: GridPos[], cascadeStep = 0) => {
  if (!winCells.length) return
  mahjongSound.playWin(cascadeStep)
  winningCells.value = new Set(winCells.map(({ col, row }) => `${col}-${row}`))
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
    spinCountBumpToken.value++
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

// 金额状态
const balance = ref(10000.00)
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

onUnmounted(() => {
  clearFreeSpinChainTimer()
  clearTickerTimers()
  window.removeEventListener('keydown', onFsPreviewKeydown)
  window.removeEventListener('resize', onTickerResize)
})

onMounted(() => {
  mahjongSound.preload()
  setupTickerMessage()
  window.addEventListener('resize', onTickerResize)
  if (import.meta.env.DEV) {
    window.addEventListener('keydown', onFsPreviewKeydown)
    console.info(
      '[麻将 DEV] 免费旋转 UI 预览：Alt+1 首次触发 | Alt+2 再触发 | Alt+3 结束总结 | Esc 关闭',
    )
  }
})

// 当前激活的乘数 (索引: 0->X1, 1->X2, 2->X3, 3->X5)
const activeMultiplierIndex = ref(0)

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
  activeMultiplierIndex.value = 0
  winningCells.value.clear()
  explodingCells.value.clear()
  transformingCells.value.clear()
  tileDropMotions.value.clear()
  currentRecordId.value = 'TXN' + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')

  const blurTileCount = 20

  spinningCols.value = Array.from({ length: COLS }, (_, colIndex) => {
    const finalTiles = rollColumn(colIndex)
    const blurTiles = Array.from({ length: blurTileCount }, () => rollTile(colIndex))
    return [...finalTiles, ...blurTiles]
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
        gridData.value[col] = spinningCols.value[col]
          .slice(0, TOTAL_ROWS)
          .map((t) => ({ ...t }))
      }
    }
    isSpinning.value = false
    columnSpinning.value = Array(COLS).fill(false)
    columnReelBounce.value = Array(COLS).fill(false)
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
  background-color: #1a1008;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 锁定 720×1280 设计稿比例，等比缩放适配视口，避免拉宽/拉高时牌面变形 */
.game-container {
  position: relative;
  aspect-ratio: 720 / 1280;
  width: min(100vw, 100vh * 720 / 1280);
  height: min(100vh, 100vw * 1280 / 720);
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
  transition: filter 0.45s ease;
  object-fit: cover;
  object-position: center center;
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

/* PS 叠层：底图 → 牌面 → 顶栏 UI → 底栏 */
.z-bg { z-index: 1; }
.z-board { z-index: 2; }
.z-mult-bar { z-index: 3; }
.z-title1024 { z-index: 4; }
.z-mult-values { z-index: 5; }
.z-wood { z-index: 6; }
.z-bottom-frame { z-index: 7; }
.z-message { z-index: 8; }
.z-bottom-control { z-index: 9; }
.z-btn-frame { z-index: 10; }
.z-hud { z-index: 11; }
.z-buttons { z-index: 12; }

.fs-dev-hint {
  position: absolute;
  left: 50%;
  bottom: 2px;
  transform: translateX(-50%);
  z-index: 40;
  padding: 3px 10px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: rgba(255, 230, 180, 0.75);
  font-size: 10px;
  letter-spacing: 0.3px;
  pointer-events: none;
  white-space: nowrap;
}

.z-mult-bar,
.z-title1024,
.z-mult-values {
  overflow: hidden;
}

.layer-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

.layer-img--mult-values {
  width: 76.7%;
  height: 100%;
  margin: 0 auto;
  display: block;
  object-fit: fill;
}

.mult-values-stack {
  position: relative;
  width: 76.7%;
  height: 100%;
  margin: 0 auto;
}

.mult-values-pair {
  position: relative;
  width: 100%;
  height: 100%;
}

.mult-values-stack .mult-values-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: fill;
}

.mult-values-stack.is-free-spin-mode .mult-values-img:not(.mult-values-active) {
  filter: saturate(1.03) brightness(1.02);
}

.is-using-fs-assets .mult-values-stack.is-free-spin-mode .mult-values-img:not(.mult-values-active) {
  filter: none;
}

.mult-fade-enter-active,
.mult-fade-leave-active {
  transition: opacity 0.32s ease;
}

.mult-fade-enter-from,
.mult-fade-leave-to {
  opacity: 0;
}

.z-mult-bar.is-free-spin-mode .layer-img {
  filter: saturate(1.04) brightness(1.02);
  transition: filter 0.35s ease;
}

.z-mult-bar.is-free-spin-mode.is-using-fs-assets .layer-img {
  filter: none;
}

.layer-img--mult-bar {
  object-fit: fill;
}

.mult-values-active {
  position: absolute;
  inset: 0;
  pointer-events: none;
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
}

/* 麻将区 */
.layer-board {
  position: absolute;
  overflow: visible;
  pointer-events: none;
}

.layer-board .grid-container {
  pointer-events: auto;
}

.layer-hud__values {
  position: absolute;
  inset: 0;
  left: 7.5%;
  width: 85%;
  display: flex;
  justify-content: space-between;
  align-items: stretch;
  gap: 3.2%;
  box-sizing: border-box;
  pointer-events: none;
}

.hud-panel {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 0 8px 0 10px;
  box-sizing: border-box;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(72, 48, 18, 0.94) 0%, rgba(38, 24, 8, 0.9) 100%);
  border: 1px solid rgba(255, 210, 120, 0.5);
  box-shadow:
    inset 0 1px 0 rgba(255, 230, 160, 0.28),
    0 2px 6px rgba(0, 0, 0, 0.35);
  transition: transform 0.2s ease-out, filter 0.2s ease-out;
  pointer-events: auto;
}

.hud-panel.clickable {
  cursor: pointer;
}

.hud-panel.clickable:hover {
  transform: translateY(-1px);
  filter: brightness(1.12);
  border-color: rgba(255, 220, 140, 0.65);
}

.hud-panel.clickable:active {
  transform: translateY(1px) scale(0.98);
  filter: brightness(0.94);
}

.hud-panel.is-disabled {
  opacity: 0.55;
  cursor: not-allowed;
  pointer-events: none;
}

.hud-panel.is-disabled:hover {
  transform: none;
  filter: none;
}

.hud-panel.is-free-spin-mode {
  border-color: rgba(255, 215, 0, 0.62);
  box-shadow:
    inset 0 1px 0 rgba(255, 230, 160, 0.32),
    0 0 10px rgba(255, 200, 60, 0.18);
}

.hud-value-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  margin-left: 6px;
  gap: 1px;
}

.hud-value-tag {
  font-size: clamp(7px, 1.5vh, 9px);
  line-height: 1;
  color: rgba(255, 215, 120, 0.88);
  letter-spacing: 0.6px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
}

.layer-copy {
  display: flex;
  align-items: center;
  justify-content: center;
}

.layer-copy .info-ticker-bar {
  position: absolute;
  inset: 10% 17% 8%;
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
  gap: 3px;
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 2;
  top: 0;
}

.grid-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.grid-col.is-spinning-col {
  overflow: hidden;
}

/* 内部滚动容器 */
.col-inner {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
  height: 100%;
}

.col-inner > :deep(.mahjong-tile) {
  flex: 0 0 calc((100% - 15px) / 6);
  min-height: 0;
}

.col-inner.is-spinning > :deep(.mahjong-tile) {
  flex: 0 0 calc((100% - 15px) / 6);
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

@keyframes slot-spin {
  0% { transform: translateY(calc(-600% - 15px)); }
  92% { transform: translateY(2px); }
  100% { transform: translateY(0); }
}

@keyframes reel-settle {
  0% { transform: translateY(0); }
  45% { transform: translateY(5px); }
  100% { transform: translateY(0); }
}

/* 倍数条档位切换脉冲 */
.mult-values-active.is-pulsing {
  animation: mult-pulse 0.45s ease-out;
}

@keyframes mult-pulse {
  0% { filter: brightness(1) drop-shadow(0 0 0 transparent); transform: scale(1); }
  35% { filter: brightness(1.35) drop-shadow(0 0 12px rgba(255, 220, 90, 0.85)); transform: scale(1.04); }
  100% { filter: brightness(1) drop-shadow(0 0 0 transparent); transform: scale(1); }
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

.hud-icon-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center;
  pointer-events: none;
  user-select: none;
  transition: transform 0.2s ease-out;
}

.hud-panel.clickable:hover .hud-icon-img {
  transform: scale(1.06);
}

/* 屏幕上的金额文字 */
.hud-value {
  flex: 1;
  min-width: 0;
  width: 100%;
  font-family: 'Arial Black', sans-serif;
  font-size: clamp(9px, 2.2vh, 13px);
  font-variant-numeric: tabular-nums;
  color: #fff5dc;
  margin-left: 0;
  text-align: right;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.85);
  letter-spacing: 0.2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s;
}

.hud-panel > .hud-value {
  margin-left: 6px;
}

.hud-value.is-win {
  color: #ffe066;
  text-shadow:
    0 0 6px rgba(255, 200, 60, 0.45),
    0 1px 2px rgba(0, 0, 0, 0.85);
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
  font-size: clamp(24px, 6.8vw, 38px);
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
  color: #fff4c8;
  -webkit-text-stroke: 1.4px rgba(88, 42, 4, 0.82);
  paint-order: stroke fill;
  text-shadow:
    0 2px 0 #7a4210,
    0 3px 0 #5c3008,
    0 4px 0 #3a1c04,
    0 6px 10px rgba(0, 0, 0, 0.5),
    0 0 18px rgba(255, 210, 90, 0.5),
    0 0 36px rgba(255, 150, 30, 0.28);
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

/* 底部按钮区 */
.btn-interactive-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 12;
}

.bottom-action-bar,
.bottom-action-menu-page {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 3.2%;
  box-sizing: border-box;
  pointer-events: auto;
  overflow: visible;
}

.bottom-action-menu-page {
  gap: 2%;
  padding: 0 1%;
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
}

.minus-btn,
.plus-btn {
  aspect-ratio: 1;
}

.turbo-btn {
  background-image: url('/images/games/mahjong/lingguang/buttons/btn-turbo.png');
}

.turbo-btn.is-active {
  filter: brightness(1.5) drop-shadow(0 0 15px rgba(255, 200, 0, 0.8));
  transform: scale(1.1);
}

.turbo-btn.is-active:active {
  transform: scale(0.95);
}

.minus-btn {
  background-image: url('/images/games/mahjong/lingguang/buttons/btn-minus.png');
}

.plus-btn {
  background-image: url('/images/games/mahjong/lingguang/buttons/btn-plus.png');
}

.auto-btn {
  background-image: url('/images/games/mahjong/lingguang/buttons/btn-auto.png');
}

/* 汉堡菜单：CSS 三横线，居中对齐在按钮边框右缘与页面右缘之间 */
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

.menu-page-btn {
  width: 12.75%;
  height: 64%;
  aspect-ratio: 76 / 77;
  mix-blend-mode: normal;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  background-color: transparent;
  border: none;
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s;
}

.menu-page-btn:active {
  transform: scale(0.95);
}

.exit-btn { background-image: url('/images/games/mahjong/lingguang/buttons/btn-exit.png'); }
.sound-btn.is-on { background-image: url('/images/games/mahjong/lingguang/buttons/btn-sound-on.png'); }
.sound-btn.is-off { background-image: url('/images/games/mahjong/lingguang/buttons/btn-sound-off.png'); }
.paytable-btn { background-image: url('/images/games/mahjong/lingguang/buttons/btn-paytable.png'); }
.rules-btn { background-image: url('/images/games/mahjong/lingguang/buttons/btn-rules.png'); }
.history-btn { background-image: url('/images/games/mahjong/lingguang/buttons/btn-history.png'); }
.close-menu-btn { background-image: url('/images/games/mahjong/lingguang/buttons/btn-back.png'); }

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
