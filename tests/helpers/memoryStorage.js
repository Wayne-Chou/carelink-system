// 測試用的記憶體儲存區，模擬 localStorage／sessionStorage 的 getItem、setItem、removeItem
// data 可直接讀取或整個替換，方便斷言與重設
export function memoryStorage(initial = {}) {
  const storage = {
    data: { ...initial },
    getItem: (key) => (key in storage.data ? storage.data[key] : null),
    setItem: (key, value) => {
      storage.data[key] = String(value);
    },
    removeItem: (key) => {
      delete storage.data[key];
    },
  };
  return storage;
}
