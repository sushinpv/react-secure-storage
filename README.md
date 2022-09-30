## The problem statement!

Most of the people save data into local storage, Is this a safe method to store ? No! Local storage writes the data as a plan string and any one who has the access to the device can read this data and manipulate. 

Most of the people thinks that we can encrypt the data and save it on local storage, But in this case, you need to have a secure key to decrypt this data, 

Let's consider this **Scenario**, You have encrypted the user login information and saved on local storage, When the platform reload, You are decrypting the data which is written on local storage and marking the user as logged or logged out, Here your website share a common secure key to encrypt and decrypt,  which means only your website knows how to decrypt, 

In this case, if someone copies the data from local storage and past on a different browser, then load your website, Your website will authenticate the user, Why ? because your website knows how the decrypt the data!

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

    SECURE_LOCAL_STORAGE_HASH_KEY=xxxxxxxxxxxxxxxx

or

	REACT_APP_SECURE_LOCAL_STORAGE_HASH_KEY=xxxxxxxxx

### Added Support for Cypress.env, The version >= 1.0.15, added support for Cypress


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
|`clear()`          | Removed all data from secure local storage|  |




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


## Build Size ! 7.6KB

## Whats new ?

Resolved https://github.com/sushinpv/react-secure-storage/issues/2

Added support for `Cypress`

Added proper type definition for the entire package

Added support for older es versions and nextjs

Releasing the first version of react secure local storage, which supports `setItem`, `getItem`, `removeItem` and `clear` functions 

For local testing the library make sure you are installing the `react-scripts` by using `npm i react-scripts` or `yarn add react-scripts`