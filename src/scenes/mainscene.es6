phina.namespace(function() {
  const PIECE_TYPES_NUM = 3; // TODO:Type表配列を作ってそのlengthで算出
  // TODO: マジックナンバーの修正
  const BLOCK_TYPES = {
    "EMPTY": -1,
    "WALL": 0,
    "RED": 1,
    "BLUE": 2,
    //...
    "CATALYST": 100,
  };

  const BLOCK_SIZE = 32;
  const FIELD_GRID_X = 9;
  const FIELD_GRID_Y = 12;
  const GAMEFIELD_WIDTH = BLOCK_SIZE * FIELD_GRID_X;
  const GAMEFIELD_HEIGHT = BLOCK_SIZE * FIELD_GRID_Y;
  const PIECE_INIT_POSITION = {
    x: Math.floor(FIELD_GRID_X / 2) - 1,
    y: 0
  };

  const SCORE_BASIC = 10;
  const LVUP_SCORE_BORDER_UNIT = 14000;

  const SP_RECOVERY_VALUE_INIT = 20;
  const SP_RECOVERY_VALUE_MIN = 4;
  const SP_GAUGE_DECREASE_INTERVAL = 16;

  const DROP_INTERVAL_MIN = 8; // 落下待機値最小（低いほど落下速度高）
  const KEY_INPUT_INTERVAL = 8;

  /**
   * 壁と空白部分のみの初期mapを生成
   * TODO: 引数で汎化する？
   * @return {NxM_matrix}
   */
  const createInitialMap = function() {
    let map = [];
    for (let col = 0; col < FIELD_GRID_X; col++) {
      map[col] = [];
      for (let row = 0; row < FIELD_GRID_Y; row++) {
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
  const PIECE_FRAMES = [
    [
      [-1, -1, -1],
      [-1, 1, -1],
      [-1, 1, -1]
    ],
    [
      [-1, 1, -1],
      [-1, 1, -1],
      [-1, -1, -1]
    ]
  ];
  /**
   * ベースとなるFRAMEを改変してNxMのピース行列配列を返す
   * 現在は3x3のみ
   * TODO：piece参照を渡して初期化のみをしてinitializePieceとする？
   * @return {NxM_matrix}
   */
  const createPiece = function() {
    // ベースとなるピース配列をランダム選択
    const basePiece = PIECE_FRAMES[Math.randint(0, PIECE_FRAMES.length - 1)];

    let piece = [];
    for (let x = 0; x < basePiece.length; x++) {
      piece[x] = [];
      for (let y = 0; y < basePiece[x].length; y++) {
        if (basePiece[x][y] !== BLOCK_TYPES["EMPTY"]) {
          // ブロック部分（1）をランダムな数字に変える
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
  const getRotatedPiece = function(piece, ccw = true) {
    let newPiece = [];

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

    init: function() {
      this.superInit({
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        backgroundColor: MAIN_BACKGROUND_COLOR,
      });

      // 描画用Map と 当たり判定＆更新用マップ 初期化
      this.map = createInitialMap();
      this.collisionMap = createInitialMap();

      // 描画ブロック類: mapに応じてスプライトを変える
      this.blockLayer = DisplayElement()
        .setPosition(0, 0)
        .addChildTo(this);
      for (let col = 0; col < FIELD_GRID_X; col++) {
        for (let row = 0; row < FIELD_GRID_Y; row++) {
          Block(BLOCK_SIZE, this.map[col][row])
            .setOrigin(0, 0)
            .setPosition(BLOCK_SIZE * col, BLOCK_SIZE * row)
            .addChildTo(this.blockLayer);
        }
      }

      this.resetPiece();
      /* params */
      this.timer = 0;
      this.gameLevel = 1;
      this.score = 0;
      this.dropInterval = 80; // 自然落下の頻度：レベルで加速
      this.isSleeping = false;

      // UIとか ==============================
      this.levelLabel = Label({
        text: this.gameLevel,
        fill: "white",
        fontSize: 30
      })
        .setPosition(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.1)
        .addChildTo(this);

      this.scoreLabel = Label({
        text: this.score,
        fill: "white",
        fontSize: 30
      })
        .setPosition(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.2)
        .addChildTo(this);

      this.comboCountLabel = Label({
        text: " ",
        fill: "white",
        fontSize: 24
      })
        .setPosition(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.3)
        .addChildTo(this);

      this.timeLabel = Label({
        text: "dummy",
        fill: "red",
        fontSize: 40
      })
        .setPosition(SCREEN_WIDTH * 0.7, SCREEN_HEIGHT * 0.4)
        .addChildTo(this);

      Label({
        text:
          "仮説１：z or xキーで回転する" +
          "\n" +
          "仮説２：同じ色同士でくっつけると良い" +
          "\n" +
          "仮説３：下のsolventゲージが溜まったら\nSPACEキーを押すと良い",
        fill: "white",
        fontSize: 20
      })
        .setPosition(this.comboCountLabel.x, this.comboCountLabel.y * 1.8)
        .addChildTo(this);

      /* スペシャルゲージ関連 */
      this.specialGauge = SpecialGauge(0, GAMEFIELD_HEIGHT + 8, GAMEFIELD_WIDTH).addChildTo(this);
      this.recoveryValue = SP_RECOVERY_VALUE_INIT;
      // Label({
      //     text: "↑溜まったらSpaceキーでなんか使える。\nグループ化したブロックを消せるで",
      //     fill: "white",
      //     fontSize: 18,
      // }).setPosition(this.specialGauge.width/2+24, this.specialGauge.y+this.specialGauge.height*2).addChildTo(this);

      /* エフェクト */
      this.effectFilter = EffectFilter(GAMEFIELD_WIDTH, GAMEFIELD_HEIGHT)
        .setOrigin(0, 1)
        .setPosition(0, GAMEFIELD_HEIGHT)
        .addChildTo(this.blockLayer);
    },

    update: function(app) {
      if (this.isSleeping) return;

      var kb = app.keyboard;

      // カウントアップを行う
      ++this.timer;

      // UI更新
      this.levelLabel.text = "LEVEL: " + this.gameLevel;
      this.scoreLabel.text = "SCORE : " + this.score.toFixed(0);
      this.timeLabel.text = "Frame : " + this.timer.toFixed(0);

      /* 時間とともにゲージ回復量が減る */
      if (this.timer % SP_GAUGE_DECREASE_INTERVAL === 0)
        this.recoveryValue = Math.max(SP_RECOVERY_VALUE_MIN, this.recoveryValue - 1);

      /*
        左右キー操作
        TODO：押しっぱなしに対応、keydownがあったときはgetkeyを発動しない
       */
      if (kb.getKeyDown("right")) this.shiftPieceSideWay();
      if (kb.getKeyDown("left")) this.shiftPieceSideWay(true);

      /*
        下ボタン：入力による落下
        押しっぱなしでも落ちるが、毎フレームは実行しない
        自然落下と同時に発生させない
      */
      if (kb.getKey("down") && this.timer % KEY_INPUT_INTERVAL === 0) {
        this.downStackCheck();
      } else if (this.timer % this.dropInterval === 0) {
        // 一定時間ごとにブロック自由落下
        this.downStackCheck();
      }

      /* 上ボタン: 高速落下 */
      if (kb.getKeyDown("up")) {
        while (this.downStackCheck()) {}
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

      this.updateMap();
      this.drawBlock();
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
    resetPiece: function() {
      this.piece = createPiece();
      this.px = PIECE_INIT_POSITION.x;
      this.py = PIECE_INIT_POSITION.y;
    },

    /**
     * ピースの左右移動
     * @param {Boolean} checkLeft 右か左か
     */
    shiftPieceSideWay: function(checkLeft = false) {
      const piece = this.piece;
      const collisionMap = this.collisionMap;
      const dest = checkLeft ? -1 : 1;

      // hit test
      let isMovable = true;
      for (let x = 0, xLen = piece.length; x < xLen; x++) {
        for (let y = 0, yLen = piece[x].length; y < yLen; y++) {
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
     * @return {Boolean} 成否を返すが今の所使わない
     */
    tryPieceRotation: function(ccw = false) {
      let temp = getRotatedPiece(this.piece, ccw);
      let isRotatable = true;

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
        return true
      } else {
        return false;
      }
    },

    /**
     * 描画用マップ配列更新
     * @return {void}
     */
    updateMap: function() {
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
          if (this.map[col][row] == -1)
            this.map[col][row] = this.collisionMap[col][row];
        }
      }
    },

    /**
     * ブロック描画
     * マップデータに応じてブロックの最高制
     * @return {void}
     */
    drawBlock: function() {
      for (var col = 0; col < FIELD_GRID_X; col++) {
        for (var row = 0; row < FIELD_GRID_Y; row++) {
          let block = this.blockLayer.children[row + col * FIELD_GRID_Y];
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
    specialFlush: function() {
      if (!this.specialGauge.isFull()) return;

      this.isSleeping = true;
      this.specialGauge.setValue(0);
      this.effectFilter.animate(() => {
        this.isSleeping = false;
        this.deleteGrouped();
      });
    },

    /**
     * 下の方の積み終えたブロックをチェック：あったら積む
     * @return {boolean} スペースが余って下に移動した場合true
     */
    downStackCheck: function() {
      // hit test
      let canFall = true;
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
        this.py++;
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
        let isGameover = false;
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

        return false;
      }
    },

    /**
     * ブロック同士がつながっているかどうかチェック
     * @return {void}
     */
    checkBlockConnection: function() {
      const blockLayer = this.blockLayer;
      const map = this.collisionMap;
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
      const checkPeriphery = function(type, col, row, comboFlg = false) {
        let _block = blockLayer.children[col * FIELD_GRID_Y + row];
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

      for (let col = 0; col < FIELD_GRID_X; col++) {
        for (let row = 0; row < FIELD_GRID_Y; row++) {
          let block = blockLayer.children[row + col * FIELD_GRID_Y];
          block.grouped = false; // 一旦初期化
          let type = this.collisionMap[col][row];
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
    deleteGrouped: function() {
      let blockCount = 0;
      let comboCount = 0;
      let addedScore = 0;

      let map = this.collisionMap;
      const blockLayer = this.blockLayer;

      /**
       * グループ内のブロック数を再帰的にカウントする
       * checkPeripheryに近い
       * @param  {Int} type ブロック種
       * @param  {int}  col   自身の列番
       * @param  {int}  row   自身の行番
       * @return {void}
       */
      const checkGroup = function(type, col, row) {
        let block = blockLayer.children[row + col * FIELD_GRID_Y];
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
          let block = blockLayer.children[row + col * FIELD_GRID_Y];
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
    },

    /**
     * ゲームオーバー処理
     * @return {void}
     */
    gameover: function() {
      console.log("gameover");
      this.isSleeping = true;

      // TODO: block 崩れる演出

      setTimeout(() => {
        this.exit({ score: this.score, level: this.gameLevel });
        // this.app.replaceScene(EndScene());
      }, 1500);
    },

    /* レベルアップ：落下速度を増やす */
    checkLevelUp: function() {
      if (
        this.score > LVUP_SCORE_BORDER_UNIT * this.gameLevel &&
        this.dropInterval > DROP_INTERVAL_MIN
      ) {
        console.log("level up: ", this.gameLevel);
        this.gameLevel++;
        this.dropInterval = Math.max(this.dropInterval - 4, DROP_INTERVAL_MIN);
      }
    }
  });
});
