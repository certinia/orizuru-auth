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
 * @module client/oauth2Jwt
 */

import { Secret } from 'jsonwebtoken';

import { Environment } from './cache';
import { AccessTokenResponse, AuthClientGrantParams, GrantOptions, GrantParams, OAuth2Client, TokenGrantorParams } from './oauth2';
import { createJwtBearerClientAssertion, createJwtBearerGrantAssertion } from './oauth2Jwt/jwt';

/**
 * A [JSON Web Token](https://tools.ietf.org/html/rfc7519) that fulfils the requirements of the
 * [JSON Web Token (JWT) Profile for OAuth 2.0 Client Authentication and Authorization Grants](https://tools.ietf.org/html/rfc7523) specification.
 *
 * All fields are marked as optional/required according to the [JWT requirements](https://tools.ietf.org/html/rfc7523#section-3).
 */
export interface JWT {

	/**
	 * The JWT may contain [other claims](https://tools.ietf.org/html/rfc7523#section-3).
	 */
	[index: string]: boolean | number | object | string | null | undefined;

	/**
	 * [Audience Claim](https://tools.ietf.org/html/rfc7519#section-4.1.3)
	 *
	 * The audience claim identifies the recipients that the JWT is intended for.
	 */
	aud?: string;

	/**
	 * [Expiration Time Claim](https://tools.ietf.org/html/rfc7519#section-4.1.4)
	 *
	 * The expiration time claim identifies the expiration time on or after which the JWT
	 * must not be accepted for processing.
	 */
	exp?: number;

	/**
	 * [Issued At Claim](https://tools.ietf.org/html/rfc7519#section-4.1.6)
	 *
	 *  The issued at claim identifies the time at which the JWT was issued.
	 */
	iat?: number;

	/**
	 * [Issuer Claim](https://tools.ietf.org/html/rfc7519#section-4.1.1)
	 *
	 * The issuer claim identifies the principal that issued the JWT.
	 */
	iss: string;

	/**
	 * [JWT ID Claim](https://tools.ietf.org/html/rfc7519#section-4.1.7)
	 *
	 * The JWT ID claim provides a unique identifier for the JWT.
	 */
	jti?: string;

	/**
	 * [Not Before Claim](https://tools.ietf.org/html/rfc7519#section-4.1.5)
	 *
	 * The not before claim identifies the time before which the JWT must not be accepted
	 * for processing.
	 */
	nbf?: string;

	/**
	 * [Subject Claim](https://tools.ietf.org/html/rfc7519#section-4.1.2)
	 *
	 * The subject claim identifies the principal that is the subject of the JWT.
	 */
	sub?: string;

}

/**
 * Parameters required for the JWT grant type.
 */
export interface JwtGrantParams extends UserTokenGrantorParams {

	/**
	 * Defines this grant type.
	 */
	grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer';

}

export interface JwtTokenGrantorParams extends TokenGrantorParams {

	/**
	 * The private key used for signing grant assertions as part of the [OAuth 2.0 JWT Bearer Token Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm).
	 */
	signingSecret: Secret;

}

/**
 * The User credentials required to initialise the JWT flow.
 */
export interface User {

	/**
	 * The user name.
	 */
	username: string;

}

export interface UserTokenGrantorParams extends JwtTokenGrantorParams {

	/**
	 * The user that is requesting access.
	 */
	user: User;

}

/**
 * An OAuth 2.0 client that implements the [JSON Web Token (JWT) Profile for OAuth 2.0 Client Authentication and Authorization Grants](https://tools.ietf.org/html/rfc7523)
 * specification.
 */
export class OAuth2JWTClient extends OAuth2Client {

	/**
	 * Creates a new OpenID client with the given environment.
	 *
	 * @param env The OAuth2 environment parameters.
	 */
	constructor(env: Environment) {
		super(env);
		this.clientType = 'OAuth2JWT';
	}

	/**
	 * @inheritdoc
	 */
	public async grant(params: GrantParams, opts?: GrantOptions): Promise<AccessTokenResponse> {
		return super.grant(params, opts);
	}

	/**
	 * @inheritdoc
	 */
	protected validateExtraGrantParamters(params: GrantParams) {

		if (params.grantType === 'urn:ietf:params:oauth:grant-type:jwt-bearer') {

			if (!params.signingSecret) {
				throw new Error('Missing required object parameter: signingSecret.');
			}

			if (!params.user) {
				throw new Error('Missing required object parameter: user.');
			}
		}

	}

	/**
	 * @inheritdoc
	 */
	protected async handleClientAuthentication(params: GrantParams, internalParams: AuthClientGrantParams, internalOpts: GrantOptions) {

		if (params.grantType === 'urn:ietf:params:oauth:grant-type:jwt-bearer') {

			const assertion = await createJwtBearerGrantAssertion(this.env, params);
			internalParams.assertion = assertion;
			internalParams.grant_type = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

		} else {

			if (!params.clientId) {
				throw new Error('Missing required string parameter: clientId');
			}

			internalParams.client_id = params.clientId;

			if (internalOpts.signingSecret) {
				internalParams.client_assertion_type = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
				internalParams.client_assertion = await createJwtBearerClientAssertion(params, internalOpts.signingSecret, this.tokenEndpoint!);
			} else {

				if (!internalOpts.clientSecret) {
					throw new Error('Missing required string parameter: clientSecret');
				}

				internalParams.client_secret = internalOpts.clientSecret;

			}
		}

	}

}
