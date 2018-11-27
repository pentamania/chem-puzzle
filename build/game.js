

/**
 * ゲーム用定数作成
 */
var TITLE_NAME = "なんかパズル（仮）";
var SCREEN_WIDTH = 800;
var SCREEN_HEIGHT = 640;
var MAIN_BACKGROUND_COLOR = "rgb(101, 88, 88)";
// const ASSETS = {
//     image: {},
//     sound: {
//         'drop': './assets/kick.mp3'
//     },
// };

/**
 * ゲーム起動処理
 */
phina.globalize();

phina.main(function () {
  var app = GameApp({
    // startLabel: 'result',
    startLabel: "main",
    // assets: ASSETS,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    fps: 60
  });

  app.run();
});


/**
 * @class  Block
 *
 */
phina.namespace(function () {
  var BLOCK_COLORS = ["rgb(98, 158, 162)", "rgb(40, 186, 55)", "rgb(200, 39, 50)", "rgb(29, 99, 181)"];

  phina.define("Block", {
    superClass: "Sprite",

    init: function init(size) {
      var type = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

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
        this.tempImage = phina.display.RectangleShape(opt).setOrigin(0, 0).addChildTo(this);
      } else {
        this.tempImage = phina.display.PolygonShape(opt).setOrigin(0, 0).addChildTo(this);
      }

      this.type = type;
      this.grouped = false;
      // this.frame = 0; //種類によって変える
    },

    update: function update(app) {
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


/**
 * @class EffectFilter
 */
phina.define("EffectFilter", {
  superClass: "RectangleShape",

  init: function init(width, height) {
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

  animate: function animate(cb) {
    this.alpha = 1;
    this.height = 0;

    this.tweener.clear().to({ height: this._maxHeight, alpha: 0 }, 800, "easeOutQuad").call(function () {
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
    var width = arguments.length <= 2 || arguments[2] === undefined ? 100 : arguments[2];
    var startValue = arguments.length <= 3 || arguments[3] === undefined ? 50 : arguments[3];

    var opt = {
      width: width,
      height: 32,
      strokeWidth: 0,
      value: 0,
      maxValue: 100,
      fill: "rgb(51, 48, 134)",
      gaugeColor: "#87c5dd"
      // cornerRadius: 4,
    };
    this.superInit(opt);
    this._maxValue = this.maxValue; //setValueのバグ？対策
    this.setOrigin(0, 0).setPosition(x, y).setValue(startValue);

    this.textLabel = Label({
      text: "READY",
      fill: "white",
      fontSize: 20
    }).setPosition(this.width / 2, this.height).addChildTo(this);

    // this.rotation -= 90; //縦ゲージにする場合
  },

  getValue: function getValue() {
    return this._value;
  },

  update: function update(app) {
    this.textLabel.visible = this.isFull() ? true : false;
  }
});


phina.namespace(function () {
  var PIECE_TYPES_NUM = 3; // TODO:Type表配列を作ってそのlengthで算出
  // TODO: マジックナンバーの修正
  var BLOCK_TYPES = {
    "EMPTY": -1,
    "WALL": 0,
    "RED": 1,
    "BLUE": 2,
    //...
    "CATALYST": 100
  };

  var BLOCK_SIZE = 32;
  var FIELD_GRID_X = 9;
  var FIELD_GRID_Y = 12;
  var GAMEFIELD_WIDTH = BLOCK_SIZE * FIELD_GRID_X;
  var GAMEFIELD_HEIGHT = BLOCK_SIZE * FIELD_GRID_Y;
  var PIECE_INIT_POSITION = {
    x: Math.floor(FIELD_GRID_X / 2) - 1,
    y: 0
  };

  var SCORE_BASIC = 10;
  var LVUP_SCORE_BORDER_UNIT = 14000;

  var SP_RECOVERY_VALUE_INIT = 20;
  var SP_RECOVERY_VALUE_MIN = 4;
  var SP_GAUGE_DECREASE_INTERVAL = 16;

  var DROP_INTERVAL_INIT = 40; // 落下待機の初期値
  var DROP_INTERVAL_MIN = 8; // 落下待機値最小（低いほど落下速度高）
  var KEY_INPUT_INTERVAL = 4; // 押しっぱなしを受け付けるフレーム間隔

  /**
   * 壁と空白部分のみの初期mapを生成
   * TODO: 引数で汎化する？
   * @return {NxM_matrix}
   */
  var createInitialMap = function createInitialMap() {
    var map = [];
    for (var col = 0; col < FIELD_GRID_X; col++) {
      map[col] = [];
      for (var row = 0; row < FIELD_GRID_Y; row++) {
        // 上部を除く周囲にカベ
        if (col === 0 || col === FIELD_GRID_X - 1 || row === FIELD_GRID_Y - 1) {
          map[col][row] = BLOCK_TYPES["WALL"];
        } else {
          map[col][row] = BLOCK_TYPES["EMPTY"];
        }
      }
    }
    return map;
  };

  // prettier-ignore
  var PIECE_FRAMES = [
  // [
  //   [-1, -1, -1],
  //   [-1, 1, -1],
  //   [-1, 1, -1]
  // ],
  [[-1, 1, -1], [-1, 1, -1], [-1, -1, -1]]];

  /**
   * ベースとなるFRAMEを改変してNxMのピース行列配列を返す
   * 現在は3x3のみ
   * FIXME: 回転できてない不具合
   * @return {NxM_matrix}
   */
  var initializePiece = function initializePiece(piece) {
    if (piece == null) piece = [].concat(PIECE_FRAMES[0]);

    // /* ベースとなるピース配列をランダム選択 */
    // const basePiece = PIECE_FRAMES[Math.randint(0, PIECE_FRAMES.length - 1)];
    var basePiece = PIECE_FRAMES[0];

    for (var x = 0; x < basePiece.length; x++) {
      for (var y = 0; y < basePiece[x].length; y++) {
        if (basePiece[x][y] !== BLOCK_TYPES["EMPTY"]) {
          // ブロック部分（-1以外）をランダムな数字に変える
          piece[x][y] = Math.randint(1, PIECE_TYPES_NUM);
        } else {
          // 空白（-1）はそのまま
          piece[x][y] = basePiece[x][y];
        }
      }
    }

    // ランダムで回転
    if (Math.randbool()) {
      piece = getRotatedPiece(piece, Math.randbool());
      // console.log("rotated",piece);
    } else {
        // console.log("no rotate", piece);
      }

    return piece;
  };

  /**
   * 回転したピースを返す: 元配列の参照を渡すが破壊せず、新規配列を返す
   * TODO：いちいち新規配列に作らないようにする？
   * @param  {NxM_matrix}  piece  元の配列、現状は3x3行列のみ
   * @param  {Boolean} ccw  回転方向、反時計回りかどうか
   * @return {NxM_matrix}
   */
  var getRotatedPiece = function getRotatedPiece(piece) {
    var ccw = arguments.length <= 1 || arguments[1] === undefined ? true : arguments[1];

    var newPiece = [];

    for (var x = 0, x_len = piece.length; x < x_len; x++) {
      newPiece[x] = [];
      for (var y = 0, y_len = piece[x].length; y < y_len; y++) {
        if (ccw) {
          // 左回り
          newPiece[x][y] = piece[y][x_len - 1 - x];
        } else {
          // 右回り
          newPiece[x][y] = piece[y_len - 1 - y][x];
        }
      }
    }

    return newPiece;
  };

  /**
   * MainScene
   */
  phina.define("MainScene", {
    superClass: "DisplayScene",

    piece: [].concat(PIECE_FRAMES[0]),

    init: function init() {
      this.superInit({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: MAIN_BACKGROUND_COLOR
      });

      // 描画用Map と 当たり判定＆更新用マップ 初期化
      this.map = createInitialMap();
      this.collisionMap = createInitialMap();

      // 描画ブロック類: mapに応じてスプライトを変える
      this.blockLayer = DisplayElement().setPosition(0, 0).addChildTo(this);
      for (var col = 0; col < FIELD_GRID_X; col++) {
        for (var row = 0; row < FIELD_GRID_Y; row++) {
          Block(BLOCK_SIZE, this.map[col][row]).setOrigin(0, 0).setPosition(BLOCK_SIZE * col, BLOCK_SIZE * row).addChildTo(this.blockLayer);
        }
      }

      /* params */
      this._px = 0;
      this._py = 0;
      this.resetPiece();
      this._updateMapFlg = true; // 初回更新

      this.gameLevel = 1;
      this.score = 0;
      this.dropInterval = DROP_INTERVAL_INIT; // 自然落下の頻度：レベルで加速
      this.isSleeping = false;

      this.timer = 0;
      // this._currentPieceAge = 0;
      this._sideInputCounter = 0;
      this._downInputCounter = 0;
      this._dropCounter = 0;

      // UIとか ==============================
      this.levelLabel = Label({
        text: this.gameLevel,
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

      this.timeLabel = Label({
        text: "dummy",
        fill: "red",
        fontSize: 40
      }).setPosition(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.4).addChildTo(this);

      Label({
        text: "仮説１：z or xキーで回転する" + "\n" + "仮説２：同じ色同士でくっつけると良い" + "\n" + "仮説３：下のsolventゲージが溜まったら\nSPACEキーを押すと良い",
        fill: "white",
        fontSize: 20
      }).setPosition(this.comboCountLabel.x, this.comboCountLabel.y * 1.8).addChildTo(this);

      /* スペシャルゲージ関連 */
      this.specialGauge = SpecialGauge(0, GAMEFIELD_HEIGHT + 8, GAMEFIELD_WIDTH).addChildTo(this);
      this.recoveryValue = SP_RECOVERY_VALUE_INIT;
      // Label({
      //     text: "↑溜まったらSpaceキーでなんか使える。\nグループ化したブロックを消せるで",
      //     fill: "white",
      //     fontSize: 18,
      // }).setPosition(this.specialGauge.width/2+24, this.specialGauge.y+this.specialGauge.height*2).addChildTo(this);

      /* エフェクト */
      this.effectFilter = EffectFilter(GAMEFIELD_WIDTH, GAMEFIELD_HEIGHT).setOrigin(0, 1).setPosition(0, GAMEFIELD_HEIGHT).addChildTo(this.blockLayer);
    },

    _accessor: {
      px: {
        get: function get() {
          return this._px;
        },
        set: function set(v) {
          if (v === this._px) return;
          this._updateMapFlg = true;
          this._px = v;
        }
      },
      py: {
        get: function get() {
          return this._py;
        },
        set: function set(v) {
          if (v === this._py) return;
          this._updateMapFlg = true;
          this._py = v;
        }
      }
    },

    update: function update(app) {
      if (this.isSleeping) return;

      var kb = app.keyboard;

      // カウントアップ
      ++this.timer;
      ++this._sideInputCounter;
      ++this._downInputCounter;
      ++this._dropCounter;

      // UI更新
      this.levelLabel.text = "LEVEL: " + this.gameLevel;
      this.scoreLabel.text = "SCORE : " + this.score.toFixed(0);
      this.timeLabel.text = "Frame : " + this.timer.toFixed(0);

      /* 時間とともにゲージ回復量が減る */
      if (this.timer % SP_GAUGE_DECREASE_INTERVAL === 0) this.recoveryValue = Math.max(SP_RECOVERY_VALUE_MIN, this.recoveryValue - 1);

      /*
        左右キー操作
        MEMO: 左右同時入力のときは右が優先になる
       */
      if (kb.getKeyDown("right")) {
        this.shiftPieceSideWay();
        this._sideInputCounter = 0;
      } else if (kb.getKey("right") && this._sideInputCounter >= KEY_INPUT_INTERVAL) {
        // 押しっぱなし処理、入力開始（keydown）と同時に発動させない
        this.shiftPieceSideWay();
        this._sideInputCounter = 0;
      }
      if (kb.getKeyDown("left")) {
        this.shiftPieceSideWay(true);
        this._sideInputCounter = 0;
      } else if (kb.getKey("left") && this._sideInputCounter >= KEY_INPUT_INTERVAL) {
        // 押しっぱなし
        this.shiftPieceSideWay(true);
        this._sideInputCounter = 0;
      }

      /*
        下ボタン：入力による落下
        押しっぱなしでも落ちるが、毎フレームは実行しない
        自然落下と同時に発生させない
      */
      if (kb.getKeyDown("down")) {
        this.downStackCheck();
        this._downInputCounter = 0;
        this._dropCounter = 0;
      } else if (kb.getKey("down") && this._downInputCounter >= KEY_INPUT_INTERVAL) {
        // 押しっぱなし
        this.downStackCheck();
        this._downInputCounter = 0;
        this._dropCounter = 0;
        // } else if (this.timer % this.dropInterval === 0 && this._downInputCounter >= KEY_INPUT_INTERVAL) {
      } else if (this._dropCounter >= this.dropInterval) {
          // 一定時間ごとのブロック自由落下
          this.downStackCheck();
          this._downInputCounter = 0;
          this._dropCounter = 0;
        }

      /* 上ボタン: 高速落下 */
      if (kb.getKeyDown("up")) {
        while (this.downStackCheck()) {}
        this._downInputCounter = 0;
        this._dropCounter = 0;
      }

      /* z:左回転, x:右回転 */
      if (kb.getKeyDown("z")) {
        this.tryPieceRotation(true);
      } else if (kb.getKeyDown("x")) {
        this.tryPieceRotation();
      }

      /* spaceボタンで特殊 */
      if (kb.getKeyDown("space")) {
        this.specialFlush();
      }

      if (this._updateMapFlg) {
        this.updateMap();
        this.drawBlock();
      }
    },

    /* TODO 仮想キー */
    // _setupVirtualKeys: function() {
    // var BUTTON_KEYS = {
    //   // opt:{},
    //   up: ["↑", "xpos", "y"]
    // };
    // var opt = {
    //   width: 40,
    //   height: 40,
    //   fill: "rgb(238, 117, 117)",
    //   text: "→"
    // };
    // this.buttonGroup = DisplayElement()
    //   .addChildTo(this)
    //   .setPosition(0, GAMEFIELD_HEIGHT / 2);
    // this.rightKey = Button(opt).addChildTo(this.buttonGroup);
    // this.rightKey.position.set(100, 300);
    // },

    /**
     * piece生成・初期位置へ戻す
     * @return {void}
     */
    resetPiece: function resetPiece() {
      this.piece = initializePiece(this.piece);
      // console.log("piece reset:", this.piece);
      this.px = PIECE_INIT_POSITION.x;
      this.py = PIECE_INIT_POSITION.y;
    },

    /**
     * ピースの左右移動
     * @param {Boolean} checkLeft 右か左か
     */
    shiftPieceSideWay: function shiftPieceSideWay() {
      var checkLeft = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

      var piece = this.piece;
      var collisionMap = this.collisionMap;
      var dest = checkLeft ? -1 : 1;

      // hit test
      var isMovable = true;
      for (var x = 0, xLen = piece.length; x < xLen; x++) {
        for (var y = 0, yLen = piece[x].length; y < yLen; y++) {
          if (piece[y][x] != -1) {
            // console.log("checking x,y:", x+this.px+dest,y+this.py);
            if (collisionMap[x + this.px + dest][y + this.py] != -1) {
              // ピースにいずれかの部分の左右が何かと接触 => 移動できない
              isMovable = false;
            }
          }
        }
      }

      if (isMovable === true) this.px += dest;
    },

    /**
     * ピース回転を試みる
     * 成功したら現ピースを回転
     * @param  {Boolean} ccw 回転角度
     * @return {Boolean} 回転成否を返す。が、今のところ使ってない
     */
    tryPieceRotation: function tryPieceRotation() {
      var ccw = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

      var temp = getRotatedPiece(this.piece, ccw);
      var isRotatable = true;

      // hit test
      for (var x = 0; x < temp.length; x++) {
        for (var y = 0; y < temp[x].length; y++) {
          if (temp[y][x] != -1) {
            if (this.collisionMap[x + this.px][y + this.py] != -1) {
              isRotatable = false;
            }
          }
        }
      }
      if (isRotatable === true) {
        this.piece = temp;
        this._updateMapFlg = true;
        return true;
      } else {
        return false;
      }
    },

    /**
     * 描画用マップ配列更新
     * @return {void}
     */
    updateMap: function updateMap() {
      // clear map
      for (var col = 0; col < FIELD_GRID_X; col++) {
        for (var row = 0; row < FIELD_GRID_Y; row++) {
          this.map[col][row] = -1;
        }
      }
      // set piece（3x3）
      for (var x = 0; x < this.piece.length; x++) {
        for (var y = 0; y < this.piece[x].length; y++) {
          this.map[this.px + x][this.py + y] = this.piece[y][x];
        }
      }
      // 空部分を判定マップで埋める
      for (col = 0; col < FIELD_GRID_X; col++) {
        for (row = 0; row < FIELD_GRID_Y; row++) {
          if (this.map[col][row] == -1) this.map[col][row] = this.collisionMap[col][row];
        }
      }

      this._updateMapFlg = false;
    },

    /**
     * ブロック描画
     * マップデータに応じてブロックのvisual変化
     * @return {void}
     */
    drawBlock: function drawBlock() {
      for (var col = 0; col < FIELD_GRID_X; col++) {
        for (var row = 0; row < FIELD_GRID_Y; row++) {
          var block = this.blockLayer.children[row + col * FIELD_GRID_Y];
          // this.blockLayer.children[row+col*FIELD_GRID_Y].type = this.map[col][row];
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

    /* ブロック消し＋エフェクト */
    specialFlush: function specialFlush() {
      var _this = this;

      if (!this.specialGauge.isFull()) return;

      this.isSleeping = true;
      this.specialGauge.setValue(0);
      this.effectFilter.animate(function () {
        _this.isSleeping = false;
        _this.deleteGroupedBlock();
      });
    },

    /**
     * 下の方の積み終えたブロックをチェック：あったら積む
     * @return {boolean} スペースが余って下に移動した場合true
     */
    downStackCheck: function downStackCheck() {
      // hit test
      var canFall = true;
      for (var x = 0; x < this.piece.length; x++) {
        for (var y = 0; y < this.piece[x].length; y++) {
          if (this.piece[y][x] != -1) {
            if (this.collisionMap[x + this.px][y + this.py + 1] != -1) {
              canFall = false;
            }
          }
        }
      }

      if (canFall === true) {
        this.py++; // == map更新
        return true;
      } else {
        // 設置：判定マップ更新
        for (var x = 0; x < this.piece.length; x++) {
          for (var y = 0; y < this.piece[x].length; y++) {
            if (this.piece[y][x] !== -1) {
              if (this.collisionMap[x + this.px][y + this.py] === -1) {
                this.collisionMap[x + this.px][y + this.py] = this.piece[y][x];
              }
            }
          }
        }
        this.checkBlockConnection();

        // ゲームオーバーチェック：ピース初期位置にすでに配置されているか
        this.resetPiece();
        var isGameover = false;
        for (var x = 0; x < this.piece.length; x++) {
          for (var y = 0; y < this.piece[x].length; y++) {
            if (this.piece[y][x] !== -1) {
              // console.log(x+this.px,y+this.py);
              // console.log("コリジョン",this.collisionMap);
              // console.log("検索位置ブロックのタイプ",this.collisionMap[x+this.px][y+this.py]);
              if (this.collisionMap[x + this.px][y + this.py] != -1) {
                this.collisionMap[x + this.px][y + this.py] = this.piece[y][x];
                isGameover = true;
              }
            }
          }
        }
        if (isGameover) {
          this.gameover();
        } else {
          /* 接地したらスペシャルゲージ回復 */
          // console.log(this.recoveryValue);
          this.specialGauge.value += this.recoveryValue;
          this.recoveryValue = SP_RECOVERY_VALUE_INIT;
        }

        this._updateMapFlg = true;
        return false;
      }
    },

    /**
     * ブロック同士がつながっているかどうかチェック
     * collisionMapは参照だけ、変更しない
     * @return {void}
     */
    checkBlockConnection: function checkBlockConnection() {
      var blockLayer = this.blockLayer;
      var map = this.collisionMap;
      /**
       * 現ブロックの周りをチェック
       * 同じタイプであればcomboFlgをtrueにしてそのブロックも再帰処理
       * すでにグループ化されている場合はスルー
       * @param  {int}  type  自身のブロック種
       * @param  {int}  col   自身の列番
       * @param  {int}  row   自身の行番
       * @param  {Boolean} comboFlg 繋がっていれば自分もグループにいれる
       * @return {void}
       */
      var checkPeriphery = function checkPeriphery(type, col, row) {
        var comboFlg = arguments.length <= 3 || arguments[3] === undefined ? false : arguments[3];

        var _block = blockLayer.children[col * FIELD_GRID_Y + row];
        if (!_block.grouped) {
          if (comboFlg) {
            _block.grouped = true;
          }
          // console.log( "私のタイプ："+type,"検索したタイプ："+map[col-1][row]);

          // 左
          if (map[col - 1][row] === type) {
            _block.grouped = true;
            checkPeriphery(type, col - 1, row, true);
          }

          // 右
          if (map[col + 1][row] === type) {
            _block.grouped = true;
            checkPeriphery(type, col + 1, row, true);
          }

          // 上
          if (map[col][row - 1] === type) {
            _block.grouped = true;
            checkPeriphery(type, col, row - 1, true);
          }

          // 下
          if (map[col][row + 1] === type) {
            _block.grouped = true;
            checkPeriphery(type, col, row + 1, true);
          }
        }
      };

      for (var col = 0; col < FIELD_GRID_X; col++) {
        for (var row = 0; row < FIELD_GRID_Y; row++) {
          var block = blockLayer.children[row + col * FIELD_GRID_Y];
          block.grouped = false; // 一旦初期化
          var type = this.collisionMap[col][row];
          if (0 < type) {
            // 壁・空白以外
            checkPeriphery(type, col, row);
          }
        }
      }
    },

    /**
     * グループ化されたピースを探索して消す ＆ 加点処理
     * @return {void}
     */
    deleteGroupedBlock: function deleteGroupedBlock() {
      var blockCount = 0;
      var comboCount = 0;
      var addedScore = 0;

      var map = this.collisionMap;
      var blockLayer = this.blockLayer;

      /**
       * グループ内のブロック数を再帰的にカウントする
       * checkPeripheryに近い
       * @param  {Int} type ブロック種
       * @param  {int}  col   自身の列番
       * @param  {int}  row   自身の行番
       * @return {void}
       */
      var checkGroup = function checkGroup(type, col, row) {
        var block = blockLayer.children[row + col * FIELD_GRID_Y];
        // 無限ループを避けるため、検索済みブロックはgroupedを解除
        block.grouped = false;

        blockCount++;
        map[col][row] = -1; // グループになっている（はず）ので自分自身は必ず消える

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
      };

      for (var col = 0; col < FIELD_GRID_X; col++) {
        for (var row = 0; row < FIELD_GRID_Y; row++) {
          var block = blockLayer.children[row + col * FIELD_GRID_Y];
          if (block.grouped) {
            comboCount++;
            blockCount = 0; // グループ内のブロック数：多ければ高得点
            checkGroup(map[col][row], col, row);
            addedScore += SCORE_BASIC * comboCount * blockCount;
          }
        }
      }
      addedScore *= comboCount;

      // UIアップデート: accessorでやる
      this.score += addedScore;
      this.comboCountLabel.text = comboCount + " Compounds!";
      this.checkLevelUp();

      this._updateMapFlg = true;
    },

    /**
     * ゲームオーバー処理
     * @return {void}
     */
    gameover: function gameover() {
      var _this2 = this;

      console.log("gameover");
      this.isSleeping = true;

      // TODO: block 崩れる演出

      setTimeout(function () {
        _this2.exit({ score: _this2.score, level: _this2.gameLevel });
        // this.app.replaceScene(EndScene());
      }, 1500);
    },

    /* レベルアップ：落下速度を増やす */
    checkLevelUp: function checkLevelUp() {
      if (this.score > LVUP_SCORE_BORDER_UNIT * this.gameLevel && this.dropInterval > DROP_INTERVAL_MIN) {
        console.log("level up: ", this.gameLevel);
        this.gameLevel++;
        this.dropInterval = Math.max(this.dropInterval - 4, DROP_INTERVAL_MIN);
      }
    }
  });
});


/**
 * EndScene
 */
phina.define("ResultScene", {
  superClass: "phina.game.ResultScene",

  init: function init(params) {
    var _this = this;

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

    this.on("keyup", function () {
      // this.app.replaceScene(MainScene());
      _this.exit();
    });
    // this.on('pointstart', ()=> {
    //     this.app.replaceScene(MainScene());
    // });
  },

  update: function update() {
    this.touchLabel.alpha -= 0.02;
    if (this.touchLabel.alpha <= 0) this.touchLabel.alpha = 1;
  }
});