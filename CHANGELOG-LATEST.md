# @financialforcedev/orizuru-auth

## Latest changes (not yet released)

### BREAKING CHANGES
- Add `openidClientSecret` to the OpenID environment to support validation of Salesforce access token response signatures
	- More information on the validation process can be found in the _Salesforce Responds with an Access Token Response_ section of the [OAuth 2.0 Web Server Authentication Flow
](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm) page
- Remove the state parameter from the `requestAccessTokenWithClientAssertion` web server flow function as it is not required

### NEW FEATURES
- Add `TokenGrantor` type alias

### BUG FIXES
- Fix unexported event types

### OTHER CHANGES
- Target es5 (same as [Orizuru](https://github.com/financialforcedev/orizuru))
- Convert all functions to async functions
- Remove npmignore
- Add separate nyc.opts file
