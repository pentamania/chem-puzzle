/**
 * ゲーム用定数作成
 */
const TITLE_NAME = "なんかパズル（仮）";
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 640;
const MAIN_BACKGROUND_COLOR = "rgb(101, 88, 88)";
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

phina.main(() => {
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
