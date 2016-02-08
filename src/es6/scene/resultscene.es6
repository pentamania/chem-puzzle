/**
* EndScene
*/
phina.define("ResultScene", {
    superClass : "phina.game.ResultScene",

    init: function(params) {
        // スコア
        // console.log(params.score);
        this.superInit({
            text: "score",
            message: TITLE_NAME,
            // url:,
            width:    SCREEN_WIDTH,
            height:   SCREEN_HEIGHT,
            backgroundColor: MAIN_BACKGROUND_COLOR
        });
        // this.scoreText.text = params.score;
        this.scoreLabel.text = params.score;
        this.playButton.onpush = ()=>{
            // this.app.replaceScene(TitleScene());
            this.exit();
        }
    },
});
