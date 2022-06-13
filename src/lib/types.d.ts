export interface LocalStorageItem {
  [key: string]: Object | String | Number | null;
}

export declare class SecureLocalStorageClass {
  private _localStorageItems;
  constructor();
  setItem(key: string, value: String | Object | Number | Boolean);
  getItem(key: string): String | Object | Number | Boolean | null;
  removeItem(key: string);
  clear();
}
