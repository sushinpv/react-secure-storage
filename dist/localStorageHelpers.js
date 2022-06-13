"use strict";
exports.__esModule = true;
var encryption_1 = require("./encryption");
/**
 * Function to preload all the local storage data
 * @returns
 */
var getAllLocalStorageItems = function () {
    var localStorageItems = {};
    if (typeof window !== "undefined")
        for (var _i = 0, _a = Object.entries(localStorage); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (key.startsWith("@secure.")) {
                var keyType = key.replace("@secure.", "")[0];
                var parsedKey = key.replace(/[.][bjns][.]/, ".");
                var decryptedValue = encryption_1["default"].decrypt(value);
                var parsedValue = null;
                if (decryptedValue != null)
                    switch (keyType) {
                        case "b":
                            parsedValue = decryptedValue === "true";
                            break;
                        case "j":
                            parsedValue = JSON.parse(decryptedValue);
                            break;
                        case "n":
                            parsedValue = Number(decryptedValue);
                            break;
                        default:
                            parsedValue = decryptedValue;
                    }
                localStorageItems[parsedKey] = parsedValue;
            }
        }
    return localStorageItems;
};
exports["default"] = getAllLocalStorageItems;
