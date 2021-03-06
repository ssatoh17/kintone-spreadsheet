import u from './utils';
import e from './ErrorHandler';

((PLUGIN_ID) => {
  kintone.events.on('app.record.index.show', (event) => {

    // config読み込み
    var config = kintone.plugin.app.getConfig(PLUGIN_ID);
    if (!config) return false;
    console.dir(config);

    // 要素の指定
    var container = document.getElementById(config.elementId);
    if (!container) return false;
    container.innerHTML = "";

    // フィルタの読み込み
    const query = kintone.app.getQuery();

    // 追加、更新不可のデータ定義
    u.fetchUsers();

    // 列データの定義
    var columns = JSON.parse(config.columns);
    var colHeaderCodes = u.getColHeaders(columns);

    // handsontable初期化
    var hot = null;
    u.getColumnData(colHeaderCodes).then((c) => { // フィールドデータ取得
      const {colHeaders, columnDatas, dataSchema} = c;
      hot = new Handsontable(container, {
        // この時点ではdataは入力せず、あとから読み込ませるようにする。（データ更新時も再読み込みさせたいため）
        data: [],
        minSpareRows: 1,
        colHeaders: colHeaders,
        contextMenu: ["remove_row"],
        columns: columnDatas,
        dataSchema: dataSchema,

        // スプレットシート上のレコードを削除したときに呼び出されるイベント
        // 引数indexは削除する行
        // 引数amountは削除する行数
        beforeRemoveRow: (index, amount) => {
          // kintoneのレコードを削除する
          u.deleteRecords(hot.getSourceData(), index, amount,
            (resp) => {
              console.dir(resp);
              u.getRecords(query, (resp) => {
                hot.loadData(resp.records);
              });
            },
            (resp) => {
              console.dir(resp);
            }
          );
        },

        // スプレットシート上のレコードが編集されたときに呼び出されるイベント
        afterChange: (change, source) => {
          console.log(source);

          // データ読み込み時はイベントを終了
          if (source === 'loadData') {
            return;
          }

          // kintoneのレコードを更新、追加する
          u.saveRecords(hot.getSourceData(), change,
            (resp) => {
              console.dir(resp);
              u.getRecords(query, (resp) => {
                  // 更新後、データを再読み込み
                  hot.loadData(resp.records);
                },
                (resp) => {
                  // レコード取得失敗時に呼び出される
                  console.dir(resp);
                });
            },
            (resp) => {
              // 更新・追加時に呼び出される
              throw new e.apiError(resp);
            }
          )
        }
      });
      // レコードを取得してhandsontableに反映
      u.getRecords(query, (resp) => {
        hot.loadData(resp.records);
        autoload();
      });
    });

    // 定期的にkintone上のデータを再取得する
    var autoload = () => {
      setTimeout(() => {
        u.getRecords(query, (resp) => {
          hot.loadData(resp.records);
        });
        autoload();
      }, 10000); // 10秒。APIの呼び出し数の上限があるので、必要に応じて変更してください。
    };
  });

})(kintone.$PLUGIN_ID);