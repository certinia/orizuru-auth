# Orizuru Authentication


[![Build Status](https://travis-ci.org/financialforcedev/orizuru-auth.svg?branch=master)](https://travis-ci.org/financialforcedev/orizuru-auth)

Orizuru authentication is [Express](http://expressjs.com/)-compatible authentication
middleware for [Node.js](http://nodejs.org/). It is aimed at users of the [Orizuru](https://www.npmjs.com/package/@financialforcedev/orizuru) framework, but can also be used standalone. It is aimed at users of the Salesforce Identity Provider.

In a Salesforce context, using both of these middlewares in combination will establish the following.

1. The caller has a current valid Salesforce access token.
2. The Salesforce user for the token presented is linked by PermissionSet to the ConnectedApp corresponding to the OpenID Connect ClientID (Consumer Key).

*It is extremely important to treat your signing key as sensitive material, please ensure that this is stored in a secure location.*

## Install

```
$ npm install @financialforcedev/orizuru-auth
```

## Usage

### Middleware

Multiple middleware functions are available.

#### Token Validator

The token validator middleware checks that a valid OpenID Connect Bearer token exists in an **Authorization** HTTP header. It does this by calling the specified Identity Provider's UserInfo endpoint with the Bearer token.

If the token is successfully validated then a *user* object is set on the request's *orizuru* object.

Failure messages are emitted on the *emitter*.

```typescript

import { middleware } from '@financialforcedev/orizuru-auth';

const env = {
	jwtSigningKey: '--SOME KEY MATERIAL--',
	openidClientId: '12312312413-7236762374',
	openidHTTPTimeout: 4000,
	openidIssuerURI: 'https://login.salesforce.com'
};

app.use(middleware.tokenValidator(env));

middleware.emitter.on('denied', (message) => {
	console.log(message);
});
middleware.emitter.on('token_validated', (message) => {
	console.log(message);
});


```

The *user* object contains the following fields.

```json

{
	"username": "someuser@someorg.something",
	"organizationId": "00D80000000bSxXEAU"
}

```

#### Grant Checker

The grant checker is designed to be used in tandem with the token Validator. It uses the *user* object on the request's *orizuru* object and attempts to obtain an OpenID Connect access token using a JWT Bearer grant request. In order for this to work the Identity Provider must have a previously established authorisation for the user requested. With the Salesforce identity provider this is achieved using a Connected App with a Certificate for the JWT signing key uploaded into it.

If this completes successfully it sets the *orizuru.grantChecked* property to be true, otherwise the user will be refused access.

Failure messages are emitted on the *emitter*.

```typescript

import { middleware } from '@financialforcedev/orizuru-auth';

const env = {
	jwtSigningKey: '--SOME KEY MATERIAL--',
	openidClientId: '12312312413-7236762374',
	openidHTTPTimeout: 4000,
	openidIssuerURI: 'https://login.salesforce.com'
};

app.use(middleware.tokenValidator(env));
app.use(middleware.grantChecker(env));

middleware.emitter.on('denied', (message) => {
    console.log(message);
});
middleware.emitter.on('grant_checked', (message) => {
	console.log(message);
});


```

### Token Granter

This can be called at any time to obtain credentials to connect to Salesforce. This depends on the configuration of a Connected App in your Salesforce org, with pre-authorized users connected via a Permission Set to it and a certificate uploaded that corresponds to the *jwtSigningKey*.

The credentials returned are in a form suitable to be used with [JSforce](https://jsforce.github.io/). See the example below.

```typescript

import { grant } from '@financialforcedev/orizuru-auth';
import * as jsforce from 'jsforce';

const env = {
	jwtSigningKey: '--SOME KEY MATERIAL--',
	openidClientId: '12312312413-7236762374',
	openidClientSecret: '12345678910',
	openidHTTPTimeout: 4000,
	openidIssuerURI: 'https://login.salesforce.com'
};

const user = {
	organizationId: '00D80000000bSxXEAU',
	username: 'someuser@someorg.something'
};

const getToken = grant.getToken(env);

function getJsforceConnection(credentials: any) {
	return new jsforce.Connection(credentials);
}

function getLimits(conn: jsforce.Connection) {
	return Promise.all([conn, conn.limits()]);
}

function displayLimits([conn, limits]: [any, any]) {
	console.log(limits);
	return conn;
}

function logout(conn) {
	return conn.logout();
}

getToken(user)
	.then(getJsforceConnection)
	.then(getLimits)
	.then(displayLimits)
	.then(logout);

```
## API Docs

Click to view [JSDoc API documentation](http://htmlpreview.github.io/?https://github.com/financialforcedev/orizuru-auth/blob/master/doc/index.html).

