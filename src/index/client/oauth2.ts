/*
 * Copyright (c) 2019, FinancialForce.com, inc
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
 * @module client/oauth2
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import formUrlencoded from 'form-urlencoded';
import { Secret } from 'jsonwebtoken';

import { Environment } from './cache';
import { JwtGrantParams } from './oauth2Jwt';
import { UserInfoResponse } from './salesforce/identity';

/**
 * The return formats when requesting a grant.
 */
export enum ResponseFormat {
	JSON = 'application/json',
	URL_ENCODED = 'application/x-www-form-urlencoded',
	XML = 'application/xml'
}

/**
 * The [Access Token Response](https://tools.ietf.org/html/rfc6749#section-5.1).
 *
 * @example
 *
 * ```json
 *
 * {
 * 	"access_token":"2YotnFZFEjr1zCsicMWpAA",
 * 	"token_type":"example",
 * 	"expires_in":3600,
 * 	"refresh_token":"tGzv3JOkF0XG5Qx2TlKWIA"
 * }
 *
 * ```
 */
export interface AccessTokenResponse {

	/**
	 * The access token issued by the authorization server.
	 */
	access_token: string;

	/**
	 * The lifetime in seconds of the access token.
	 */
	expires_in?: number;

	/**
	 * Token that can be used in the future to obtain new access tokens (sessions).
	 * This value is a secret. Treat it like the user’s password, and use appropriate measures to protect it.
	 */
	refresh_token?: string;

	/**
	 * This parameter is returned if the scope parameter includes openid.
	 */
	scope?: string;

	/**
	 * The [access token type](https://tools.ietf.org/html/rfc6749#section-7.1).
	 */
	token_type: string;

}

/**
 * Parameters required for the auth grant type.
 */
export interface AuthCodeGrantParams extends TokenGrantorParams {

	/**
	 * Authorization code that the consumer must use to obtain the access and refresh tokens.
	 */
	code: string;

	/**
	 * Defines this grant type.
	 */
	grantType: 'authorization_code';

}

/**
 * Optional parameters used when generating authorization URLs.
 */
export interface AuthOptions {

	/**
	 * Changes the display type of the login and authorization pages.
	 */
	display?: 'page' | 'popup' | 'touch' | 'mobile';

	/**
	 * If true and the user is logged in and has previously approved the clientId,
	 * Salesforce skips the approval step.
	 *
	 * If true and the user isn’t logged in or has not previously approved the client,
	 * Salesforce immediately terminates with the immediate_unsuccessful error code.
	 */
	immediate?: boolean;

	/**
	 * Specifies how the authorization server prompts the user for reauthentication and
	 * reapproval.
	 *
	 * Defined in the [OpenID specification](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest).
	 */
	prompt?: 'none' | 'login' | 'consent' | 'select_account';

	/**
	 * Opaque value used to maintain state between the request and the callback.
	 */
	state?: string;

}

/**
 * The required parameters required for an [authorization request](https://tools.ietf.org/html/rfc6749#section-4.1.1).
 */
export interface AuthUrlParams extends HasClientId {

	/**
	 * A space-delimited list of scopes that identify the resources that your application
	 * could access on the user's behalf.
	 *
	 * The scopes can be omitted in accordance with the [specification](https://tools.ietf.org/html/rfc6749#section-3.3).
	 */
	scope?: string;

	/**
	 * Determines where the API server redirects the user after the user completes the
	 * authorization flow.
	 */
	redirectUri: string;

}

/**
 * The [Error Response](https://tools.ietf.org/html/rfc6749#section-4.1.2.1) parameters.
 */
export interface ErrorResponse {

	/**
	 * Returns the error code.
	 */
	error: string;

	/**
	 * Returns the description of the error with additional information.
	 */
	error_description?: string;

}

/**
 * Simple interface to include the client ID.
 */
export interface HasClientId {

	/**
	 * The client ID for your application.
	 */
	clientId: string;

}

/**
 * The base interface for all authentication clients.
 */
export interface AuthClient {

	/**
	 * Creates the authorization URL.
	 *
	 * @param params The authentication URL parameters.
	 * @param [opts] The authentication options to be used when generating the URL.
	 * @returns The authorization URL.
	 */
	createAuthorizationUrl(params: AuthUrlParams, opts?: AuthOptions): string;

