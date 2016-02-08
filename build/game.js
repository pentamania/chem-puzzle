'use strict';

/**
 * ゲーム用定数作成
 */
var TITLE_NAME = "なんかパズル（仮）";
var SCREEN_WIDTH = 800;
var SCREEN_HEIGHT = 640;
var MAIN_BACKGROUND_COLOR = 'rgb(101, 88, 88)';

var BLOCK_SIZE = 32;
var PIECE_TYPES_COUNT = 3;
var GRID_NUM_X = 9;
var GRID_NUM_Y = 12;
var BORDER_Y = 2;
var GAMEFIELD_WIDTH = BLOCK_SIZE * GRID_NUM_X;
var GAMEFIELD_HEIGHT = BLOCK_SIZE * GRID_NUM_Y;
var KEY_DELAY = 9;

var BASIC_SCORE = 10;
var BORDER_SCORE_UNIT = 20000;
/**
 * リソースの読み込み
 */
var ASSETS = {
    image: {},
    spritesheet: {},
    sound: {}
};

/**
 * ゲーム起動処理
 */
phina.globalize();
phina.main(function () {
    var app = GameApp({
        // startLabel: 'title',
        startLabel: 'main',
        // assets: ASSETS,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        fps: 60
    });
    app.run();
});


/*
 * block
 */
phina.define("Block", {
    superClass: "Sprite",

    init: function init(size) {
        var type = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

        // this.superInit("player", PLAYER_WIDTH, PLAYER_HEIGHT);

        // 仮ブロックイメージ
        var opt = {
            width: size,
            height: size,
            strokeWidth: 2,
            fill: "rgb(51, 48, 134)",
            radius: size / 2,
            sides: 6
        };
        var c = Canvas();
        // c.setSize(size, size);
        // c.fillRect(0,0,size,size);
        this.superInit(c, size, size);

        this.colors = ["rgb(98, 158, 162)", "rgb(40, 186, 55)", "rgb(200, 39, 50)", "rgb(29, 99, 181)"];
        if (type == 0) {
            this.tempImage = phina.display.RectangleShape(opt).setOrigin(0, 0).addChildTo(this);
        } else {
            this.tempImage = phina.display.PolygonShape(opt).setOrigin(0, 0).addChildTo(this);
        }
        // this.tempImage.padding = 0;

        this.type = type;
        this.frame = 0; //種類によって変える
        this.grouped = false;
    },
    update: function update(app) {
        // if (this.type > 10){
        this.tempImage.fill = this.colors[this.type];
        if (this.grouped) {
            this.tempImage.stroke = "rgb(215, 241, 208)";
        } else {
            // this.tempImage.fill = this.colors[this.type];
            this.tempImage.stroke = "transparent";
        }
    }

});


/**
* EffectFilter
*/
phina.define("EffectFilter", {
    superClass: "RectangleShape",

    init: function init(width, height) {
        this.fullHeight = height;
        var opt = {
            width: width,
            height: height,
            strokeWidth: 0,
            fill: "rgba(81, 182, 219, 1)"
        };
        this.superInit(opt);
        // this.padding = 0;
        this.alpha = 0;
        // console.log(this);
    },
    update: function update(app) {},
    animate: function animate(cb) {
        this.alpha = 1;
        this.height = 0;

        this.tweener.clear().to({ height: this.fullHeight, alpha: 0 }, 800, "easeOutQuad").call(function () {
            // console.log("clear",this.alpha);
            if (cb) cb();
        });
    }
});


/*
 * SpecialGauge
 */
