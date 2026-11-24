[![npm](https://img.shields.io/npm/v/react-secure-storage.svg)](https://www.npmjs.com/package/react-secure-storage) [![downloads](https://img.shields.io/npm/dm/react-secure-storage.svg)](http://npm-stat.com/charts.html?package=react-secure-storage)

## The problem statement!

Most of the people save data into local storage, Is this a safe method to store ? No! Local storage writes the data as a plan string and any one who has the access to the device can read this data and manipulate. 

Most of the people thinks that we can encrypt the data and save it on local storage, But in this case, you need to have a secure key to decrypt this data, 

Let's consider this **Scenario**, You have encrypted the user login information and saved on local storage, When the platform reload, You are decrypting the data which is written on local storage and marking the user as logged or logged out, Here your website share a common secure key to encrypt and decrypt,  which means only your website knows how to decrypt, 

In this case, if someone copies the data from local storage and past on a different browser, then load your website, Your website will authenticate the user, Why ? because your website knows how to decrypt the data!

This is the problem when you have a single secure key! **Then how do we solve this issue ?**



## Why React Secure Storage ?

React secure storage is created to securely write the data to local storage ( **Basically its a wrapper written on top of default localStorage to write the data securely to the localStorage** ), here secure storage library generate a secure key for every browser and encrypt the data using this key, which means only the browser which encrypted the data can decrypt it, 

Additionally react secure storage preserve the data format for every data type, As out of the box it supports the following data types 

**String | Object | Number | Boolean**

Which means you don't need to explicitly convert every data to string



## How does it work ?

React secure storage is written in Singleton design pattern, and when the library initialized it reads all the data from local storage and decrypt all the data which is written using react-secure-storage and keeps on the memory, This ensure faster reading of all the data,

The key is generated using browser fingerprint, which is generated using 10+ browser key identifiers and user input secure key,

The user specific Secure key can be configured using  .env file as

    SECURE_LOCAL_STORAGE_HASH_KEY=xxxxxxxxx


Secure local storage prefix can be configured using .env file as

	SECURE_LOCAL_STORAGE_PREFIX=xxxxxxx



## Security: what this library does and does not protect

React secure storage keeps values **unreadable at a glance** in localStorage (obfuscation at rest). Please be aware of its limits before storing sensitive data:

- The encryption key is derived from browser properties plus `SECURE_LOCAL_STORAGE_HASH_KEY`. The hash key is bundled into your JavaScript, so it is **not secret**, and the browser part of the key is small enough to be guessed. A determined attacker who copies the stored values can decrypt them.
- Any JavaScript running on your page (XSS, malicious extensions) can read the values through this library.
- The key changes when the browser fingerprint changes (browser updates, different screen, privacy modes that randomise canvas). Stored values then read as `null`.

Do not use it for auth tokens or secrets: keep those in `httpOnly` cookies. See [SECURITY.md](SECURITY.md).

### Here are the .env prefix lists for the supported languages that are built-in.

| Language | Prefix       |
|----------|--------------|
| React    | REACT_APP_   |
| Vite     | VITE_        |
| Next.Js  | NEXT_PUBLIC_ |

You can always use the environment variables without the prefix as well


## How to use

To use the library first you need to install using 

    yarn add react-secure-storage

or

    npm install react-secure-storage

You can use the following methods to read and write items to secure local storage

|         Function       |Usecase                          | Datatype                         |
|----------------|-------------------------------|-----------------------------|
|`setItem(key, value)` |To set values to secure storage            |Supports `'String - Object - Number - Boolean'` as value            |
|`getItem(key)`        |To get values which is saved on secure local storage           | Return null if the key does not exits           |
|`removeItem(key)`          | To remove specified key from secure local storage|  |
|`clear()`          | Removes all data written by secure local storage. Other localStorage keys are kept (since 1.3.3)|  |

## How to use with SSR (Next.js, React Router, Remix)

localStorage only exists in the browser. On the server every method is a safe no-op and `getItem` returns `null`. Nothing is read from storage until the first call in the browser.

Because the server cannot see stored values, **read them after the component mounts**, not during render. Otherwise the server HTML (without the value) and the first browser render (with the value) differ, and React reports a hydration mismatch.

    "use client"; // Next.js App Router only
    import { useEffect, useState } from "react";
    import secureLocalStorage from "react-secure-storage";

    export default function Profile() {
      const [user, setUser] = useState(null); // same value on server and first client render

      useEffect(() => {
        setUser(secureLocalStorage.getItem("user")); // runs only in the browser
      }, []);

      return <p>{user ? user.name : "Loading…"}</p>;
    }

Avoid reading during render:

    // ❌ server renders null, browser renders the stored value -> hydration mismatch
    const user = secureLocalStorage.getItem("user");

This pattern is tested on every change against Next.js (App Router and Pages Router) and React Router framework mode.

## How to use with Vite

In the latest version of Vite, process is not defined by default, It uses `import.meta.env`, 

To define the process, You need to add the following code inside `vite.config.ts`

	import { defineConfig } from 'vite'
	// ...
	export default defineConfig({
	  // ...
	  define: {
	    "process.env": {},
	  },
	}) 

Here you can pass all the required `ENV` variables supported by the library inside the process.env object

## To disable properties from key generation

If you wish to disable any of the key generation property, You can do it as below

	SECURE_LOCAL_STORAGE_DISABLED_KEYS=ScreenPrint|Plugins
or

	REACT_APP_SECURE_LOCAL_STORAGE_DISABLED_KEYS=ScreenPrint|Plugins

Here is the list of all the supported values `UserAgent|ScreenPrint|Plugins|Fonts|LocalStorage|SessionStorage|TimeZone|Language|SystemLanguage|Cookie|Canvas|Hostname`

>Here we strongly recommend you to not to disable any of the properties as more properties you have, more unique the browser fingerprint will be!



### How to use environment variables for the supported languages.

| Language | Key                                            | Usage                                                                            |
|----------|------------------------------------------------|----------------------------------------------------------------------------------|
| Default  | SECURE_LOCAL_STORAGE_HASH_KEY                  | Used to specify the user specific hash key                                        |
| Default  | SECURE_LOCAL_STORAGE_PREFIX                    | Used to change the local storage prefix where the data will be finally saved     |
| Default  | SECURE_LOCAL_STORAGE_DISABLED_KEYS             | Used to disable individual property from encryption / fingerprint key generation |
| React    | REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY        | Used to specify the user specific hash key                                        |
| React    | REACT_APP_SECURE_LOCAL_STORAGE_PREFIX          | Used to change the local storage prefix where the data will be finally saved     |
| React    | REACT_APP_SECURE_LOCAL_STORAGE_DISABLED_KEYS   | Used to disable individual property from encryption / fingerprint key generation |
| Vite     | VITE_SECURE_LOCAL_STORAGE_HASH_KEY             | Used to specify the user specific hash key                                        |
| Vite     | VITE_SECURE_LOCAL_STORAGE_PREFIX               | Used to change the local storage prefix where the data will be finally saved     |
| Vite     | VITE_SECURE_LOCAL_STORAGE_DISABLED_KEYS        | Used to disable individual property from encryption / fingerprint key generation |
| Next.Js  | NEXT_PUBLIC_SECURE_LOCAL_STORAGE_HASH_KEY      | Used to specify the user specific hash key                                        |
| Next.Js  | NEXT_PUBLIC_SECURE_LOCAL_STORAGE_PREFIX        | Used to change the local storage prefix where the data will be finally saved     |
| Next.Js  | NEXT_PUBLIC_SECURE_LOCAL_STORAGE_DISABLED_KEYS | Used to disable individual property from encryption / fingerprint key generation |

## Sample Code

    
    import { useEffect } from  "react";
    import  secureLocalStorage  from  "react-secure-storage";
    
      
    const App = () => {
	    useEffect(() => {
		    secureLocalStorage.setItem("object", {
			    message:  "This is testing of local storage",
		    });
		    secureLocalStorage.setItem("number", 12);
		    secureLocalStorage.setItem("string", "12");
		    secureLocalStorage.setItem("boolean", true);
		    let value = secureLocalStorage.getItem("boolean");
		}, []);
    
	   return (
		    <div>
			    This is a sample code
		    </div>
		);
    }
    
    export  default  App;


## Build Size

About 10.6 KB gzip for the library code (excluding the `crypto-js` and `murmurhash-js` dependencies). CI fails if it exceeds the budget in `scripts/check-size.mjs`.

## Whats new in 1.3.3?

Bug fixes for SSR and storage handling, plus a full automated test suite. See [CHANGELOG.md](CHANGELOG.md).

- `clear()` now removes only data written by this library instead of the whole localStorage
- Safe on the server: no errors when methods are called during SSR, and nothing is read at import time
- Works with native Node ESM SSR (`import secureLocalStorage from "react-secure-storage"` in React Router / Remix / Astro servers)
- Changing a value's type no longer leaves stale entries behind; `removeItem()` always removes the stored entry
- No crash when canvas or localStorage is blocked

## Whats new in 1.3.2?

Regular bug fixes and https://github.com/sushinpv/react-secure-storage/issues/39 is resolved

## Whats new | Previous?

Added support for Vite and Next.js environment variables 

Now you can disable individual fingerprint generation properties, This is discussed in the following enhancement https://github.com/sushinpv/react-secure-storage/issues/14

Secure token returning null when the browser resizes problem was fixed. This was previously included as a security feature, but in the most recent update, it was removed. This was covered in the ensuing issue: https://github.com/sushinpv/react-secure-storage/issues/9

Now that we have included the browser hostname while establishing the secure key, it is more unique. This will guarantee that each website's key is distinct.

Added support for updating Local Storage prefix, Now this can be updated using .env

Resolved https://github.com/sushinpv/react-secure-storage/issues/2

Added support for `Cypress`

Added proper type definition for the entire package

Added support for older es versions and nextjs

Releasing the first version of react secure local storage, which supports `setItem`, `getItem`, `removeItem` and `clear` functions 

## How do I test this library on my local system & How do I contribute ?

    npm install
    npm run typecheck
    npm test                         # unit (jsdom), SSR (Node), and v1.3.2 compatibility tests
    npm run test:coverage            # same, with coverage thresholds

End-to-end tests build real Next.js, Vite and React Router apps against the packed library:

    node scripts/setup-e2e.mjs       # or a subset: node scripts/setup-e2e.mjs vite
    npx playwright install
    npm run test:e2e

All of these run in GitHub Actions on every pull request. To contribute, create a branch named `dev/{feature/fix}` and open a PR to `master`. `dist/` is built automatically on publish; do not commit it.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=sushinpv/react-secure-storage&type=Date)](https://star-history.com/#sushinpv/react-secure-storage&Date)