	/**
	 * Returns the client type.
	 */
	getType(): string;

	/**
	 * Obtain a grant with the specified parameters.
	 *
	 * This makes the [Access Token Request](https://tools.ietf.org/html/rfc6749#section-4.1.3) as per the OAuth 2.0 specification.
	 *
	 * @param params The grant parameters.
	 * @param [opts] The grant options to be used.
	 * @returns The [Access Token Response](https://tools.ietf.org/html/rfc6749#section-4.1.4).
	 */
	grant(params: GrantParams, opts?: GrantOptions): Promise<AccessTokenResponse>;

	/**
	 * Initalize the client by defining the endpoints.
	 */
	init(): Promise<void>;

	/**
	 * Introspect a token.
	 */
	introspect(token: string, params: IntrospectionParams, opts?: IntrospectionOptions): Promise<IntrospectionResponse>;

	/**
	 * Revoke a token.
	 *
	 * This makes a [Revocation Request](https://tools.ietf.org/html/rfc7009#section-2.1) as per the OAuth 2.0 specification.
	 *
	 * @param token The token to be revoked.
	 * @param [opts] The revocation options to be used.
	 * @returns If true the token has been revoked successfully.
	 */
	revoke(token: string, opts?: RevocationOptions): Promise<boolean>;

}

export interface AuthClientGrantParams {

	/**
	 * The assertion for the JWT Bearer flow.
	 */
	assertion?: string;

	/**
	 * The type of the client assertion.
	 *
	 * This is always *urn:ietf:params:oauth:client-assertion-type:jwt-bearer*.
	 */
	client_assertion_type?: string;

	/**
	 * The client assertion.
	 */
	client_assertion?: string;

	/**
	 * The client ID for your application.
	 */
	client_id?: string;

	/**
	 * The client secret for your application.
	 */
	client_secret?: string;

	/**
	 * Authorization code that the consumer must use to obtain the access and refresh tokens.
	 */
	code?: string;

	/**
	 * The grant type.
	 */
	grant_type?: string;

	/**
	 * Determines where the API server redirects the user after the user completes the
	 * authorization flow.
	 */
	redirect_uri?: string;

	/**
	 * The refresh token.
	 */
	refresh_token?: string;

}

/**
 * Optional parameters used when requesting grants.
 */
export interface GrantOptions {

	/**
	 * The client secret for your application.
	 *
	 * Either this value or the signingSecret should be set for the authorization code or refresh flows.
	 */
	clientSecret?: string;

	/**
	 * If true, the JWT present in the id_token field of the access token response is parsed.
	 */
	decodeIdToken?: boolean;

	/**
	 * If true, parses the user information from the id field in the access token response.
	 *
	 * This returns the user ID, organization ID and the ID url.
	 */
	parseUserInfo?: boolean;

	/**
	 * Determines where the API server redirects the user after the user completes the
	 * authorization flow.
	 *
	 * It must be the same value sent by the initial redirect.
	 */
	redirectUri?: string;

	/**
	 * Returns the response format, either JSON, XML or URL_ENCODED.
	 */
	responseFormat?: ResponseFormat;

	/**
	 * The private key used for signing grant assertions as part of the [OAuth 2.0 JWT Bearer Token Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm).
	 *
	 * Either this value or the signingSecret should be set for the authorization code or refresh flows.
	 */
	signingSecret?: Secret;

	/**
	 * If true, verify the ID token with the retrieved JWKs.
	 */
	verifyIdToken?: boolean;

	/**
	 * If true, the signature on the access token response is verified.
	 */
	verifySignature?: boolean;

}

/**
 * Required parameters whrn introspecting tokens.
 */
export interface IntrospectionParams extends HasClientId {

	/**
	 * The client secret for your application.
	 */
	clientSecret?: string;

}

/**
 * Optional parameters used when introspecting tokens.
 */
export interface IntrospectionOptions {

	/**
	 * Returns the response format, either JSON, XML or URL_ENCODED.
	 */
	responseFormat?: ResponseFormat;

}

/**
 * [Introspection Response](https://tools.ietf.org/html/rfc7662#section-2.2)
 */
export interface IntrospectionResponse extends UserInfoResponse {

