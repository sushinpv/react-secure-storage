export interface LocalStorageItem {
  [key: string]: Object | String | Number | null;
}

export declare class SecureLocalStorageClass {
  // private _localStorageItems;
  constructor();
  setItem(key: string, value: String | Object | Number | Boolean): void;
  getItem(key: string): String | Object | Number | Boolean | null;
  removeItem(key: string): void;
  clear(): void;
}

/**
 * This version of local storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */
export declare class SecureLocalStorage {
  // private _localStorageItems;
  constructor();

  /**
   * Function to set value to secure local storage
   * @param key to be added
   * @param value value to be added
   */
  setItem(key: string, value: String | Object | Number | Boolean): void;

  /**
   * Function to get value from secure local storage
   * @param key to get
   * @returns
   */
  getItem(key: string): String | Object | Number | Boolean | null;

  /**
   * Function to remove item from secure local storage
   * @param key to be removed
   */
  removeItem(key: string): void;

  /**
   * Function to clear secure local storage
   */
  clear(): void;
}
