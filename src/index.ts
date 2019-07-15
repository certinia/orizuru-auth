/*
 * Copyright (c) 2017-2019, FinancialForce.com, inc
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 *   are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice,
 *      this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice,
 *      this list of conditions and the following disclaimer in the documentation
 *      and/or other materials provided with the distribution.
 * - Neither the name of the FinancialForce.com, inc nor the names of its contributors
 *      may be used to endorse or promote products derived from this software without
 *      specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 *  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 *  OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
 *  THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 *  OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 *  OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 *  ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Orizuru Auth module
 * @module @financialforcedev/orizuru-auth
 */

import { clear, Environment } from './index/client/cache';
import { AccessTokenResponse, AuthOptions, AuthUrlParams, GrantOptions, IntrospectionOptions, IntrospectionResponse, RefreshTokenGrantorParams, TokenGrantorParams } from './index/client/oauth2';
import { JwtTokenGrantorParams, UserTokenGrantorParams } from './index/client/oauth2Jwt';
import { OpenIDTokenWithStandardClaims, UserInfoOptions } from './index/client/openid';
import { SalesforceUser } from './index/client/salesforce';
import { SalesforceIdentity, UserInfo } from './index/client/salesforce/identity';
import { createTokenGrantor as createJwtBearerAccessTokenGrantor } from './index/flow/jwtBearerToken';
import { createTokenGrantor as createRefreshAccessTokenGrantor } from './index/flow/refreshToken';
import { authorizationUrlGenerator, createTokenGrantor as createWebServerTokenGrantor } from './index/flow/webServer';
import { getToken, Grant } from './index/grant/grant';
import { createMiddleware as authCallback } from './index/middleware/authCallback';
import { createMiddleware as grantChecker } from './index/middleware/grantChecker';
import { createMiddleware as retrieveIdentityInformation } from './index/middleware/identity';
import { createMiddleware as tokenIntrospection } from './index/middleware/tokenIntrospection';
import { createMiddleware as tokenValidator } from './index/middleware/tokenValidator';
import { createTokenRevoker } from './index/revocation/revoke';
import { createUserInfoRequester } from './index/userInfo/userinfo';

declare global {

	namespace Express {

		interface Request {

			/**
			 * The Orizuru context for this request.
			 */
			orizuru?: Orizuru.Context;

		}

	}

	namespace Orizuru {

		interface Context {

			/**
			 * If true, the grant check has been performed for this user; an access token can be
			 * retrieved for the user.
			 */
			grantChecked?: boolean;

			/**
			 * Salesforce related context information
			 */
			salesforce?: {

				/**
				 * The Salesforce Identity as defined by the [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm#response) response.
				 */
				identity?: SalesforceIdentity;

				/**
				 * The Salesforce user information generated when parsing the [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm).
				 */
				userInfo?: UserInfo;

			};

			/**
			 * The information retrieved when introspecting the token.
			 */
			tokenInformation?: IntrospectionResponse;

			/**
			 * The User credentials required to initialise the JWT flow.
			 */
			user?: SalesforceUser;

		}

		interface IServer {

			/**
			 * The Orizuru Server Options.
			 */
			options: Options.IServer;

		}

		namespace Options {

			interface IServer {

				/**
				 * Auth Providers registered with this server.
				 *
				 * A map of provider name to Environment.
				 *
				 * This is referenced by each of the middleware, allowing instances to be created for
				 * different OpenID providers.
				 */
				authProvider: {
					[index: string]: Environment;
				};

				/**
				 * OpenID connected app information required for the authentication middleware.
				 */
				openid: {
					[index: string]: OpenIdOptions;
				};
			}

		}

	}
}

// Export from internal modules
export { Environment } from './index/client/cache';

export {
	AccessTokenResponse,
	AuthClient,
	AuthCodeGrantParams,
	AuthOptions,
	AuthUrlParams,
	ErrorResponse,
	GrantOptions,
	GrantParams,
	HasClientId,
	IntrospectionOptions,
	IntrospectionResponse,
	RefreshGrantParams,
	RefreshTokenGrantorParams,
	ResponseFormat,
	RevocationOptions,
	TokenGrantorParams
} from './index/client/oauth2';

export {
	JWT,
	JwtGrantParams,
	JwtTokenGrantorParams,
	User,
	UserTokenGrantorParams
} from './index/client/oauth2Jwt';

export {
	OpenIDAccessTokenResponse,
	OpenIDToken,
	OpenIDTokenWithStandardClaims,
	OpenIdTokenAddress,
	UserInfoOptions
} from './index/client/openid';

export { SalesforceAccessTokenResponse, SalesforceUser } from './index/client/salesforce';
export { SalesforceIdentity, UserInfo } from './index/client/salesforce/identity';

// Token Grantor types
export type AuthCodeAccessTokenGrantor = (params: TokenGrantorParams, opts?: GrantOptions) => Promise<AccessTokenResponse>;
export type JwtBearerAccessTokenGrantor = (params: UserTokenGrantorParams, opts?: GrantOptions) => Promise<AccessTokenResponse>;
export type UserTokenGrantor = (params: UserTokenGrantorParams, opts?: GrantOptions) => Promise<Grant>;
export type RefreshAccessTokenGrantor = (params: RefreshTokenGrantorParams, opts?: GrantOptions) => Promise<AccessTokenResponse>;

