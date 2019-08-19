# @financialforcedev/orizuru-auth

## Latest changes (not yet released)

### NEW FEATURES

- Support [token introspection](https://tools.ietf.org/html/rfc7662) for both OAuth2 and [Salesforce](https://help.salesforce.com/articleView?id=remoteaccess_oidc_token_introspection.htm)
- Update the type of the `signingSecret` to allow encrypted keys
- Add option to grantChecker middleware to add issued access token to context
- Add verfication for the `id_token` in an OpenID response

### FIXES

- Make the scope property optional
  - Follows the [specification](https://tools.ietf.org/html/rfc6749#section-3.3)

### OTHER CHANGES

- Update the example server
  - Add a token introspection endpoint
  - Improve the logging and error handling