	/**
	 * Boolean indicator of whether or not the presented token is currently active.  The
	 * specifics of a token's "active" state will vary depending on the implementation of the
	 * authorization server and the information it keeps about its tokens, but a "true" value
	 * return for the "active" property will generally indicate that a given token has been
	 * issued by this authorization server, has not been revoked by the resource owner, and
	 * is within its given time window of validity (e.g., after its issuance time and before its
	 * expiration time).
	 */
	active: boolean;

	/**
	 * Service-specific string identifier or list of string identifiers representing the intended
	 * audience for this token, as defined in JWT.
	 */
	aud?: string;

	/**
	 * Client identifier for the OAuth 2.0 client that requested this token.
	 */
	client_id?: string;

	/**
	 * Integer timestamp, measured in the number of seconds since January 1 1970 UTC,
	 * indicating when this token will expire, as defined in JWT.
	 */
	exp?: number;

	/**
	 * Integer timestamp, measured in the number of seconds since January 1 1970 UTC,
	 * indicating when this token was originally issued, as defined in JWT.
	 */
	iat?: number;

	/**
	 * String representing the issuer of this token, as defined in JWT.
	 */
	iss?: string;

	/**
	 * String identifier for the token, as defined in JWT.
	 */
	jti?: string;

	/**
	 * Integer timestamp, measured in the number of seconds since January 1 1970 UTC,
	 * indicating when this token is not to be used before, as defined in JWT.
	 */
	nbf?: number;

	/**
	 * A JSON string containing a space-separated list of scopes associated with this token.
	 */
	scope?: string;

	/**
	 * Subject of the token, as defined in JWT. Usually a machine-readable identifier of the
	 * resource owner who authorized this token.
	 */
	sub?: string;

	/**
	 * Type of the token.
	 */
	token_type?: string;

	/**
	 * Human-readable identifier for the resource owner who authorized this token.
	 */
	username?: string;

}

/**
 * Parameters required for the [Refresh request](https://openid.net/specs/openid-connect-core-1_0.html#RefreshingAccessToken).
 */
export interface RefreshGrantParams extends RefreshTokenGrantorParams {

	/**
	 * Defines this grant type.
	 */
	grantType: 'refresh_token';

}

export interface RefreshTokenGrantorParams extends TokenGrantorParams {

	/**
	 * The refresh token.
	 */
	refreshToken: string;

}

export interface RevocationOptions {

	/**
	 * If true, uses a GET rather than POST request to revoke an access token.
	 */
	useGet?: boolean;

}

export interface TokenGrantorParams extends HasClientId {

	/**
	 * The client secret for your application.
	 */
	clientSecret?: string;

}

export type GrantParams = AuthCodeGrantParams | JwtGrantParams | RefreshGrantParams;

const DEFAULT_GRANT_OPTIONS = Object.freeze({
	decodeIdToken: true,
	parseUserInfo: true,
	responseFormat: 'application/json',
	verifyIdToken: true,
	verifySignature: true
});

const DEFAULT_REVOCATION_OPTIONS = Object.freeze({
	useGet: false
});

/**
 *  An OAuth 2.0 client that implements the [OAuth 2.0 Authorization Framework](https://tools.ietf.org/html/rfc6749) specification.
 */
export class OAuth2Client implements AuthClient {

	/**
	 * The default configuration for an Axios request.
	 */
	public static readonly DEFAULT_REQUEST_CONFIG: AxiosRequestConfig = Object.freeze({
		validateStatus: () => true
	});

	/**
	 * The client name.
	 */
	protected clientType: string;

	/**
	 * [Authorization Endpoint](https://tools.ietf.org/html/rfc6749#section-3.1)
	 */
	protected authorizationEndpoint?: string;

	/**
	 * [Introspection Endpoint](https://tools.ietf.org/html/rfc7662#section-2)
	 */
	protected introspectionEndpoint?: string | null;

	/**
	 * [Revocation Endpoint](https://tools.ietf.org/html/rfc7009#section-2)
	 */
	protected tokenEndpoint?: string;

	/**
	 * [Revocation Endpoint](https://tools.ietf.org/html/rfc7009#section-2)
	 */
	protected revocationEndpoint?: string;

	/**
	 * The environment parameters used for this client.
	 */
	protected readonly env: Readonly<Environment>;

