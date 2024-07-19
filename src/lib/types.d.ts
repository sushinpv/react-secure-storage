/**
 * This version of local storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 * To change the custom secure key, Please add `SECURE_LOCAL_STORAGE_HASH_KEY` or `REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY` to .env and change the value
 */
declare class SecureStorage {
  private _storageItems;
  constructor();

  /**
   * Function to set value to secure storage
   * @param key to be added
   * @param value value to be added
   */
  setItem(key: string, value: string | object | number | boolean): void;

  /**
   * Function to get value from secure storage
   * @param key to get
   * @returns
   */
  getItem(key: string): string | object | number | boolean | null;

  /**
   * Function to remove item from secure storage
   * @param key to be removed
   */
  removeItem(key: string): void;

  /**
   * Function to clear secure storage
   */
  clear(): void;
}

/**
 * Create an instance of secureStorage
 */
const secureStorage = new SecureStorage();

export default secureStorage;