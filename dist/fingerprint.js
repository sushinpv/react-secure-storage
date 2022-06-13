"use strict";
// import { ClientJS } from "clientjs";
exports.__esModule = true;
exports.hashCode = void 0;
var fingerprint_lib_1 = require("./fingerprint.lib");
var HASH_KEY = "E86E2612010258B35137";
function hashCode(str) {
    return str.split("").reduce(function (a, b) {
        a = (a << 5) - a + b.charCodeAt(0);
        return a & a;
    }, 0);
}
exports.hashCode = hashCode;
/**
 * Function to get browser finger print
 * @returns
 */
var getFingerprint = function () {
    return fingerprint_lib_1["default"].getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY);
    // return new ClientJS().getFingerprint() + (process.env.SECURE_LOCAL_STORAGE_HASH_KEY || HASH_KEY);
};
exports["default"] = getFingerprint;