export type AuthUrlGenerator = (params: AuthUrlParams, opts?: AuthOptions) => Promise<string>;
export type TokenIntrospector = (token: string, opts: IntrospectionOptions) => Promise<IntrospectionResponse>;
export type UserInfoRequester = (accessToken: string, opts?: UserInfoOptions) => Promise<string | OpenIDTokenWithStandardClaims>;

export type Options = AuthOptions | GrantOptions | UserInfoOptions;
export type GrantorParams = RefreshTokenGrantorParams | TokenGrantorParams | UserTokenGrantorParams;

export type OpenIdOptions = AuthUrlParams & AuthOptions & GrantorParams & JwtTokenGrantorParams & Options & IntrospectionOptions;

/**
 * The event fired when the authorization header is set.
 * @event
 */
export const EVENT_AUTHORIZATION_HEADER_SET = Symbol();

/**
 * The event fired for an unauthorized request.
 * @event
 */
export const EVENT_DENIED = Symbol();

/**
 * The event fired when the grant has been checked.
 * @event
 */
export const EVENT_GRANT_CHECKED = Symbol();

/**
 * The event fired when the identity has been retrieved from Salesforce using the
 * [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm).
 * @event
 */
export const EVENT_USER_IDENTITY_RETRIEVED = Symbol();

/**
 * The event fired when an access token has been introspected.
 * @event
 */
export const EVENT_TOKEN_INTROSPECTED = Symbol();

/**
 * The event fired when an access token has been validated.
 * @event
 */
export const EVENT_TOKEN_VALIDATED = Symbol();

const jwtBearerToken = {

	/**
	 * Creates an access token grantor that exchanges a JWT for an access token.
	 */
	createTokenGrantor: createJwtBearerAccessTokenGrantor

};

const refreshToken = {

	/**
	 * Creates an access token grantor that exchanges a refresh token for an access token.
	 *
	 * Rather than using the client secret of the Salesforce Connected Application, this
	 * function creates a signed JWT bearer assertion to validate the user.
	 */
	createTokenGrantor: createRefreshAccessTokenGrantor

};

const webServer = {

	/**
	 * Generates URLs required to initialise the [OAuth 2.0 Web Server Authentication Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm).
	 */
	authorizationUrlGenerator,

	/**
	 * Creates an access token grantor that [exchanges a verification code for an access token](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm#vc_for_at).
	 *
	 * Rather than using the client secret of the Salesforce Connected Application, this
	 * function creates a signed JWT bearer assertion to validate the user.
	 */
	createTokenGrantor: createWebServerTokenGrantor

};

/**
 * Returns the collection of OAuth 2.0 flow functions.
 */
export const flow = {

	/**
	 * Returns functions to handle the [OAuth 2.0 JWT Bearer Token Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm).
	 */
	jwtBearerToken,

	/**
	 * Returns functions to handle the [OAuth 2.0 Refresh Token Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_refresh_token_flow.htm).
	 */
	refreshToken,

	/**
	 * Returns functions to handle the [OAuth 2.0 Web Server Authentication Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm).
	 */
	webServer

};

/**
 * Returns the collection of grant functions.
 */
export const grant = {

	/**
	 * Returns a function that can obtain a token for the passed user.
	 */
	getToken

};

/**
 * Returns the collection of middleware functions.
 */
export const middleware = {

	/**
	 * Returns an express middleware that [exchanges a verification code for an access token](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm#vc_for_at).
	 *
	 * This can be used in tandem with the tokenValidator to set the user on the request.
	 */
	authCallback,

	/**
	 * Returns an express middleware that checks that an access token
	 * can be retrieved for the user specified on the request.
	 * Should be used in tandem with the tokenValidator middleware,
	 * and must be executed after that. This requires that a ConnectedApp
	 * is configured to pre authorise users and the user is
	 * authorised.
	 */
	grantChecker,

	/**
	 * Returns an express middleware that uses the [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm) to retrieve information
	 * about the current Salesforce user.
	 */
	retrieveIdentityInformation,

	/**
	 * Returns an express middleware that introspects the access token passed in an HTTP
	 * Authorization header and if successful updates the request object.
	 */
	tokenIntrospection,

	/**
	 * Returns an express middleware that validates the OpenID Connect
	 * access token passed in an HTTP Authorization header and if successful
	 * sets the user object onto the request object.
	 */
	tokenValidator

};

/**
 * Returns the collection of OpenID client functions.
 */
export const openIdClient = {

	/**
	 * Clears the OpenID client cache.
	 *
	 * This will cause new OpenID clients to be created and the [OpenID provider configuration information](https://openid.net/specs/openid-connect-discovery-1_0.html#ProviderConfig)
	 * to be queried again.
	 */
	clearCache: clear

};

/**
 * Returns the collection of revocation functions.
 */
export const revocation = {

	/**
	 * Returns a function that [revokes access tokens](https://help.salesforce.com/articleView?id=remoteaccess_revoke_token.htm).
	 */
	createTokenRevoker

};

/**
 * Returns the collection of [user information](https://help.salesforce.com/articleView?id=remoteaccess_using_userinfo_endpoint.htm) functions.
 */
export const userInfo = {

	/**
	 * Returns a function that requests the user information for a given access token.
	 */
	createUserInfoRequester

};
