/**
 * MainScene
 */
phina.define("MainScene", {
    superClass : "CanvasScene",

    init : function() {
        this.superInit({
            // backgroundColor: 'rgb(0, 0, 0)',
            backgroundColor: MAIN_BACKGROUND_COLOR,
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
        });

        // Map 初期化
        this.map = [];
        for (var col=0; col< GRID_NUM_X; col++){
            this.map[col] = [];
            for (var row=0; row< GRID_NUM_Y; row++){
                // 上部を除く周囲にカベ
                if (col === 0 || col === GRID_NUM_X-1 || row === GRID_NUM_Y-1) {
                    this.map[col][row] = 0; //kabe
                }else{
                    this.map[col][row] = -1; //nothing
                }
            }
        }
        var map = this.map;

        // 当たり判定＆更新用マップ
        var collisionMap = this.collisionMap = [];
        for (var col=0; col< GRID_NUM_X; col++){
            this.collisionMap[col] = [];
            for (var row=0; row< GRID_NUM_Y; row++){
                this.collisionMap[col][row] = this.map[col][row];
            }
        }

        // view set up: mapに応じてスプライトを変える
        this.gameLayer = phina.display.CanvasElement().setPosition(0,0).addChildTo(this);
        for (col=0; col< GRID_NUM_X; col++){
            for (row=0; row< GRID_NUM_Y; row++){
                var b = Block(BLOCK_SIZE, this.map[col][row]).setOrigin(0,0).setPosition(BLOCK_SIZE*col, BLOCK_SIZE*row).addChildTo(this.gameLayer);
            }
        }

        // 数値の初期化==============================
        this.piece = this.createPiece();
        //piece 現在位置
        this._initPos = {
            x: Math.floor(GRID_NUM_X/2)-1,
            y: 0
        }
        this.px = this._initPos.x;
        this.py = this._initPos.y;

        this.timer = 0;
        this.currentLevel = 1;
        this.score = 0;

        this.delay = 80;    // 自然落下の頻度
        this.minDelay = 10;
        this.INIT_RECOVERY_VALUE  = 18;
        this.isSleeping = false;

        // UIとか==============================
        //
        this.timeLabel = phina.display.Label({
            text: "dummy",
            fill: "red",
            fontSize: 40,
        })
        // .setPosition(SCREEN_WIDTH*0.7, SCREEN_HEIGHT*0.1).addChildTo(this);

        this.levelLabel = Label({
            text: this.currentLevel,
            fill: "white",
            fontSize: 30,
        }).setPosition(SCREEN_WIDTH*0.7, SCREEN_HEIGHT*0.1).addChildTo(this);

        this.scoreLabel = Label({
            text: this.score,
            fill: "white",
            fontSize: 30,
        }).setPosition(SCREEN_WIDTH*0.7, SCREEN_HEIGHT*0.2).addChildTo(this);

        this.comboCountLabel = Label({
            text:" ",
            fill: "white",
            fontSize: 24,
        }).setPosition(SCREEN_WIDTH*0.7, SCREEN_HEIGHT*0.3).addChildTo(this);

        this.instructionLabel = Label({
            text: "仮説１：z or xキーで回転するらしい"+'\n'+
                    "仮説２：同じ色同士でくっつけると良いらしい"+'\n'+
                    "仮説３：下のゲージが溜まったら\nSPACEキーを押すと良いらしい",
            fill: "white",
            fontSize: 20,
        }).setPosition(this.comboCountLabel.x, this.comboCountLabel.y*1.8).addChildTo(this);

        // ゲージ
        this.gauge = SpecialGauge(0, GAMEFIELD_HEIGHT+8 ).addChildTo(this);
        // this.gauge.on('pointingStart', ()=>{this.flushAction()});
        this.recoveryValue = this.INIT_RECOVERY_VALUE;
        // this.gaugeDescriptionLabel = Label({
        //     text: "↑溜まったらSpaceキーでなんか使える。\nグループ化したブロックを消せるで",
        //     fill: "white",
        //     fontSize: 18,
        // }).setPosition(this.gauge.width/2+24, this.gauge.y+this.gauge.height*2).addChildTo(this);

        // エフェクト
        this.effectFilter = EffectFilter(GAMEFIELD_WIDTH, GAMEFIELD_HEIGHT).setOrigin(0,1).setPosition(0,GAMEFIELD_HEIGHT).addChildTo(this.gameLayer);
        // this.effectFilter.visible = false;
    },

    update: function (app) {
        if (this.isSleeping) return;
        var p = app.pointing;
        var kb = app.keyboard;
        var map = this.map;
        var piece = this.piece;
        var temp;
        var collisionMap = this.collisionMap;
        var sideFlg = true;
        this.moveFlg = true;
        var rotFlg = true;
        this.gameoverFlg = false;

        // カウントアップを行う
        ++this.timer;

        // いろいろ表示を変える
        this.levelLabel.text = "LEVEL: " + this.currentLevel;
        this.scoreLabel.text = "SCORE : " + ((this.score) |0);
        this.timeLabel.text = "Frame : " + ((this.timer) |0);

        this.levelUpCheck();

        // 時間とともにゲージ回復量が減る
        if (this.timer%16 === 0) this.recoveryValue = Math.max(5, this.recoveryValue-1);

        //key control
        var rightKeyHandler = ()=>{
            for (var x=0;x<piece.length;x++){
                for (var y=0;y<piece[x].length;y++){
                    // hit test
                    if (piece[y][x] != -1){
                        // console.log("checking x,y:", x+this.px+1,y+this.py);
                        // console.log(collisionMap[x+this.px+1]);
                        if (collisionMap[x+this.px+1][y+this.py] != -1){
                            // ピースにいずれかの部分の右側が何かと接触
                            // console.log('kabeda');
                            sideFlg = false;
                        }
                    }
                }
            }
            if (sideFlg === true){
                this.px++;
            }
        }
        if (kb.getKeyDown('right')) rightKeyHandler();
        // if (kb.getKey('right')) {
        //     if (this.timer%KEY_DELAY !== 0 ) return;
        //     keyRightHandler();
        // }

        if (kb.getKeyDown('left')) {
            // if (this.timer%KEY_DELAY !== 0 ) return;
            // console.log("left");

            // hit test
            for (var x=0;x<piece.length;x++){
                for (var y=0;y<piece[x].length;y++){
                    if (piece[y][x] != -1){
                        if (collisionMap[x+this.px-1][y+this.py] != -1){
                            sideFlg = false;
                        }
                    }
                }
            }
            if (sideFlg === true){
                this.px--;
            }
        }

        // z:右回転, x:左回転
        if (kb.getKeyDown('z') || kb.getKeyDown('x')){
            temp = (kb.getKey('z')) ? this.createRotatedPiece(this.piece, true) :  this.createRotatedPiece(this.piece, false);

            // hit test
            for (var x=0;x<temp.length;x++){
                for (var y=0;y<temp[x].length;y++){
                    if (temp[y][x] != -1){
                        if (collisionMap[x+this.px][y+this.py] != -1){
                            rotFlg = false;
                        }
                    }
                }
            }
            if (rotFlg === true){
                this.piece = temp;
            }
        }

        // spaceボタンで特殊
        if (kb.getKeyDown('space')){
            // console.log("space");
            this.flushAction();
        }

        // 落下処理 : 同時に発生させない
        if (kb.getKey('down') && this.timer%KEY_DELAY === 0 ) {
            // 下に入力
            this.stackCheck();
        }
        else if (this.timer%this.delay === 0) {
            //一定時間ごとにブロック自由落下
            this.stackCheck();
        }

        this.setupFieldArray();

        this.drawBlock();

    }, //--update

    setupFieldArray: function(){
        // フィールド配列生成
        // all clear
        for (var col=0; col< GRID_NUM_X; col++){
            for (var row=0; row< GRID_NUM_Y; row++){
                this.map[col][row] = -1;
            }
        }
        // set piece
        for(var x=0;x<this.piece.length;x++){
            for(var y=0;y<this.piece[x].length;y++){
                this.map[x+this.px][y+this.py] = this.piece[y][x];
            }
        }
        // 以前の状態
        for ( col=0; col< GRID_NUM_X; col++){
            for ( row=0; row< GRID_NUM_Y; row++){
                if (this.map[col][row] == -1) this.map[col][row] = this.collisionMap[col][row];
            }
        }
    },

    drawBlock: function(){
        var block = null;

        for (var col=0; col< GRID_NUM_X; col++){
            for (var row=0; row< GRID_NUM_Y; row++){
                block = this.gameLayer.children[row+col*GRID_NUM_Y];
                // this.gameLayer.children[row+col*GRID_NUM_Y].type = this.map[col][row];
                if (this.map[col][row] != -1){
                    block.visible = true;
                    block.setPosition(BLOCK_SIZE*col, BLOCK_SIZE*row);
                    block.type = this.map[col][row];
                } else{
                    block.visible = false;
                }
            }
        }

    },

    flushAction: function(){
        if (!this.gauge.isFull()) return;
        console.log('flush');
        this.isSleeping = true;
        this.gauge.setValue(0);
        this.effectFilter.animate(()=>{
            this.isSleeping = false;
            this.deleteGroup();
        });
    },

    stackCheck: function(){
        // if (!this.isChecking) {

        // hit test
        for (var x=0;x<this.piece.length;x++){
            for (var y=0;y<this.piece[x].length;y++){
                if (this.piece[y][x] != -1){
                    if (this.collisionMap[x+this.px][y+this.py+1] != -1){
                        this.moveFlg = false;
                    }
                }
            }
        }
        if (this.moveFlg === true){
            this.py++;
        } else {
            // 設置 stack
            for (var x=0;x<this.piece.length;x++){
                for (var y=0;y<this.piece[x].length;y++){
                    if (this.piece[y][x] !== -1){
                        if (this.collisionMap[x+this.px][y+this.py] === -1){
                            this.collisionMap[x+this.px][y+this.py] = this.piece[y][x];
                        }
                    }
                }
            }
            // console.log("コリジョン直後",this.collisionMap);

            // グループ化確認
            this.checkConnection();

            // new piece & initialize position
            this.piece = this.createPiece();
            this.px = this._initPos.x;
            this.py = this._initPos.y;

            // ゲームオーバーチェック：ピース初期位置にすでに配置されている場合
            for (var x=0;x<this.piece.length;x++){
                for (var y=0;y<this.piece[x].length;y++){
                    if (this.piece[y][x] !== -1){
                        // console.log(x+this.px,y+this.py);
                        // console.log("コリジョン",this.collisionMap);
                        // console.log("検索位置ブロックのタイプ",this.collisionMap[x+this.px][y+this.py]);
                        if (this.collisionMap[x+this.px][y+this.py] != -1){
                            this.collisionMap[x+this.px][y+this.py] = this.piece[y][x];
                            this.gameoverFlg = true;
                        }
                    }
                }
            }
            if (this.gameoverFlg) {
                console.log('gameover');
                this.isSleeping = true;

                setTimeout(()=>{
                    this.exit({score: this.score});
                    // this.app.replaceScene(EndScene());
                },1500);
            }
            //ゲージ回復
            console.log(this.recoveryValue);
            this.gauge.setValue(this.gauge.getValue()+this.recoveryValue);
            this.recoveryValue = this.INIT_RECOVERY_VALUE;
        }
        // this.isChecking = false;
    },

    checkConnection: function(){
        var map = this.collisionMap;
        var gameLayer = this.gameLayer;
        for (var col=0; col< GRID_NUM_X; col++){
            for (var row=0; row< GRID_NUM_Y; row++){
                let block = this.gameLayer.children[row+col*GRID_NUM_Y];
                block.grouped = false; //一旦初期化
                let type = map[col][row];
                if (0 < type){
                    checkPeriphery(type, col, row);
                }
            }
        }

        // 自分の周りをチェック：再帰処理
        function checkPeriphery(type, col, row, combo=false){
            let _block = gameLayer.children[col*GRID_NUM_Y+row];
            if (!_block.grouped){
                if (combo){_block.grouped = true};
                // console.log("index",col*GRID_NUM_Y+row);
                // console.log( "私のタイプ："+type,"検索したタイプ："+map[col-1][row]);

                if (map[col-1][row] === type) { _block.grouped = true; checkPeriphery(type, col-1, row, true);}
                if (map[col+1][row] === type) { _block.grouped = true; checkPeriphery(type, col+1, row, true);}
                if (map[col][row-1] === type) { _block.grouped = true; checkPeriphery(type, col, row-1, true);}
                if (map[col][row+1] === type) { _block.grouped = true; checkPeriphery(type, col, row+1, true);}
            }
        }
    },

    deleteGroup: function(){
        var map = this.collisionMap;
        var gameLayer = this.gameLayer;
        var type;
        var blockCount = 0;
        var comboCount = 0;
        var tempScore = 0;
        for (var col=0; col< GRID_NUM_X; col++){
            for (var row=0; row< GRID_NUM_Y; row++){
                let block = this.gameLayer.children[row+col*GRID_NUM_Y];
                if (block.grouped) {
                    comboCount++;
                    blockCount = 0;
                    type = map[col][row];
                    checkGroup(type, col, row);
                    // console.log("blockCount",blockCount); //グループ内で消した数
                    tempScore += BASIC_SCORE*comboCount*blockCount;
                }
            }
        }
        // console.log('combo', comboCount);
        tempScore *= comboCount;
        this.score += tempScore;
        this.comboCountLabel.text = comboCount + " Compounds!";

        function checkGroup(type, col, row, comboFlg=false){
            // 無限ループを避けるため、検索済みブロックはgroupedを解除
            let block = gameLayer.children[row+col*GRID_NUM_Y];
            block.grouped = false;

            blockCount++;
            // if (comboFlg)
            map[col][row] = -1; //グループになっている（はずな）ので自分自身は必ず消える
            // console.log( "私のタイプ："+type,"検索したタイプ："+map[col-1][row]);
            if (map[col+1][row] === type) {checkGroup(type, col+1, row);}
            if (map[col-1][row] === type) {checkGroup(type, col-1, row);}
            if (map[col][row+1] === type) {checkGroup(type, col, row+1);}
            if (map[col][row-1] === type) { checkGroup(type, col, row-1);}
        }
    },

    createPiece: function(){
        var PIECE_FRAMES = [
            [
                [-1,-1,-1],
                [-1,1,-1],
                [-1,1,-1]
            ],
            [
                [-1,1,-1],
                [-1,1,-1],
                [-1,-1,-1]
            ]
        ];
        var basePiece = PIECE_FRAMES[Math.randint(0, PIECE_FRAMES.length-1)];
        var piece = [];
        for (var x=0;x<basePiece.length;x++){
            piece[x] = [];
            for (var y=0;y<basePiece[x].length;y++){
                if (basePiece[x][y] != -1){
                    piece[x][y]=Math.randint(1, PIECE_TYPES_COUNT);
                }else{
                    piece[x][y] = basePiece[x][y];
                }
            }
        }
        if (Math.randbool()){
            piece = this.createRotatedPiece(piece, Math.randbool());
        }
        return piece;
    },

    createRotatedPiece: function(piece, cw=true){
        var newPiece = [];

        for (var x=0, x_len=piece.length; x<x_len; x++){
            newPiece[x] = [];
            // console.log(newPiece);
            for (var y=0, y_len=piece[x].length;y<y_len;y++){
                if (cw){
                    // 右回り
                    newPiece[x][y] = piece[(y_len-1)-y][x];
                }else{
                    // 左回り
                    newPiece[x][y] = piece[y][(x_len-1)-x];
                }
            }
        }

        return newPiece;
    },

    // レベルアップ：落下速度を増やす
    levelUpCheck: function(){
        // var border = this.borderList[this.currentLevel]
        if (this.score > BORDER_SCORE_UNIT * this.currentLevel && this.delay > this.minDelay){
            console.log('level up: ', this.currentLevel);
            this.currentLevel++;
            this.delay = Math.max(this.delay-4, this.minDelay);
        }
    },
});
