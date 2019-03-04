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

### OAuth 2.0 Web Server Authentication Flow

Orizuru Auth provides a function to initialise the [OAuth 2.0 Web Server Authentication Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm). It uses the Salesforce connected app details supplied in the `Environment` object to create the URL.

The following example illustrates how the authentication URL generator can be used with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq). A HTTPS server is used (test certificates can be created by executing the `create-local-certificate` script). The rest of the examples in this readme add to the following code (although changes to the imports are omitted).

```typescript
// Imports
import fs from 'fs';
import https from 'https';
import path from 'path';

import { json, Request, Response, Server } from '@financialforcedev/orizuru';
import { AuthOptions, Environment, flow } from '@financialforcedev/orizuru-auth';
import { Transport } from '@financialforcedev/orizuru-transport-rabbitmq';

// Set up the environment - these should be changed to the credentials of your connected app
const env: Environment = {
    jwtSigningKey: '--SOME KEY MATERIAL--',
    openidClientId: '12312312413-7236762374',
    openidClientSecret: 'testSecret',
    openidHTTPTimeout: 4000,
    openidIssuerURI: 'https://login.salesforce.com',
    redirectUri: 'https://localhost:8080/api/auth/v1.0/callback'
};

// Create the server
const server = new Server({
    auth: {
        jwtBearer: env,
        webServer: env
    },
    port: 8080,
    transport: new Transport({
        prefetch: 1,
        url: 'amqp://localhost'
    })
});

// Add the route to generate the authorization URL (in this case we use 'test' as the state parameter)
server.addRoute({
    method: 'get',
    middleware: [
        json()
    ],
    responseWriter: () => async (err: Error | undefined, req: Request, res: Response) => {
        
        // In this example, prompt for consent to the app
        const opts: AuthOptions = {
            immediate: false,
            prompt: 'consent'
        };
        
        const url = await flow.webServer.authorizationUrlGenerator(env)('test', opts);
        res.redirect(url);

    },
    schema: {
        fields: [],
        name: 'auth',
        namespace: 'api.v1_0',
        type: 'record'
    },
    synchronous: true
});

// **All code specified in the rest of the readme should be added here**

// Start the server listening to connections using HTTPS
const serverOptions: https.ServerOptions = {
    cert: fs.readFileSync(path.resolve(__dirname, '../certificates/server/server.cert')),
    key: fs.readFileSync(path.resolve(__dirname, '../certificates/server/server.key'))
};

const httpsServer = https.createServer(serverOptions, server.serverImpl);
httpsServer.listen(server.options.port);

```

### Middleware

Multiple middleware functions are available.

#### Auth Callback

This auth callback middleware exchanges a verification code for an access token as part of the [OAuth 2.0 Web Server Authentication Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm).

If a verification token is successfully exchanged for an access token then the **Authorization** HTTP header is set on the request.

The following example illustrates how the auth callback middleware can be used with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq). It follows on from the example given in the **OAuth 2.0 Web Server Authentication Flow** section. 

The route `https://localhost:8080/api/auth/v1.0/callback` is added to the server and is called once the user has authorized the connected app. If the request is successful, a **Authorization Header Set** message is printed to the console and a success code is returned.

``` typescript
// Add the listener
server.on(EVENT_AUTHORIZATION_HEADER_SET, (message) => {
    console.log(message);
});

// Add a route to the server
server.addRoute({
    method: 'get',
    middleware: [
        middleware.authCallback(server)
    ],
    responseWriter: (app) => async (error, req, res) => {
        res.sendStatus(200);
    },
    schema: {
        fields: [],
        name: 'callback',
        namespace: 'api.auth.v1_0',
        type: 'record'
    },
    synchronous: true
});
```


#### Token Validator

The token validator middleware checks that a valid OpenID Connect Bearer token exists in an **Authorization** HTTP header. It does this by calling the specified Identity Provider's UserInfo endpoint with the Bearer token.

If the token is successfully validated then a *user* object is set on the request's *orizuru* object.