phina.define("SpecialGauge", {
    superClass: "phina.ui.Gauge",

    init: function init(x, y) {
        var startValue = arguments.length <= 2 || arguments[2] === undefined ? 50 : arguments[2];

        var opt = {
            width: GAMEFIELD_WIDTH,
            height: 32,
            strokeWidth: 0,
            fill: "rgb(51, 48, 134)",
            value: 0,
            maxValue: 100,
            gaugeColor: '#87c5dd'
        };
        // cornerRadius: 4,
        this.superInit(opt);
        this._maxValue = this.maxValue; //setValueのバグ？対策
        this.setOrigin(0, 0).setPosition(x, y).setValue(startValue);
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
    getValue: function getValue() {
        return this._value;
    },
    update: function update(app) {
        this.textLabel.visible = this.isFull() ? true : false;
    }

});


/**
 * MainScene
 */
phina.define("MainScene", {
    superClass: "CanvasScene",

    init: function init() {
        this.superInit({
            // backgroundColor: 'rgb(0, 0, 0)',
            backgroundColor: MAIN_BACKGROUND_COLOR,
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT
        });

        // Map 初期化
        this.map = [];
        for (var col = 0; col < GRID_NUM_X; col++) {
            this.map[col] = [];
            for (var row = 0; row < GRID_NUM_Y; row++) {
                // 上部を除く周囲にカベ
                if (col === 0 || col === GRID_NUM_X - 1 || row === GRID_NUM_Y - 1) {
                    this.map[col][row] = 0; //kabe
                } else {
                        this.map[col][row] = -1; //nothing
                    }
            }
        }
        var map = this.map;

        // 当たり判定＆更新用マップ
        var collisionMap = this.collisionMap = [];
        for (var col = 0; col < GRID_NUM_X; col++) {
            this.collisionMap[col] = [];
            for (var row = 0; row < GRID_NUM_Y; row++) {
                this.collisionMap[col][row] = this.map[col][row];
            }
        }

        // view set up: mapに応じてスプライトを変える
        this.gameLayer = phina.display.CanvasElement().setPosition(0, 0).addChildTo(this);
        for (col = 0; col < GRID_NUM_X; col++) {
            for (row = 0; row < GRID_NUM_Y; row++) {
                var b = Block(BLOCK_SIZE, this.map[col][row]).setOrigin(0, 0).setPosition(BLOCK_SIZE * col, BLOCK_SIZE * row).addChildTo(this.gameLayer);
            }
        }

        // 数値の初期化==============================
        this.piece = this.createPiece();
        //piece 現在位置
        this._initPos = {
            x: Math.floor(GRID_NUM_X / 2) - 1,
            y: 0
        };
        this.px = this._initPos.x;
        this.py = this._initPos.y;

        this.timer = 0;
        this.currentLevel = 1;
        this.score = 0;

        this.delay = 80; // 自然落下の頻度
        this.minDelay = 10;
        this.INIT_RECOVERY_VALUE = 18;
        this.isSleeping = false;

        // UIとか==============================
        //
        this.timeLabel = phina.display.Label({
            text: "dummy",
            fill: "red",
            fontSize: 40
        });
        // .setPosition(SCREEN_WIDTH*0.7, SCREEN_HEIGHT*0.1).addChildTo(this);

        this.levelLabel = Label({
            text: this.currentLevel,
            fill: "white",
            fontSize: 30
        }).setPosition(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.1).addChildTo(this);

        this.scoreLabel = Label({
            text: this.score,
            fill: "white",
            fontSize: 30
        }).setPosition(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.2).addChildTo(this);

        this.comboCountLabel = Label({
            text: " ",
            fill: "white",
            fontSize: 24
        }).setPosition(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.3).addChildTo(this);

        this.instructionLabel = Label({
            text: "仮説１：z or xキーで回転するらしい" + '\n' + "仮説２：同じ色同士でくっつけると良いらしい" + '\n' + "仮説３：下のゲージが溜まったら\nSPACEキーを押すと良いらしい",
            fill: "white",
            fontSize: 20
        }).setPosition(this.comboCountLabel.x, this.comboCountLabel.y * 1.8).addChildTo(this);

        // ゲージ
        this.gauge = SpecialGauge(0, GAMEFIELD_HEIGHT + 8).addChildTo(this);
        // this.gauge.on('pointingStart', ()=>{this.flushAction()});
        this.recoveryValue = this.INIT_RECOVERY_VALUE;
        // this.gaugeDescriptionLabel = Label({
        //     text: "↑溜まったらSpaceキーでなんか使える。\nグループ化したブロックを消せるで",
        //     fill: "white",
        //     fontSize: 18,
        // }).setPosition(this.gauge.width/2+24, this.gauge.y+this.gauge.height*2).addChildTo(this);

        // エフェクト
        this.effectFilter = EffectFilter(GAMEFIELD_WIDTH, GAMEFIELD_HEIGHT).setOrigin(0, 1).setPosition(0, GAMEFIELD_HEIGHT).addChildTo(this.gameLayer);
        // this.effectFilter.visible = false;
    },

    update: function update(app) {
        var _this = this;

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
        this.scoreLabel.text = "SCORE : " + (this.score | 0);
        this.timeLabel.text = "Frame : " + (this.timer | 0);

        this.levelUpCheck();

        // 時間とともにゲージ回復量が減る
        if (this.timer % 16 === 0) this.recoveryValue = Math.max(5, this.recoveryValue - 1);

        //key control
        var rightKeyHandler = function rightKeyHandler() {
            for (var x = 0; x < piece.length; x++) {
                for (var y = 0; y < piece[x].length; y++) {
                    // hit test
                    if (piece[y][x] != -1) {
                        // console.log("checking x,y:", x+this.px+1,y+this.py);
                        // console.log(collisionMap[x+this.px+1]);
                        if (collisionMap[x + _this.px + 1][y + _this.py] != -1) {
                            // ピースにいずれかの部分の右側が何かと接触
                            // console.log('kabeda');
                            sideFlg = false;
                        }
                    }
                }
            }
            if (sideFlg === true) {
                _this.px++;
            }
        };
        if (kb.getKeyDown('right')) rightKeyHandler();
        // if (kb.getKey('right')) {
        //     if (this.timer%KEY_DELAY !== 0 ) return;
        //     keyRightHandler();
        // }

        if (kb.getKeyDown('left')) {
            // if (this.timer%KEY_DELAY !== 0 ) return;
            // console.log("left");

            // hit test
            for (var x = 0; x < piece.length; x++) {
                for (var y = 0; y < piece[x].length; y++) {
                    if (piece[y][x] != -1) {
                        if (collisionMap[x + this.px - 1][y + this.py] != -1) {
                            sideFlg = false;
                        }
                    }
                }
            }
            if (sideFlg === true) {
                this.px--;
            }
        }

        // z:右回転, x:左回転
        if (kb.getKeyDown('z') || kb.getKeyDown('x')) {
            temp = kb.getKey('z') ? this.createRotatedPiece(this.piece, true) : this.createRotatedPiece(this.piece, false);

            // hit test
            for (var x = 0; x < temp.length; x++) {
                for (var y = 0; y < temp[x].length; y++) {
                    if (temp[y][x] != -1) {
                        if (collisionMap[x + this.px][y + this.py] != -1) {
                            rotFlg = false;
                        }
                    }
                }
            }
            if (rotFlg === true) {
                this.piece = temp;
            }
        }

        // spaceボタンで特殊
        if (kb.getKeyDown('space')) {
            // console.log("space");
            this.flushAction();
        }

        // 落下処理 : 同時に発生させない
        if (kb.getKey('down') && this.timer % KEY_DELAY === 0) {
            // 下に入力
            this.stackCheck();
        } else if (this.timer % this.delay === 0) {
            //一定時間ごとにブロック自由落下
            this.stackCheck();
        }

        this.setupFieldArray();

        this.drawBlock();
    }, //--update

    setupFieldArray: function setupFieldArray() {
        // フィールド配列生成
        // all clear
        for (var col = 0; col < GRID_NUM_X; col++) {
            for (var row = 0; row < GRID_NUM_Y; row++) {
                this.map[col][row] = -1;
            }
        }
        // set piece
        for (var x = 0; x < this.piece.length; x++) {
            for (var y = 0; y < this.piece[x].length; y++) {
                this.map[x + this.px][y + this.py] = this.piece[y][x];
            }
        }
        // 以前の状態
        for (col = 0; col < GRID_NUM_X; col++) {
            for (row = 0; row < GRID_NUM_Y; row++) {
                if (this.map[col][row] == -1) this.map[col][row] = this.collisionMap[col][row];
            }
        }
    },

    drawBlock: function drawBlock() {
        var block = null;

        for (var col = 0; col < GRID_NUM_X; col++) {
            for (var row = 0; row < GRID_NUM_Y; row++) {
                block = this.gameLayer.children[row + col * GRID_NUM_Y];
                // this.gameLayer.children[row+col*GRID_NUM_Y].type = this.map[col][row];
                if (this.map[col][row] != -1) {
                    block.visible = true;
                    block.setPosition(BLOCK_SIZE * col, BLOCK_SIZE * row);
                    block.type = this.map[col][row];
                } else {
                    block.visible = false;
                }
            }
        }
    },

    flushAction: function flushAction() {
        var _this2 = this;

        if (!this.gauge.isFull()) return;
        console.log('flush');
        this.isSleeping = true;
        this.gauge.setValue(0);
        this.effectFilter.animate(function () {
            _this2.isSleeping = false;
            _this2.deleteGroup();
        });
    },

    stackCheck: function stackCheck() {
        var _this3 = this;

        // if (!this.isChecking) {

        // hit test
        for (var x = 0; x < this.piece.length; x++) {
            for (var y = 0; y < this.piece[x].length; y++) {
                if (this.piece[y][x] != -1) {
                    if (this.collisionMap[x + this.px][y + this.py + 1] != -1) {
                        this.moveFlg = false;
                    }
                }
            }
        }
        if (this.moveFlg === true) {
            this.py++;
        } else {
            // 設置 stack
            for (var x = 0; x < this.piece.length; x++) {
                for (var y = 0; y < this.piece[x].length; y++) {
                    if (this.piece[y][x] !== -1) {
                        if (this.collisionMap[x + this.px][y + this.py] === -1) {
                            this.collisionMap[x + this.px][y + this.py] = this.piece[y][x];
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
            for (var x = 0; x < this.piece.length; x++) {
                for (var y = 0; y < this.piece[x].length; y++) {
                    if (this.piece[y][x] !== -1) {
                        // console.log(x+this.px,y+this.py);
                        // console.log("コリジョン",this.collisionMap);
                        // console.log("検索位置ブロックのタイプ",this.collisionMap[x+this.px][y+this.py]);
                        if (this.collisionMap[x + this.px][y + this.py] != -1) {
                            this.collisionMap[x + this.px][y + this.py] = this.piece[y][x];
                            this.gameoverFlg = true;
                        }
                    }
                }
            }
            if (this.gameoverFlg) {
                console.log('gameover');
                this.isSleeping = true;

                setTimeout(function () {
                    _this3.exit({ score: _this3.score });
                    // this.app.replaceScene(EndScene());
                }, 1500);
            }
            //ゲージ回復
            console.log(this.recoveryValue);
            this.gauge.setValue(this.gauge.getValue() + this.recoveryValue);
            this.recoveryValue = this.INIT_RECOVERY_VALUE;
        }
        // this.isChecking = false;
    },

    checkConnection: function checkConnection() {
        var map = this.collisionMap;
        var gameLayer = this.gameLayer;
        for (var col = 0; col < GRID_NUM_X; col++) {
            for (var row = 0; row < GRID_NUM_Y; row++) {
                var block = this.gameLayer.children[row + col * GRID_NUM_Y];
                block.grouped = false; //一旦初期化
                var type = map[col][row];
                if (0 < type) {
                    checkPeriphery(type, col, row);
                }
            }
        }

        // 自分の周りをチェック：再帰処理
        function checkPeriphery(type, col, row) {
            var combo = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

            var _block = gameLayer.children[col * GRID_NUM_Y + row];
            if (!_block.grouped) {
                if (combo) {
                    _block.grouped = true;
                };
                // console.log("index",col*GRID_NUM_Y+row);
                // console.log( "私のタイプ："+type,"検索したタイプ："+map[col-1][row]);

                if (map[col - 1][row] === type) {
                    _block.grouped = true;checkPeriphery(type, col - 1, row, true);
                }
                if (map[col + 1][row] === type) {
                    _block.grouped = true;checkPeriphery(type, col + 1, row, true);
                }
                if (map[col][row - 1] === type) {
                    _block.grouped = true;checkPeriphery(type, col, row - 1, true);
                }
                if (map[col][row + 1] === type) {
                    _block.grouped = true;checkPeriphery(type, col, row + 1, true);
                }
            }
        }
    },

    deleteGroup: function deleteGroup() {
        var map = this.collisionMap;
        var gameLayer = this.gameLayer;
        var type;
        var blockCount = 0;
        var comboCount = 0;
        var tempScore = 0;
        for (var col = 0; col < GRID_NUM_X; col++) {
            for (var row = 0; row < GRID_NUM_Y; row++) {
                var block = this.gameLayer.children[row + col * GRID_NUM_Y];
                if (block.grouped) {
                    comboCount++;
                    blockCount = 0;
                    type = map[col][row];
                    checkGroup(type, col, row);
                    // console.log("blockCount",blockCount); //グループ内で消した数
                    tempScore += BASIC_SCORE * comboCount * blockCount;
                }
            }
        }
        // console.log('combo', comboCount);
        tempScore *= comboCount;
        this.score += tempScore;
        this.comboCountLabel.text = comboCount + " Compounds!";

        function checkGroup(type, col, row) {
            var comboFlg = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

            // 無限ループを避けるため、検索済みブロックはgroupedを解除
            var block = gameLayer.children[row + col * GRID_NUM_Y];
            block.grouped = false;

            blockCount++;
            // if (comboFlg)
            map[col][row] = -1; //グループになっている（はずな）ので自分自身は必ず消える
            // console.log( "私のタイプ："+type,"検索したタイプ："+map[col-1][row]);
            if (map[col + 1][row] === type) {
                checkGroup(type, col + 1, row);
            }
            if (map[col - 1][row] === type) {
                checkGroup(type, col - 1, row);
            }
            if (map[col][row + 1] === type) {
                checkGroup(type, col, row + 1);
            }
            if (map[col][row - 1] === type) {
                checkGroup(type, col, row - 1);
            }
        }
    },

    createPiece: function createPiece() {
        var PIECE_FRAMES = [[[-1, -1, -1], [-1, 1, -1], [-1, 1, -1]], [[-1, 1, -1], [-1, 1, -1], [-1, -1, -1]]];
        var basePiece = PIECE_FRAMES[Math.randint(0, PIECE_FRAMES.length - 1)];
        var piece = [];
        for (var x = 0; x < basePiece.length; x++) {
            piece[x] = [];
            for (var y = 0; y < basePiece[x].length; y++) {
                if (basePiece[x][y] != -1) {
                    piece[x][y] = Math.randint(1, PIECE_TYPES_COUNT);
                } else {
                    piece[x][y] = basePiece[x][y];
                }
            }
        }
        if (Math.randbool()) {
            piece = this.createRotatedPiece(piece, Math.randbool());
        }
        return piece;
    },

    createRotatedPiece: function createRotatedPiece(piece) {
        var cw = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

        var newPiece = [];

        for (var x = 0, x_len = piece.length; x < x_len; x++) {
            newPiece[x] = [];
            // console.log(newPiece);
            for (var y = 0, y_len = piece[x].length; y < y_len; y++) {
                if (cw) {
                    // 右回り
                    newPiece[x][y] = piece[y_len - 1 - y][x];
                } else {
                    // 左回り
                    newPiece[x][y] = piece[y][x_len - 1 - x];
                }
            }
        }

        return newPiece;
    },

    // レベルアップ：落下速度を増やす
    levelUpCheck: function levelUpCheck() {
        // var border = this.borderList[this.currentLevel]
        if (this.score > BORDER_SCORE_UNIT * this.currentLevel && this.delay > this.minDelay) {
            console.log('level up: ', this.currentLevel);
            this.currentLevel++;
            this.delay = Math.max(this.delay - 4, this.minDelay);
        }
    }
});


/**
* EndScene
*/
phina.define("ResultScene", {
    superClass: "phina.game.ResultScene",

    init: function init(params) {
        var _this = this;

        // スコア
        // console.log(params.score);
        this.superInit({
            text: "score",
            message: TITLE_NAME,
            // url:,
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT,
            backgroundColor: MAIN_BACKGROUND_COLOR
        });
        // this.scoreText.text = params.score;
        this.scoreLabel.text = params.score;
        this.playButton.onpush = function () {
            // this.app.replaceScene(TitleScene());
            _this.exit();
        };
    }
});


/**
 * TitleScene
 */
phina.define("TitleScene", {
    superClass: "phina.game.TitleScene",
    init: function init() {
        var _this = this;

        this.superInit({
            title: TITLE_NAME,
            backgroundColor: MAIN_BACKGROUND_COLOR,
            width: SCREEN_WIDTH,
            height: SCREEN_HEIGHT
        });
        this.polygon = phina.display.PolygonShape({
            fill: "rgb(133, 226, 77)",
            stroke: "transparent",
            sides: 6,
            radius: 64
        }).setPosition(SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2).addChildTo(this);

        this.on('keyup', function () {
            // this.app.replaceScene(MainScene());
            _this.exit();
        });
        // this.on('pointstart', ()=> {
        //     this.app.replaceScene(MainScene());
        // });
    },
    update: function update() {
        this.touchLabel.alpha -= 0.02;
        if (this.touchLabel.alpha < 0) this.touchLabel.alpha = 1;
    }
});