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
 * @module index/openid/client/identity
 */

import crypto from 'crypto';
import { decode } from 'jsonwebtoken';

import { AccessTokenResponse, Environment, OpenIDToken, OpenIDTokenWithStandardClaims } from '../../..';

/**
 * Decode the `id_token` from an access token reponse.
 *
 * This does not verify the token.
 *
 * @param accessTokenResponse The access token response.
 */
export function decodeIdToken(accessTokenResponse: AccessTokenResponse) {

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
 * Parse the user information from the `id` property of an access token response.
 *
 * It is assumed that the `id` conforms to the Salesforce [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm) format.
 *
 * @param accessTokenResponse The access token response.
 */
export function parseUserInfo(accessTokenResponse: AccessTokenResponse) {

	if (accessTokenResponse.id) {

		const idUrls = accessTokenResponse.id.split('/');
		const id = idUrls.pop();
		const organizationId = idUrls.pop();

		if (!id || (id.length !== 15 && id.length !== 18)) {
			throw new Error('User ID not present');
		}

		if (!organizationId || (organizationId.length !== 15 && organizationId.length !== 18)) {
			throw new Error('Organization ID not present');
		}

		accessTokenResponse.userInfo = Object.assign({
			id,
			organizationId,
			url: accessTokenResponse.id,
			validated: false
		}, accessTokenResponse.userInfo);

	} else {
		throw new Error('No id present');
	}

}

/**
 * [Verifies the signature](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm#grant_access_token) of the access token response.
 *
 * Used to verify that the identity URL hasn’t changed since the server sent it.
 *
 * @param env The OpenID environment parameters.
 * @param accessTokenResponse The access token response.
 */
export function verifySignature(env: Environment, accessTokenResponse: AccessTokenResponse) {

	if (accessTokenResponse.signature) {

		const hmac = crypto.createHmac('sha256', env.openidClientSecret);
		hmac.update(`${accessTokenResponse.id}${accessTokenResponse.issued_at}`);

		const expectedSignature = Buffer.from(hmac.digest('base64'));
		const actualSignature = Buffer.from(accessTokenResponse.signature);

		if (expectedSignature.length !== actualSignature.length) {
			throw new Error('Invalid signature');
		}

		if (!crypto.timingSafeEqual(expectedSignature, actualSignature)) {
			throw new Error('Invalid signature');
		}

		accessTokenResponse.userInfo = {
			url: accessTokenResponse.id,
			validated: true
		};

	} else {
		throw new Error('No signature present');
	}

}
