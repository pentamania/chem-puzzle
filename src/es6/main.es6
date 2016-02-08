
/**
 * ゲーム用定数作成
 */
const TITLE_NAME = "なんかパズル（仮）";
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 640;
const MAIN_BACKGROUND_COLOR = 'rgb(101, 88, 88)';

const BLOCK_SIZE = 32;
const PIECE_TYPES_COUNT = 3;
const GRID_NUM_X = 9;
const GRID_NUM_Y = 12;
const BORDER_Y = 2;
const GAMEFIELD_WIDTH = BLOCK_SIZE*GRID_NUM_X;
const GAMEFIELD_HEIGHT = BLOCK_SIZE*GRID_NUM_Y;
const KEY_DELAY = 9;

const BASIC_SCORE = 10;
const BORDER_SCORE_UNIT = 20000;
/**
 * リソースの読み込み
 */
const ASSETS = {
    image: {

    },
    spritesheet: {

    },
    sound: {

    },
};


/**
 * ゲーム起動処理
 */
phina.globalize();
phina.main(()=> {
    var app = GameApp({
        // startLabel: 'title',
        startLabel: 'main',
        // assets: ASSETS,
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
        fps:60
    });
    app.run();
});
