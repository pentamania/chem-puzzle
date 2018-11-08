/**
 * EndScene
 */
phina.define("ResultScene", {
  superClass: "phina.game.ResultScene",

  init: function(params) {
    this.superInit({
      text: "score",
      message: TITLE_NAME,
      // url:,
      hashtags: "phina_js",
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      backgroundColor: MAIN_BACKGROUND_COLOR
    });
    this.scoreLabel.text = params.score;
    this.messageLabel.text = "レベル：" + params.level;

    this.playButton.onpush = () => {
      // this.app.replaceScene(TitleScene());
      this.exit();
    };
  }
});
