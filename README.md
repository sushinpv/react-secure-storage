# react-secure-storage

[![npm](https://img.shields.io/npm/v/react-secure-storage.svg)](https://www.npmjs.com/package/react-secure-storage) [![downloads](https://img.shields.io/npm/dm/react-secure-storage.svg)](http://npm-stat.com/charts.html?package=react-secure-storage)

## Problem statement

Storing data in local storage is convenient, but is it safe? Unfortunately, no! Local storage saves data as plain strings, making it accessible to anyone with access to the device.

Many believe that encrypting data before storing it in local storage solves this issue. However, this introduces a new problem: if the decryption key is compromised, anyone can decrypt the data. For example, if you encrypt user login information and store it, a malicious user could copy this data and use it in a different browser to gain unauthorized access.

### How do we solve this issue?

## Why React Secure Storage?

`react-secure-storage` is designed to securely store data in local storage by generating a unique encryption key for each browser. This means that only the browser that encrypted the data can decrypt it.

### Key Features

- **Data Types Supported**: Automatically preserves the data format for various types, including **String**, **Object**, **Number**, and **Boolean**.
- **Efficient Data Handling**: Utilizes a Singleton design pattern to read and decrypt data from local storage on initialization, ensuring fast access.
- **Unique Key Generation**: Generates a secure key using browser fingerprints (based on multiple identifiers) and an optional user-specific secure key.

## Configuration

You can specify a user-specific secure key in your `.env` file:

```plaintext
SECURE_LOCAL_STORAGE_HASH_KEY=xxxxxxxxx
```

You can also configure a local storage prefix:

```plaintext
SECURE_LOCAL_STORAGE_PREFIX=xxxxxxx
```

### Built-in Prefixes for Supported Languages

| Language | Prefix        |
| -------- | ------------- |
| React    | REACT_APP\_   |
| Vite     | VITE\_        |
| Next.Js  | NEXT_PUBLIC\_ |

You can use environment variables without the prefix as well.

## How to Use

Install the library using:

```bash
yarn add react-secure-storage
```

or

```bash
npm install react-secure-storage
```

### API Methods

| Function              | Use Case                                  | Data Types Supported                            |
| --------------------- | ----------------------------------------- | ----------------------------------------------- |
| `setItem(key, value)` | Set values in secure storage              | `'String'`, `'Object'`, `'Number'`, `'Boolean'` |
| `getItem(key)`        | Retrieve values from secure local storage | Returns `null` if the key does not exist        |
| `removeItem(key)`     | Remove a specific key from secure storage |                                                 |
| `clear()`             | Remove all data from secure local storage |                                                 |

## Using with Vite

In the latest version of Vite, `process` is not defined by default. You need to add the following to `vite.config.ts`:

```javascript
import { defineConfig } from "vite"
// ...
export default defineConfig({
  // ...
  define: {
    "process.env": {},
  },
})
```

### Disabling Key Generation Properties

To disable specific key generation properties, set the following in your `.env`:

```plaintext
SECURE_LOCAL_STORAGE_DISABLED_KEYS=ScreenPrint|Plugins
```

Supported values:
`UserAgent|ScreenPrint|Plugins|Fonts|LocalStorage|SessionStorage|TimeZone|Language|SystemLanguage|Cookie|Canvas|Hostname`

> Note: It's recommended to keep as many properties enabled as possible to ensure a unique browser fingerprint.

### Environment Variables for Supported Languages

| Language | Key                                            | Usage                                             |
| -------- | ---------------------------------------------- | ------------------------------------------------- |
| Default  | SECURE_LOCAL_STORAGE_HASH_KEY                  | User-specific hash key                            |
| Default  | SECURE_LOCAL_STORAGE_PREFIX                    | Change local storage prefix for saved data        |
| Default  | SECURE_LOCAL_STORAGE_DISABLED_KEYS             | Disable individual properties from key generation |
| React    | REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY        | User-specific hash key                            |
| React    | REACT_APP_SECURE_LOCAL_STORAGE_PREFIX          | Change local storage prefix for saved data        |
| React    | REACT_APP_SECURE_LOCAL_STORAGE_DISABLED_KEYS   | Disable individual properties from key generation |
| Vite     | VITE_SECURE_LOCAL_STORAGE_HASH_KEY             | User-specific hash key                            |
| Vite     | VITE_SECURE_LOCAL_STORAGE_PREFIX               | Change local storage prefix for saved data        |
| Vite     | VITE_SECURE_LOCAL_STORAGE_DISABLED_KEYS        | Disable individual properties from key generation |
| Next.js  | NEXT_PUBLIC_SECURE_LOCAL_STORAGE_HASH_KEY      | User-specific hash key                            |
| Next.js  | NEXT_PUBLIC_SECURE_LOCAL_STORAGE_PREFIX        | Change local storage prefix for saved data        |
| Next.js  | NEXT_PUBLIC_SECURE_LOCAL_STORAGE_DISABLED_KEYS | Disable individual properties from key generation |

## Sample Code

```javascript
import { useEffect } from "react"
import secureLocalStorage from "react-secure-storage"

const App = () => {
  useEffect(() => {
    secureLocalStorage.setItem("object", {
      message: "This is a test for local storage",
    })
    secureLocalStorage.setItem("number", 12)
    secureLocalStorage.setItem("string", "12")
    secureLocalStorage.setItem("boolean", true)
    let value = secureLocalStorage.getItem("boolean")
  }, [])

  return <div>This is a sample code</div>
}

export default App
```

## Build Size

7.6KB

## Whats new in 1.3.2?

- Regular bug fixes and [#39](https://github.com/sushinpv/react-secure-storage/issues/39) is resolved

## Previous Updates?

- Added support for Vite and Next.js environment variables.
- Introduced functionality to disable individual fingerprint generation properties as discussed in [#14](https://github.com/sushinpv/react-secure-storage/issues/14).
- Resolved issues related to secure token handling and unique key generation based on browser hostname.
- Added support for `Cypress` and enhance type definitions.
- Removed `react-scripts` dependency due to vulnerability concerns, as noted in [#3](https://github.com/sushinpv/react-secure-storage/issues/3).

## Testing and Contribution

To test the library locally, ensure you have `react-scripts` installed:

```bash
npm i react-scripts
```

or

```bash
yarn add react-scripts
```

To contribute, create a development branch for your fix as `dev/{feature/fix}` and submit a PR to the master branch. Before creating the PR, ensure you remove `react-scripts` from `package.json` and create a production build for the library:

```bash
yarn build:lib
```

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=sushinpv/react-secure-storage&type=Date)](https://star-history.com/#sushinpv/react-secure-storage&Date)
