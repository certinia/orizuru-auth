# Nozomi Authorisation.

Nozomi authentication is [Express](http://expressjs.com/)-compatible authentication
middleware for [Node.js](http://nodejs.org/). It is aimed at users of the [Nozomi]() framework, but can also be used standalone. It is aimed at users of the Salesforce Identity Provider.

## Install

```
$ npm install @financialforcedev/nozomi-auth
```

## Usage

#### Middleware

Multiple middleware functions are available.

#### Token Validator

The token validator middleware checks that a valid OpenID Connect Bearer token exists in an **Authorization** HTTP header. It does this by calling the specified Identity Provider's UserInfo endpoint with the Bearer token.

If the token is successfully validated then a *user* object is set on the request's *nozomi* object.

```javascript

const
	middleware = require('@financialforcedev/nozomi-auth'),
	env = {
    	jwtSigningKey: '--SOME KEY MATERIAL--';
    	openidClientId: '12312312413-7236762374';
    	openidHTTPTimeout: 4000;
    	openidIssuerURI: 'https://login.salesforce.com';
	};

app.use(middleware.tokenValidator(env));

```

#### Grant Checker

The grant checker is designed to be used in tandem with the token Validator. It uses the user object on the request and attempts to obtain an OpenID Connect accesstoken using a JWT Bearer grant request. In order for this to use the Identity Provider must have a previously established authorisation for the user requested. With the Salesforce identity provider this is achieved using a Connected App and an uploaded Certificate.

If this completes successfully it sets the *nozomi.grantChecked* property to be true.

```javascript

const
	middleware = require('@financialforcedev/nozomi-auth'),
	env = {
    	jwtSigningKey: '--SOME KEY MATERIAL--';
    	openidClientId: '12312312413-7236762374';
    	openidHTTPTimeout: 4000;
    	openidIssuerURI: 'https://login.salesforce.com';
	};


app.use(middleware.grantChecker(env));

```
