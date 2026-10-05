// 「返回」按鈕的共用行為：從哪裡來就回哪裡
// vue-router 會在瀏覽器歷史的 state.back 記錄站內上一頁；直接開啟網址或重新開分頁時為 null

export function hasPreviousPage(router) {
  return !!router.options.history.state?.back;
}

// 有站內上一頁就回上一頁（不新增歷史紀錄）；沒有時才前往該頁指定的備援頁面
export function goBack(router, fallback = "/") {
  if (hasPreviousPage(router)) router.back();
  else router.push(fallback);
}
