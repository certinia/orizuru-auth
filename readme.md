# Orizuru Authentication

[![Build Status](https://travis-ci.org/financialforcedev/orizuru-auth.svg?branch=master)](https://travis-ci.org/financialforcedev/orizuru-auth)

Orizuru authentication is an [Express](http://expressjs.com/)-compatible authentication middleware for [Node.js](http://nodejs.org/). 

It is aimed at users of the [Orizuru](https://www.npmjs.com/package/@financialforcedev/orizuru) framework, but can also be used standalone. The authentication process has been tested with Salesforce and Google as Identity Providers, although it should be possible to use it with others.

In a Salesforce context, using the `Token Validator` and `Grant Checker` middleware in combination will establish the following.

1. The caller has a valid Salesforce access token.
2. The Salesforce user for the token is linked by a permission set to the ConnectedApp corresponding to the OpenID Connect Client ID (Consumer Key).

*It is extremely important to treat your signing secret as sensitive material, please ensure that this is stored in a secure location.*

## Install

```sh
npm install @financialforcedev/orizuru-auth
```

## Usage

### OAuth 2.0 Web Server Authentication Flow

Orizuru Auth provides a function to initialise the [OAuth 2.0 Web Server Authentication Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm). It uses the [Salesforce OpenID Connect discovery endpoint](https://help.salesforce.com/articleView?id=remoteaccess_using_openid_discovery_endpoint.htm) supplied in the `Environment`, with the [Connected app](https://help.salesforce.com/articleView?id=connected_app_create.htm) details supplied in the `AuthUrlParameters`, to create the URL. Optional configuration options for the URL are supplied in the `AuthOptions`.

For the examples, the initial configuration has been provided in the `examples` directory of this repository. This can be copied to another directory to be worked with.

Two configuration files should be provided: the `default.json` file which contains any insensitive data (this is included with the source); and the `local.json` configuration file which contains sensitive data. Create a `local.json` file, within the `config` directory with the following contents, where each of the values has been substituted for your Salesforce connected app details. 

```json
{
    "app": {
        "openid": {
            "salesforce": {
                "clientId": "<<<YOUR CONNECTED APP CLIENT ID - CONNECTED APP MUST HAVE THE OPENID SCOPE>>>",
                "clientSecret": "<<<YOUR CONNECTED APP CLIENT SECRET - CONNECTED APP MUST HAVE THE OPENID SCOPE>>>",
                "signingSecret": "<<<YOUR CONNECTED APP CERTIFICATE PRIVATE KEY - CONNECTED APP MUST HAVE THE OPENID SCOPE>>>"
            },
            "salesforceConnection": {
                "clientId": "<<<YOUR CONNECTED APP CLIENT ID - CONNECTED APP MUST HAVE THE API SCOPE>>>",
                "clientSecret": "<<<YOUR CONNECTED APP CLIENT SECRET - CONNECTED APP MUST HAVE THE API SCOPE>>>",
                "signingSecret": "<<<YOUR CONNECTED APP CERTIFICATE PRIVATE KEY - CONNECTED APP MUST HAVE THE API SCOPE>>>"
            }
        }
    }
}
```

Once completed, the server can be started via `npm start` or in VS Code via the launch configuration. 

Changes to the imports are omitted from further examples; assuming VS Code is being used, the examples directory contains the default configuration for automatically optimising imports.

The first example illustrates how the authentication URL generator can be used with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq). A HTTPS server is used with a generated self-signed certificate. 

The route `https://localhost:8080/api/v1.0/auth` is added to the server. This route redirects the user to the Salesforce login page; it initialises the [OAuth 2.0 Web Server Authentication Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm).

```typescript
import config from 'config';
import https from 'https';
import pem, { CertificateCreationResult } from 'pem';

import { json, Request, Response, Server } from '@financialforcedev/orizuru';
import { flow } from '@financialforcedev/orizuru-auth';
import { Transport } from '@financialforcedev/orizuru-transport-rabbitmq';

// Define a function that creates a self-signed certificate
function createCertificate(): Promise<CertificateCreationResult> {
    return new Promise((resolve, reject) => {
        pem.createCertificate({ days: 1, selfSigned: true }, (err, result) => {
            if (err) {
                return reject(err);
            }
            process.stdout.write('Created certificate\n');
            return resolve(result);
        });
    });
}

// Create the server
const server = new Server({
    authProvider: {
        salesforce: config.get('app.authProvider.salesforce')
    },
    openid: {
        salesforce: config.get('app.openid.salesforce'),
        salesforceConnection: config.get('app.openid.salesforceConnection')
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
        const url = await flow.webServer.authorizationUrlGenerator(server.options.authProvider.salesforce)(server.options.openid.salesforce, server.options.openid.salesforce);
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

/** 
 * All the code specified in the rest of the readme should be added here.
 */

// Create a self-signed certificate and then start the server listening to connections using HTTPS
createCertificate().then((certificate) => {

    const serverOptions: https.ServerOptions = {
        cert: certificate.certificate,
        key: certificate.clientKey
    };

    const httpsServer = https.createServer(serverOptions, server.serverImpl);
    httpsServer.listen(server.options.port);
    process.stdout.write('Started server\n');

});
```

### Middleware

Multiple middleware functions are available.

#### Auth Callback

The auth callback middleware exchanges a verification code for an access token as part of the [OAuth 2.0 Web Server Authentication Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm).

If a verification token is successfully exchanged for an access token then the `Authorization` HTTP header is set on the request.

The following example illustrates how the auth callback middleware can be used with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq). It follows on from the example given in the [OAuth 2.0 Web Server Authentication Flow](#oauth-20-web-server-authentication-flow) section. 

The route `https://localhost:8080/api/auth/v1.0/callback` is added to the server and is called once the user has authorized the connected app. If the request is successful, a **Authorization Header Set** message is printed to the console and the token is returned. This token can be used to test the subsequent routes.

``` typescript
// Add the listener
server.on(EVENT_AUTHORIZATION_HEADER_SET, (message) => {
    process.stdout.write(`${message}\n`);
});

// Add the route to the server
server.addRoute({
    method: 'get',
    middleware: [
        middleware.authCallback(server, 'salesforce', server.options.openid.salesforce, server.options.openid.salesforce)
    ],
    responseWriter: (app) => async (error, req, res) => {
        res.json(req.headers.authorization);
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

The following example illustrates how the token validator middleware can be used with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq) to validate tokens contained in the authorization request header. It follows on from the example given in the [Auth Callback](#auth-callback) section. 

The route `https://localhost:8080/api/auth/v1.0/validateToken` is added to the server as a GET request. If the request is successful, a **token validated** message is printed to the console and the *orizuru* object is returned. Otherwise, a denied message is printed to the console.

```typescript
// Add the listeners
server.on(EVENT_DENIED, (message) => {
    process.stdout.write(`${message}\n`);
});

server.on(EVENT_TOKEN_VALIDATED, (message) => {
    process.stdout.write(`${message}\n`);
});

// Add a route to the server
server.addRoute({
    method: 'get',
    middleware: [
        middleware.tokenValidator(server, 'salesforce')
    ],
    responseWriter: (app) => async (error, req, res) => {
        res.json(req.orizuru);
    },
    schema: {
        fields: [],
        name: 'validateToken',
        namespace: 'api.auth.v1_0',
        type: 'record'
    },
    synchronous: true
});
```

#### Grant Checker

The grant checker is designed to be used in tandem with the token Validator. It uses the `user` object on the request's `orizuru` object and attempts to obtain an OpenID Connect access token using a JWT Bearer grant request. In order for this to work the Identity Provider must have a previously established authorisation for the user requested. With the Salesforce identity provider this is achieved by using a Connected App with an uploaded certificate.

If this completes successfully it sets the `orizuru` object `grantChecked` property to be true, otherwise the user will be refused access.

The following example illustrates how the grant checker can be used, with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq), to validate tokens contained in the authorization request header. It follows on from the example given in the [Token Validator](#token-validator) section. 

The route `https://localhost:8080/api/auth/v1.0/checkGrant` is added to the server as a GET request. If the request is successful, a **grant checked** message is printed to the console and the *orizuru* object is returned. Otherwise, a denied message is printed to the console.

```typescript
// Add the listeners
server.on(EVENT_GRANT_CHECKED, (message) => {
    process.stdout.write(`${message}\n`);
});

// Add a route to the server
server.addRoute({
    method: 'get',
    middleware: [
        middleware.tokenValidator(server, 'salesforce'),
        middleware.grantChecker(server, 'salesforce', server.options.openid.salesforceConnection, {
            verifySignature: false
        })
    ],
    responseWriter: (app) => async (error, req, res) => {
        res.json(req.orizuru);
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

This can be called at any time to obtain credentials to connect to Salesforce. It depends on the configuration of the Connected App in your Salesforce org, with pre-authorized users connected via a Permission Set to it and a certificate uploaded that corresponds to the `signingSecret`.

The credentials returned are in a form suitable to be used with [JSforce](https://jsforce.github.io/).

The following example illustrates how the token granter can be used, with [Orizuru](https://github.com/financialforcedev/orizuru) and [Orizuru Transport RabbitMQ](https://github.com/financialforcedev/orizuru-transport-rabbitmq), to retrieve the limits for a Salesforce organization. It follows on from the example given in the [Grant Checker](#grant-checker) section. 

The route `https://localhost:8080/api/v1.0/limits` is added to the server as a GET request. If the request is successful, a JSON response containing the limits is returned. Otherwise, a denied message is printed to the console. It makes use of an Orizuru response writer function, rather than a middleware, to retrieve the limits and send them to the user.

```typescript
// Create a function to retrieve the organization limits
async function retrieveOrgLimits(err: Error | undefined, req: Request, res: Response) {

    if (!req.orizuru || !req.orizuru.user) {
        res.sendStatus(401);
        return;
    }

    // Configure the token grantor parameters and options
    const grantParams = Object.assign({}, server.options.openid.salesforceConnection, {
        user: req.orizuru.user
    });

    const grantOpts: GrantOptions = {
        verifySignature: false
    };

    // Obtain the credentials using the token grantor
    const credentials = await grant.getToken(server.options.authProvider.salesforce)(grantParams, grantOpts);

    // Create a new connection and query the limits
    const conn = await new Connection(credentials);
    const limits = await conn.limits();

    res.json(limits);

}

// Add a route to the server
server.addRoute({
    method: 'get',
    middleware: [
        middleware.tokenValidator(server, 'salesforce')
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
