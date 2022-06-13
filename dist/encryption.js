"use strict";
exports.__esModule = true;
var enc_utf8_1 = require("crypto-js/enc-utf8");
var aes_1 = require("crypto-js/aes");
var fingerprint_1 = require("./fingerprint");
/**
 * EncryptionService
 */
var EncryptionService = /** @class */ (function () {
    function class_1() {
        this.secureKey = "";
        this.secureKey = (0, fingerprint_1["default"])();
    }
    /**
     * Function to encrypt data
     * @param value
     * @returns
     */
    class_1.prototype.encrypt = function (value) {
        return aes_1["default"].encrypt(value, this.secureKey).toString();
    };
    /**
     * Function to decrypt data
     * @param value
     * @returns
     */
    class_1.prototype.decrypt = function (value) {
        try {
            var bytes = aes_1["default"].decrypt(value, this.secureKey);
            return bytes.toString(enc_utf8_1["default"]) || null;
        }
        catch (ex) {
            return null;
        }
    };
    return class_1;
}());
var encryptService = new EncryptionService();
exports["default"] = encryptService;