The following example illustrates how the token validator middleware can be used with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq) to validate tokens contained in the authorization request header. It follows on from the example given in the **Auth Callback** section. 

The route `https://localhost:8080/api/auth/v1.0/validateToken` is added to the server as a GET request. If the request is successful, a **token validated** message is printed to the console and the *orizuru* object is returned. Otherwise, a denied message is printed to the console.

```typescript
// Add the listeners
server.on(EVENT_DENIED, (message) => {
    console.log(message);
});

server.on(EVENT_TOKEN_VALIDATED, (message) => {
    console.log(message);
});

// Add a route to the server
server.addRoute({
    method: 'get',
    middleware: [
        middleware.tokenValidator(server)
    ],
    responseWriter: (app) => async (error, req, res) => {
        res.sendStatus(200);
    },
    schema: {
        fields: [],
        name: 'validateToken',
        namespace: 'api.auth.v1_0',
        type: 'record'
    }
});
```

#### Grant Checker

The grant checker is designed to be used in tandem with the token Validator. It uses the *user* object on the request's *orizuru* object and attempts to obtain an OpenID Connect access token using a JWT Bearer grant request. In order for this to work the Identity Provider must have a previously established authorisation for the user requested. With the Salesforce identity provider this is achieved using a Connected App with a Certificate for the JWT signing key uploaded into it.

If this completes successfully it sets the *orizuru.grantChecked* property to be true, otherwise the user will be refused access.

The following example illustrates how the grant checker can be used, with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq), to validate tokens contained in the authorization request header. It follows on from the example given in the **Token Validator** section. 

The route `https://localhost:8080/api/auth/v1.0/checkGrant` is added to the server as a GET request. If the request is successful, a **grant checked** message is printed to the console and the *orizuru* object is returned. Otherwise, a denied message is printed to the console.

```typescript
// Add the listeners
server.on(EVENT_GRANT_CHECKED, (message) => {
    console.log(message);
});

// Add a route to the server
server.addRoute({
    method: 'get',
    middleware: [
        middleware.tokenValidator(server),
        middleware.grantChecker(server)
    ],
    responseWriter: (app) => async (error, req, res) => {
        res.sendStatus(200);
    },
    schema: {
        fields: [],
        name: 'checkGrant',
        namespace: 'api.auth.v1_0',
        type: 'record'
    }
});
```

### Token Granter

This can be called at any time to obtain credentials to connect to Salesforce. This depends on the configuration of a Connected App in your Salesforce org, with pre-authorized users connected via a Permission Set to it and a certificate uploaded that corresponds to the **jwtSigningKey**.

The credentials returned are in a form suitable to be used with [JSforce](https://jsforce.github.io/).

The following example illustrates how the token granter can be used, with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq), to retrieve the limits for a Salesforce organization. It follows on from the example given in the **Grant Checker** section. 

The route `https://localhost:8080/api/v1.0/limits` is added to the server as a GET request. If the request is successful, a JSON response containing the limits is returned. Otherwise, a denied message is printed to the console. It makes use of an Orizuru response writer function, rather than a middleware, to retrieve the limits and send them to the user.

```typescript
// Create a response writer function to retrieve the organization limits
async function retrieveOrgLimits(err: Error | undefined, req: Request, res: Response) {

    if (!req.orizuru || !req.orizuru.user) {
        res.sendStatus(401);
        return;
    }

    const user = req.orizuru.user;
    const credentials = await grant.getToken(env)(user);

    const conn = await new Connection(credentials);
    const limits = await conn.limits();

    res.json(limits);

}

// Add a route to the server
server.addRoute({
    method: 'get',
    middleware: [
        middleware.tokenValidator(server)
    ],
    responseWriter: (app) => retrieveOrgLimits,
    schema: {
        fields: [],
        name: 'limits',
        namespace: 'api.v1_0',
        type: 'record'
    },
    synchronous: true
});
```
## API Docs

Click to view [API documentation](http://htmlpreview.github.io/?https://github.com/financialforcedev/orizuru-auth/blob/master/doc/index.html).

