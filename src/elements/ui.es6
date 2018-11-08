/*
 * SpecialGauge
 */
phina.define("SpecialGauge", {
  superClass: "phina.ui.Gauge",

  init: function(x, y, startValue = 50) {
    var opt = {
      width: GAMEFIELD_WIDTH,
      height: 32,
      strokeWidth: 0,
      fill: "rgb(51, 48, 134)",
      value: 0,
      maxValue: 100,
      gaugeColor: "#87c5dd"
      // cornerRadius: 4,
    };
    this.superInit(opt);
    this._maxValue = this.maxValue; //setValueのバグ？対策
    this.setOrigin(0, 0)
      .setPosition(x, y)
      .setValue(startValue);
    // ready
    this.textLabel = Label({
      text: "READY",
      fill: "white",
      fontSize: 20
    });
    this.textLabel.setPosition(this.width / 2, this.height).addChildTo(this);

    // console.log(this._maxValue);
    // this.rotation -= 90; //縦ゲージの場合
  },

  getValue: function() {
    return this._value;
  },

  update: function(app) {
    this.textLabel.visible = this.isFull() ? true : false;
  }
});
