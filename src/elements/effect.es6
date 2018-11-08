/**
 * @class EffectFilter
 */
phina.define("EffectFilter", {
  superClass: "RectangleShape",

  init: function(width, height) {
    this.superInit({
      width: width,
      height: height,
      strokeWidth: 0,
      fill: "rgba(81, 182, 219, 1)"
    });
    this._maxHeight = height;
    this.alpha = 0;
  },

  // update: function(app) {},

  animate: function(cb) {
    this.alpha = 1;
    this.height = 0;

    this.tweener
      .clear()
      .to({ height: this._maxHeight, alpha: 0 }, 800, "easeOutQuad")
      .call(() => {
        if (cb) cb();
      });
  }
});
