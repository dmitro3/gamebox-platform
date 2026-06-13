/**
 * 顶栏倍数光柱：按顶栏图 intrinsic 尺寸比例绘制，随图片等比缩放不偏位。
 */
(function (global) {
  // 与 bake_top_header_mults.py 检测的凹槽内框一致（top-header-slots.json）
  var MULT_SLOTS = [
    { m: 1, left: 0.072512, top: 0.57906, width: 0.204351, height: 0.320513, fill: 0.26, glow: 0.32 },
    { m: 2, left: 0.300593, top: 0.57906, width: 0.202373, height: 0.320513, fill: 0.42, glow: 0.48 },
    { m: 3, left: 0.526697, top: 0.57906, width: 0.199736, height: 0.320513, fill: 0.58, glow: 0.64 },
    { m: 5, left: 0.750165, top: 0.57906, width: 0.174028, height: 0.318376, fill: 0.82, glow: 0.95 }
  ];

  function MultCanvas(artEl, imgEl, canvasEl) {
    this.art = artEl;
    this.img = imgEl;
    this.canvas = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    this.activeIdx = 0;
    this._pulse = 0;
    this._raf = null;

    var self = this;
    this._onResize = function () { self.resize(); self.draw(); };
    window.addEventListener('resize', this._onResize);
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._onResize);
      this._ro.observe(artEl);
    }
    if (imgEl.complete) {
      this.resize();
      this.draw();
    } else {
      imgEl.addEventListener('load', this._onResize);
    }
  }

  MultCanvas.prototype.destroy = function () {
    window.removeEventListener('resize', this._onResize);
    if (this._ro) this._ro.disconnect();
    if (this._raf) cancelAnimationFrame(this._raf);
  };

  MultCanvas.prototype.setActive = function (idx) {
    this.activeIdx = Math.max(0, Math.min(idx, MULT_SLOTS.length - 1));
    this.draw();
  };

  MultCanvas.prototype.resize = function () {
    var rect = this.art.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(1, Math.round(rect.width));
    var h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.displayW = w;
    this.displayH = h;
  };

  MultCanvas.prototype._slotRect = function (slot) {
    var padX = slot.width * 0.1;
    var padB = slot.height * 0.14;
    var x = slot.left * this.displayW + padX * this.displayW;
    var y = slot.top * this.displayH;
    var w = slot.width * this.displayW - padX * 2 * this.displayW;
    var h = slot.height * this.displayH;
    return { x: x, y: y, w: w, h: h, padB: padB * this.displayH };
  };

  MultCanvas.prototype._drawFill = function (slot, isActive, pulse) {
    var r = this._slotRect(slot);
    var fillH = r.h * slot.fill * (isActive ? 1 : 0.35);
    var x = r.x;
    var y = r.y + r.h - r.padB - fillH;
    var w = r.w;
    var h = fillH;
    var radius = Math.min(8, w * 0.12);

    var g = this.ctx.createLinearGradient(x, y, x, y + h);
    var boost = isActive ? (1 + pulse * 0.25) : 0.4;
    var topA = 0.12 * slot.glow * boost;
    var midA = 0.28 * slot.glow * boost;
    var botA = 0.38 * slot.glow * boost;
    g.addColorStop(0, 'rgba(255, 236, 150, ' + topA + ')');
    g.addColorStop(0.45, 'rgba(255, 205, 70, ' + midA + ')');
    g.addColorStop(1, 'rgba(210, 145, 40, ' + botA + ')');

    this.ctx.save();
    this._roundRect(x, y, w, h, radius);
    this.ctx.fillStyle = g;
    this.ctx.fill();

    if (isActive) {
      this.ctx.shadowColor = 'rgba(255, 210, 60, ' + (0.35 + pulse * 0.45) * slot.glow + ')';
      this.ctx.shadowBlur = 10 + slot.m * 3 + pulse * 12;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      if (slot.m >= 5) {
        var shine = this.ctx.createLinearGradient(x, y, x + w, y);
        shine.addColorStop(0, 'rgba(255, 255, 220, 0)');
        shine.addColorStop(0.5, 'rgba(255, 255, 200, ' + (0.15 + pulse * 0.2) + ')');
        shine.addColorStop(1, 'rgba(255, 255, 220, 0)');
        this._roundRect(x, y, w, h, radius);
        this.ctx.fillStyle = shine;
        this.ctx.fill();
      }
    }
    this.ctx.restore();
  };

  MultCanvas.prototype._roundRect = function (x, y, w, h, r) {
    var ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  MultCanvas.prototype.draw = function () {
    if (!this.displayW) return;
    this.ctx.clearRect(0, 0, this.displayW, this.displayH);
    var self = this;
    MULT_SLOTS.forEach(function (slot, i) {
      self._drawFill(slot, i === self.activeIdx, self._pulse);
    });
  };

  MultCanvas.prototype.startPulse = function () {
    var self = this;
    if (this._raf) return;
    var t0 = performance.now();
    function tick(now) {
      self._pulse = 0.5 + 0.5 * Math.sin((now - t0) * 0.004);
      self.draw();
      self._raf = requestAnimationFrame(tick);
    }
    this._raf = requestAnimationFrame(tick);
  };

  MultCanvas.prototype.stopPulse = function () {
    if (this._raf) {
      cancelAnimationFrame(this._raf);
      this._raf = null;
    }
    this._pulse = 0;
    this.draw();
  };

  global.MjMultCanvas = {
    create: function (artEl, imgEl, canvasEl) {
      var mc = new MultCanvas(artEl, imgEl, canvasEl);
      mc.startPulse();
      return mc;
    },
    slots: MULT_SLOTS
  };
})(window);
