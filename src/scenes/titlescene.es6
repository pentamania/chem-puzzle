
/**
 * TitleScene
 */
phina.define("TitleScene", {
    superClass : "phina.game.TitleScene",

    init: function() {
        this.superInit({
            title: TITLE_NAME,
            backgroundColor: MAIN_BACKGROUND_COLOR,
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
        });

        this.polygon = phina.display.PolygonShape({
            fill: "rgb(133, 226, 77)",
            stroke: "transparent",
            sides: 6,
            radius: 64
        })
        .setPosition(SCREEN_WIDTH/2,SCREEN_HEIGHT/2)
        .addChildTo(this);

        this.on('keyup', ()=> {
            // this.app.replaceScene(MainScene());
            this.exit();
        });
        // this.on('pointstart', ()=> {
        //     this.app.replaceScene(MainScene());
        // });
    },

    update: function() {
        this.touchLabel.alpha -= 0.02;
        if (this.touchLabel.alpha <= 0) this.touchLabel.alpha = 1;
    }
});