	/**
	 * Creates a new OAuth2 client with the given environment.
	 *
	 * @param env The OAuth2 environment parameters.
	 */
	constructor(env: Environment) {
		this.clientType = 'OAuth2';
		this.env = Object.freeze(Object.assign({}, env));
	}

	/**
	 * @inheritdoc
	 */
	public async init() {

		if (!this.env.authorizationEndpoint) {
			throw new Error('Missing required string parameter: env[authorizationEndpoint]');
		}

		if (!this.env.revocationEndpoint) {
			throw new Error('Missing required string parameter: env[revocationEndpoint]');
		}

		if (!this.env.tokenEndpoint) {
			throw new Error('Missing required string parameter: env[tokenEndpoint]');
		}

		this.authorizationEndpoint = this.env.authorizationEndpoint;
		this.introspectionEndpoint = this.env.introspectionEndpoint || null;
		this.revocationEndpoint = this.env.revocationEndpoint;
		this.tokenEndpoint = this.env.tokenEndpoint;

	}

	/**
	 * @inheritdoc
	 */
	public createAuthorizationUrl(params: AuthUrlParams, opts?: AuthOptions) {

		if (!this.authorizationEndpoint) {
			throw new Error(`${this.clientType} client has not been initialized`);
		}

		// To avoid any inadvertent parameter leaks, create a new object from which to generate the request.
		const internalOpts: AuthOptions = {
			display: opts && opts.display,
			immediate: opts && opts.immediate,
			prompt: opts && opts.prompt,
			state: opts && opts.state
		};

		const internalParams = {
			client_id: params.clientId,
			redirect_uri: params.redirectUri,
			response_type: 'code',
			scope: params.scope
		};

		const data = Object.assign({}, internalParams, internalOpts);

		if (!data.client_id) {
			throw new Error('Missing required string parameter: clientId');
		}

		if (!data.redirect_uri) {
			throw new Error('Missing required string parameter: redirectUri');
		}

		// Encode the parameters and then replace any encoded spaces (+)
		// with the url version (%20)
		const query = formUrlencoded(data, { sorted: true }).replace('+', '%20');
		return `${this.authorizationEndpoint}?${query}`;

	}

