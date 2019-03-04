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
 * @module index/openid/client
 */

import axios, { AxiosResponse } from 'axios';
import formUrlencoded from 'form-urlencoded';

import { AccessTokenResponse, AuthOptions, Environment, ErrorResponse, GrantOptions, OpenIDTokenWithStandardClaims, RevocationOptions, User, UserInfoOptions } from '../../index';
import { decodeIdToken, parseUserInfo, verifySignature } from './client/identity';
import { createJwtBearerClientAssertion, createJwtBearerGrantAssertion } from './client/jwt';

interface AuthorizationUrlParameters {
	redirect_uri?: string;
	state: string;
}

interface GrantParameters {
	code?: string;
	grantType: 'auth' | 'jwt' | 'refresh';
	redirectUri?: string;
	refreshToken?: string;
	user?: User;
}

interface InternalGrantParameters {
	assertion?: string;
	client_assertion?: string;
	client_assertion_type?: string;
	client_id?: string;
	client_secret?: string;
	code?: string;
	grant_type?: GrantType;
	redirect_uri?: string;
	refresh_token?: string;
}

type GrantType = 'authorization_code' | 'urn:ietf:params:oauth:grant-type:jwt-bearer' | 'refresh_token';

const DEFAULT_GRANT_OPTIONS = Object.freeze({
	decodeIdToken: true,
	parseUserInfo: true,
	responseFormat: 'application/json',
	useJwt: true,
	verifySignature: true
});

const DEFAULT_REVOCATION_OPTIONS = Object.freeze({
	useGet: false
});

const DEFAULT_USERINFO_OPTIONS = Object.freeze({
	responseFormat: 'application/json'
});

const DEFAULT_REQUEST_CONFIG = Object.freeze({
	validateStatus: undefined
});

/**
 * An OpenID client that implements the parts of the [OpenID Connect Specification](https://openid.net/specs/openid-connect-core-1_0.html)
 * required for Salesforce authentication.
 */
export class OpenIdClient {

	/**
	 * [Authorization Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#AuthorizationEndpoint)
	 */
	private authorizationEndpoint?: string;

	/**
	 * Revocation Endpoint
	 */
	private revocationEndpoint?: string;

	/**
	 * [Token Endpoint](https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint)
	 */
	private tokenEndpoint?: string;

	/**
	 * [UserInfo endpoint](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)
	 */
	private userinfoEndpoint?: string;

	/**
	 * The OpenID environment parameters used for this OpenID client.
	 */
	private readonly env: Readonly<Environment>;

	/**
	 * Creates a new OpenID client with the given environment.
	 *
	 * @param env The OpenID environment parameters.
	 */
	constructor(env: Environment) {
		this.env = Object.freeze(Object.assign({}, env));
	}

	/**
	 * Initalize the OpenIdClient by requesting the OpenID configuration for the OpenId
	 * Issuer provided in the environment.
	 */
	public async init() {

		const uri = `${this.env.openidIssuerURI.replace(/\/$/, '')}/.well-known/openid-configuration`;
		const response = await axios.get(uri, { timeout: this.env.openidHTTPTimeout });
		const data = response.data;

		this.authorizationEndpoint = data.authorization_endpoint;
		this.revocationEndpoint = data.revocation_endpoint;
		this.tokenEndpoint = data.token_endpoint;
		this.userinfoEndpoint = data.userinfo_endpoint;

	}

	/**
	 * Creates the authorization URL.
	 *
	 * @param params The authentication URL parameters.
	 * @param [opts] The authentication options to be used when generating the URL.
	 */
	public createAuthorizationUrl(params: AuthorizationUrlParameters, opts?: AuthOptions) {

		if (!this.authorizationEndpoint) {
			throw new Error('OpenID client has not been initialized');
		}

		const internalParams = Object.assign({}, opts, {
			client_id: this.env.openidClientId,
			redirect_uri: this.env.redirectUri,
			response_type: 'code'
		}, params);

		const query = formUrlencoded(internalParams);
		return `${this.authorizationEndpoint}?${query}`;

	}

