/**
* EffectFilter
*/
phina.define("EffectFilter", {
    superClass: "RectangleShape",

    init: function(width, height){
        this.fullHeight = height;
        var opt = {
           width: width,
           height: height,
           strokeWidth: 0,
           fill:"rgba(81, 182, 219, 1)"
        };
        this.superInit(opt);
        // this.padding = 0;
        this.alpha = 0;
        // console.log(this);
    },
   update: function(app) {

   },
    animate: function(cb) {
        this.alpha = 1;
        this.height = 0;

        this.tweener.clear()
        .to({height:this.fullHeight, alpha:0}, 800, "easeOutQuad")
        .call(()=>{
            // console.log("clear",this.alpha);
            if(cb) cb();
        })
    }
});
