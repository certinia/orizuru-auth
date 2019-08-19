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
 * @module client/openid/identity
 */

import { decode, verify } from 'jsonwebtoken';

import { AccessTokenResponse } from '../oauth2';
import { OpenIDAccessTokenResponse, OpenIDToken, OpenIDTokenWithStandardClaims } from '../openid';
import { JsonWebKeyPemFormatMap } from './jwk';

/**
 * Decode the `id_token` from an access token response.
 *
 * This does not verify the token.
 *
 * @param accessTokenResponse The access token response.
 */
export function decodeIdToken(accessTokenResponse: OpenIDAccessTokenResponse) {

	if (accessTokenResponse.id_token) {

		if (typeof accessTokenResponse.id_token === 'string') {
			accessTokenResponse.id_token = decode(accessTokenResponse.id_token) as OpenIDToken | OpenIDTokenWithStandardClaims;
		}

	} else if (accessTokenResponse.scope) {

		const scopes = accessTokenResponse.scope.split(' ');
		if (scopes.includes('openid')) {
			throw new Error('No id_token present');
		}

	} else {
		throw new Error('No id_token present');
	}

}

/**
 * Verify the `id_token` from an access token response.
 *
 * @param accessTokenResponse The access token response.
 * @param [jwkPemFormatMap] Map of the retrieved JSON Web Keys, keyed by the Key ID Parameter, in PEM format.
 */
export function verifyIdToken(accessTokenResponse: OpenIDAccessTokenResponse, jwkPemFormatMap?: JsonWebKeyPemFormatMap) {

	if (!jwkPemFormatMap) {
		throw new Error('Unable to verify ID token: No JWKs provided');
	}

	if (accessTokenResponse.id_token) {

		if (typeof accessTokenResponse.id_token !== 'string') {
			throw new Error('Unable to verify ID token: id_token is not a string');
		}

		const decodedIdToken = decode(accessTokenResponse.id_token, {
			complete: true
		});

		if (!decodedIdToken || typeof decodedIdToken !== 'object') {
			throw new Error('Unable to verify ID token: decoded token is not an object');
		}

		if (!decodedIdToken.header) {
			throw new Error('Unable to verify ID token: decoded token does not contain the header');
		}

		if (!decodedIdToken.header.kid) {
			throw new Error('Unable to verify ID token: decoded token header does not contain the kid');
		}

		const secret = jwkPemFormatMap[decodedIdToken.header.kid];
		verify(accessTokenResponse.id_token, secret);

	} else if (accessTokenResponse.scope) {

		const scopes = accessTokenResponse.scope.split(' ');
		if (scopes.includes('openid')) {
			throw new Error('No id_token present');
		}

	} else {
		throw new Error('No id_token present');
	}

}

/**
 * Determines whether the id token is an OpenID token with standard claims.
 *
 * @param token The id token.
 * @returns A boolean indicating if this id token is an OpenID token with standard claims.
 */
export function isOpenIdTokenWithStandardClaims(token?: string | OpenIDToken | OpenIDTokenWithStandardClaims | null): token is OpenIDTokenWithStandardClaims {
	return (token as OpenIDTokenWithStandardClaims).email !== undefined;
}

/**
 * Determines whether the token is a Salesforce access token response.
 *
 * @param token The access token response.
 * @returns A boolean indicating if this token is a Salesforce access token response.
 */
export function isOpenIdAccessTokenResponse(token: AccessTokenResponse | OpenIDAccessTokenResponse): token is OpenIDAccessTokenResponse {
	return (token as OpenIDAccessTokenResponse).id_token !== undefined;
}
