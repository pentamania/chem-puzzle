/*
 * block
 */
phina.define("Block", {
    superClass: "Sprite",

    init: function(size, type=0) {
        // this.superInit("player", PLAYER_WIDTH, PLAYER_HEIGHT);

        // 仮ブロックイメージ
        var opt = {
            width: size,
            height: size,
            strokeWidth: 2,
            fill: "rgb(51, 48, 134)",
            radius: size/2,
            sides: 6,
        };
    	var c = Canvas();
        // c.setSize(size, size);
        // c.fillRect(0,0,size,size);
        this.superInit(c,size,size);

        this.colors = ["rgb(98, 158, 162)","rgb(40, 186, 55)","rgb(200, 39, 50)","rgb(29, 99, 181)"];
        if (type == 0){
            this.tempImage = phina.display.RectangleShape(opt).setOrigin(0,0).addChildTo(this);
        } else {
            this.tempImage = phina.display.PolygonShape(opt).setOrigin(0,0).addChildTo(this);
        }
        // this.tempImage.padding = 0;

        this.type = type;
        this.frame = 0; //種類によって変える
        this.grouped = false;
    },

    update: function(app) {
        // if (this.type > 10){
        this.tempImage.fill = this.colors[this.type];
        if(this.grouped){
            this.tempImage.stroke = "rgb(215, 241, 208)";
        } else {
            // this.tempImage.fill = this.colors[this.type];
            this.tempImage.stroke = "transparent";
        }

    },

});
