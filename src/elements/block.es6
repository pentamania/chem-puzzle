/**
 * @class  Block
 *
 */
phina.namespace(function() {
  const BLOCK_COLORS = [
    "rgb(98, 158, 162)",
    "rgb(40, 186, 55)",
    "rgb(200, 39, 50)",
    "rgb(29, 99, 181)"
  ];

  phina.define("Block", {
    superClass: "Sprite",

    init: function(size, type = 0) {
      // this.superInit("player", PLAYER_WIDTH, PLAYER_HEIGHT);
      var c = Canvas(); // 仮
      this.superInit(c, size, size);

      // 仮ブロックイメージ
      var opt = {
        width: size,
        height: size,
        strokeWidth: 2,
        fill: "rgb(51, 48, 134)",
        radius: size / 2,
        sides: 6
      };

      if (type == 0) {
        this.tempImage = phina.display
          .RectangleShape(opt)
          .setOrigin(0, 0)
          .addChildTo(this);
      } else {
        this.tempImage = phina.display
          .PolygonShape(opt)
          .setOrigin(0, 0)
          .addChildTo(this);
      }

      this.type = type;
      this.grouped = false;
      // this.frame = 0; //種類によって変える
    },

    update: function(app) {
      /* TODO: 無駄な処理が多いのであとで修正 */
      this.tempImage.fill = BLOCK_COLORS[this.type];
      if (this.grouped) {
        this.tempImage.stroke = "rgb(215, 241, 208)";
      } else {
        // this.tempImage.fill = BLOCK_COLORS[this.type];
        this.tempImage.stroke = "transparent";
      }
    }
  });
});
