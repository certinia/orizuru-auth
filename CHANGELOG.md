# @financialforcedev/orizuru-auth

## 7.0.0

### BREAKING CHANGES

- Major rework of the Orizuru Auth module
  - _Only parts of the specifications required for the Salesforce Client are implemented_
- Split out the OpenIdClient module into:
  - OAuth2Client
    - [OAuth 2.0 Authorization Framework Specification](https://tools.ietf.org/html/rfc6749)
    - Used for standard OAuth flows
  - OAuth2JWTClient
    - [JSON Web Token (JWT) Profile for OAuth 2.0 Client Authentication and Authorization Grants Specification](https://tools.ietf.org/html/rfc7523)
    - Used for JWT OAuth flows
  - OpenIdClient
    - [OpenID Connect Core 1.0 Specification](https://openid.net/specs/openid-connect-core-1_0.html)
    - Used for [OpenID](https://openid.net/) flows.
  - SalesforceClient
    - [Digging Deeper into OAuth 2.0 in Salesforce](https://help.salesforce.com/articleView?id=remoteaccess_authenticate_overview.htm)
    - Used for Salesforce OAuth flows
- Split out the environment (`Environment`)
  - Separate client specific (`OpenIdOptions`) properties and environment properties (`Environment`)
- Simplification of the flows, middleware, token revocation and userinfo to use the clients

### NEW FEATURES

- Addition of [Salesforce Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm) middleware
  - This retrieves the user information from the Identity URL
- Examples
  - Addition of an examples directory that contains the initial code and setup described in the readme
- System tests
  - Test the Salesforce OAuth flow
  - Test the Google OAuth flow

### OTHER CHANGES

- Update the readme
- Travis build for both Node 10 and 11

## 6.0.0

### BREAKING CHANGES

- Add `openidClientSecret` to the OpenID environment to support validation of Salesforce access token response signatures
  - More information on the validation process can be found in the _Salesforce Responds with an Access Token Response_ section of the [OAuth 2.0 Web Server Authentication Flow
](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm) page
- Remove the state parameter from the `requestAccessTokenWithClientAssertion` web server flow function as it is not required

### NEW FEATURES

- Add `TokenGrantor` type alias
- Add user info to the grant credentials

### BUG FIXES

- Fix unexported event types

### OTHER CHANGES

- Convert all functions to async functions
- Remove npmignore
- Add separate nyc.opts file

## 5.0.0

- Update to be compatible with the latest version of Orizuru.
- Rename `Options.Auth` to `Environment` to handle the clashing `Options` namespace.
  - Everywhere we use `Options.Auth` we refer to the `env` property so `Environment` makes more sense.

## 4.1.1

### FIXES

- Update Orizuru context parameters to be optional.

## 4.1.0

### NEW FEATURES

- Add token revocation API.

## 4.0.0

### OTHER CHANGES

- Conversion to Typescript.