	/**
	 * Obtain a grant with the specified parameters.
	 *
	 * @param params The grant parameters.
	 * @param [opts] The grant options to be used.
	 */
	public async grant(params: GrantParameters, opts?: GrantOptions): Promise<AccessTokenResponse> {

		if (!this.tokenEndpoint) {
			throw new Error('OpenID client has not been initialized');
		}

		const internalOpts = Object.assign({}, DEFAULT_GRANT_OPTIONS, opts);

		const internalParams: InternalGrantParameters = {};

		if (params.grantType === 'auth') {

			if (!params.code) {
				throw new Error('Missing required string parameter: code');
			}

			if (!params.redirectUri && !this.env.redirectUri) {
				throw new Error('Missing required string parameter: redirectUri');
			}

			internalParams.grant_type = 'authorization_code';
			internalParams.code = params.code;
			internalParams.redirect_uri = params.redirectUri || this.env.redirectUri;

		} else if (params.grantType === 'refresh') {

			if (!params.refreshToken) {
				throw new Error('Missing required string parameter: refresh_token');
			}

			internalParams.grant_type = 'refresh_token';
			internalParams.refresh_token = params.refreshToken;

		} else if (params.grantType === 'jwt') {

			if (!params.user) {
				throw new Error('Missing required object parameter: user.');
			}

			internalParams.grant_type = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
			internalParams.assertion = await createJwtBearerGrantAssertion(this.env, params.user);

		}

		if (params.grantType !== 'jwt') {

			internalParams.client_id = this.env.openidClientId;

			if (internalOpts.useJwt) {
				internalParams.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
				internalParams.client_assertion = await createJwtBearerClientAssertion(this.env, this.tokenEndpoint);
			} else {
				internalParams.client_secret = this.env.openidClientSecret;
			}

		}

		const body = formUrlencoded(internalParams);

		const config = Object.assign({}, DEFAULT_REQUEST_CONFIG, {
			headers: {
				'Accept': internalOpts.responseFormat,
				'Content-Type': 'application/x-www-form-urlencoded'
			}
		});

		const response = await axios.post<AccessTokenResponse | ErrorResponse>(this.tokenEndpoint, body, config);

		if (response.status !== 200) {
			const error = response.data as ErrorResponse;
			throw new Error(`Failed to obtain grant: ${error.error} (${error.error_description}).`);
		}

		const data = response.data as AccessTokenResponse;

		try {

			if (internalOpts.decodeIdToken) {
				decodeIdToken(data);
			}

			if (internalOpts.verifySignature) {
				verifySignature(this.env, data);
			}

			if (internalOpts.parseUserInfo) {
				parseUserInfo(data);
			}

		} catch (error) {
			throw new Error(`Failed to obtain grant: ${error.message}.`);
		}

		return data;

	}

	/**
	 * Revoke a token.
	 *
	 * @param token The token to be revoked.
	 * @param [opts] The revocation options to be used.
	 */
	public async revoke(token: string, opts?: RevocationOptions) {

		if (!this.revocationEndpoint) {
			throw new Error('OpenID client has not been initialized');
		}

		const internalOpts = Object.assign({}, DEFAULT_REVOCATION_OPTIONS, opts);

		let response: AxiosResponse;
		let revocationUri = this.revocationEndpoint;

		if (internalOpts.useGet) {
			revocationUri += `?token=${token}`;
			response = await axios.get(revocationUri, DEFAULT_REQUEST_CONFIG);
		} else {

			const config = Object.assign({}, DEFAULT_REQUEST_CONFIG, {
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
	 * Retrieve the user information using the provided token.
	 *
	 * @param token The token to be used.
	 * @param [opts] The user info options to be used.
	 */
	public async userinfo(token: string, opts?: UserInfoOptions): Promise<string | OpenIDTokenWithStandardClaims> {

		if (!this.userinfoEndpoint) {
			throw new Error('OpenID client has not been initialized');
		}

		const internalOpts = Object.assign({}, DEFAULT_USERINFO_OPTIONS, opts);

		const config = Object.assign({}, DEFAULT_REQUEST_CONFIG, {
			headers: {
				Accept: internalOpts.responseFormat,
				Authorization: `Bearer ${token}`
			}
		});

		const response = await axios.get(this.userinfoEndpoint, config);

		if (response.status !== 200) {
			throw new Error(`Failed to obtain user information: ${response.data}.`);
		}

		return response.data;

	}

}
