# @financialforcedev/orizuru-auth

## 7.0.0

### BREAKING CHANGES
- Major rework of the Orizuru Auth module
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

_Only parts of the specifications required for the Salesforce Client are implemented_

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