	/**
	 * @inheritdoc
	 */
	public async grant(params: GrantParams, opts?: GrantOptions): Promise<AccessTokenResponse> {

		this.validateGrantParameters(params);

		// To avoid any inadvertent parameter leaks, create  a new object to generate the request from.
		const internalOpts = Object.assign({}, DEFAULT_GRANT_OPTIONS, opts);
		const internalParams = await this.createGrantInternalParameters(params, internalOpts);

		const body = formUrlencoded(internalParams, { sorted: true });

		const config = Object.assign({}, OAuth2Client.DEFAULT_REQUEST_CONFIG, {
			headers: {
				'Accept': internalOpts.responseFormat,
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		const response = await axios.post<AccessTokenResponse | ErrorResponse>(this.tokenEndpoint!, body, config);

		if (response.status !== 200) {
			const error = response.data as ErrorResponse;
			throw new Error(`Failed to obtain grant: ${error.error} (${error.error_description}).`);
		}

		const accessTokenResponse = response.data as AccessTokenResponse;
		return this.handleAccessTokenResponse(accessTokenResponse, internalOpts);

	}

	/**
	 * @inheritdoc
	 */
	public async introspect(token: string, params: IntrospectionParams, opts?: IntrospectionOptions) {

		if (this.introspectionEndpoint === undefined) {
			throw new Error(`${this.clientType} client has not been initialized`);
		}

		if (this.introspectionEndpoint === null) {
			throw new Error(`${this.clientType} client does not support token introspection`);
		}

		if (!params.clientId) {
			throw new Error('Missing required string parameter: clientId');
		}

		if (!params.clientSecret) {
			throw new Error('Missing required string parameter: clientSecret');
		}

		const config = Object.assign({}, OAuth2Client.DEFAULT_REQUEST_CONFIG, {
			headers: {
				'Accept': (opts && opts.responseFormat) || ResponseFormat.JSON,
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		const internalOpts = Object.assign({}, {
			parseUserInfo: true
		}, opts);

		const body = formUrlencoded({
			client_id: params.clientId,
			client_secret: params.clientSecret,
			token
		});

		const response = await axios.post<IntrospectionResponse | ErrorResponse>(this.introspectionEndpoint, body, config);
		if (response.status !== 200) {
			const error = response.data as ErrorResponse;
			throw new Error(`Failed to introspect token: ${error.error} (${error.error_description}).`);
		}

		const introspectionResponse = response.data as IntrospectionResponse;
		return this.handleIntrospectionResponse(introspectionResponse, internalOpts);

	}

	/**
	 * @inheritdoc
	 */
	public async revoke(token: string, opts?: RevocationOptions) {

		if (!this.revocationEndpoint) {
			throw new Error(`${this.clientType} client has not been initialized`);
		}

		const internalOpts = Object.assign({}, DEFAULT_REVOCATION_OPTIONS, opts);

		let response: AxiosResponse;
		let revocationUri = this.revocationEndpoint;

		if (internalOpts.useGet) {
			revocationUri += `?token=${token}`;
			response = await axios.get(revocationUri, OAuth2Client.DEFAULT_REQUEST_CONFIG);
		} else {

			const config = Object.assign({}, OAuth2Client.DEFAULT_REQUEST_CONFIG, {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				}
			});

			const body = formUrlencoded({ token });
			response = await axios.post(revocationUri, body, config);

		}

		return response.status === 200;

	}

	/**
	 * @inheritdoc
	 */
	public getType() {
		return this.clientType;
	}

	/**
	 * Handle the access token response, performing validation and parsing as defined in the grant options.
	 *
	 * @param accessTokenResponse The access token response.
	 * @param internalOpts: The internal options.
	 */
	protected handleAccessTokenResponse(accessTokenResponse: AccessTokenResponse, internalOpts: GrantOptions) {
		return accessTokenResponse;
	}

	/**
	 * Handle the introspection response, performing validation and parsing as defined in the grant options.
	 *
	 * @param introspectionResponse The access token response.
	 * @param internalOpts: The internal options.
	 */
	protected handleIntrospectionResponse(introspectionResponse: IntrospectionResponse, internalOpts: IntrospectionOptions) {
		return introspectionResponse;
	}

	/**
	 * Update the internal grant parameters is accordance with the selected [client authentication](https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication)
	 * mechanism.
	 *
	 * @param params The grant parameters.
	 * @param internalParams The internal grant parameters.
	 * @param internalOpts: The internal options.
	 */
	protected async handleClientAuthentication(params: GrantParams, internalParams: AuthClientGrantParams, internalOpts: GrantOptions) {

		if (!params.clientId) {
			throw new Error('Missing required string parameter: clientId');
		}

		if (!internalOpts.clientSecret) {
			throw new Error('Missing required string parameter: clientSecret');
		}

		internalParams.client_id = params.clientId;
		internalParams.client_secret = internalOpts.clientSecret;

	}

	/**
	 * Validate the grant parameters.
	 *
	 * @param params The grant parameters.
	 */
	protected validateGrantParameters(params: GrantParams) {

		if (!this.tokenEndpoint) {
			throw new Error(`${this.clientType} client has not been initialized`);
		}

		if (params.grantType === 'authorization_code') {

			if (!params.code) {
				throw new Error('Missing required string parameter: code');
			}

		} else if (params.grantType === 'refresh_token') {

			if (!params.refreshToken) {
				throw new Error('Missing required string parameter: refreshToken');
			}

		}

	}

	/**
	 * To avoid any inadvertent parameter leaks, create a new object from which to generate the grant request.
	 *
	 * @param params The grant parameters.
	 * @param internalOpts: The internal options.
	 * @returns The internal grant parameters.
	 */
	private async createGrantInternalParameters(params: GrantParams, internalOpts: GrantOptions) {

		const internalParams: AuthClientGrantParams = {};

		if (params.grantType === 'authorization_code') {
			internalParams.code = params.code;
			internalParams.grant_type = 'authorization_code';
			internalParams.redirect_uri = internalOpts.redirectUri;
		}

		if (params.grantType === 'refresh_token') {
			internalParams.grant_type = 'refresh_token';
			internalParams.refresh_token = params.refreshToken;
		}

		await this.handleClientAuthentication(params, internalParams, internalOpts);

		return internalParams;

	}

}
