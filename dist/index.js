
exports.__esModule = true;
var encryption_1 = require("./encryption");
var localStorageHelpers_1 = require("./localStorageHelpers");
var KEY_PREFIX = "@secure.";
/**
 * This version of local storage supports the following data types as it is and other data types will be treated as string
 * object, string, number and Boolean
 */
var SecureLocalStorage = /** @class */ (function () {
    function SecureLocalStorage() {
        this._localStorageItems = {};
        this._localStorageItems = (0, localStorageHelpers_1["default"])();
    }
    /**
     * Function to set value to secure local storage
     * @param key to be added
     * @param value value to be added
     */
    SecureLocalStorage.prototype.setItem = function (key, value) {
        var parsedValue = typeof value === "object" ? JSON.stringify(value) : value + "";
        var keyType = typeof value === "object" ? "j" : typeof value === "boolean" ? "b" : typeof value === "number" ? "n" : "s";
        var parsedKeyLocal = KEY_PREFIX + "".concat(keyType, ".") + key;
        var parsedKey = KEY_PREFIX + key;
        if (key != null)
            this._localStorageItems[parsedKey] = value;
        localStorage.setItem(parsedKeyLocal, encryption_1["default"].encrypt(parsedValue));
    };
    /**
     * Function to get value from secure local storage
     * @param key to get
     * @returns
     */
    SecureLocalStorage.prototype.getItem = function (key) {
        var parsedKey = KEY_PREFIX + key;
        return this._localStorageItems[parsedKey] || null;
    };
    /**
     * Function to remove item from secure local storage
     * @param key to be removed
     */
    SecureLocalStorage.prototype.removeItem = function (key) {
        var parsedKey = KEY_PREFIX + key;
        this._localStorageItems[parsedKey] = null;
        localStorage.removeItem(key);
    };
    /**
     * Function to clear secure local storage
     */
    SecureLocalStorage.prototype.clear = function () {
        this._localStorageItems = {};
        localStorage.clear();
    };
    return SecureLocalStorage;
}());
var secureLocalStorage = new SecureLocalStorage();
exports["default"] = secureLocalStorage;
