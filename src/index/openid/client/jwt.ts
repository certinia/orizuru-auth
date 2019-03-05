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
 * @module openid/client/jwt
 */

import { sign } from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';

import { Environment, OpenIDToken, User } from '../../..';

enum AssertionType {
	CLIENT = 'client',
	GRANT = 'grant'
}

/**
 * Creates a [private_key_jwt](https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication) assertion for use in the authentication process.
 *
 * @param env The OpenID environment parameters.
 * @param tokenEndpoint The [OpenID token endpoint](https://openid.net/specs/openid-connect-core-1_0.html#TokenEndpoint).
 */
export async function createJwtBearerClientAssertion(env: Environment, tokenEndpoint: string) {
	const payload = createPayload(tokenEndpoint, env.openidClientId, env.openidClientId);
	return signClientAssertion(payload, env.jwtSigningKey, AssertionType.CLIENT);
}

/**
 * Creates a [private_key_jwt](https://openid.net/specs/openid-connect-core-1_0.html#ClientAuthentication) assertion for use in the authentication process.
 *
 * Unlike the standard client assertion, this assertion provides the username as the
 * subject as defined by [Salesforce](https://help.salesforce.com/articleView?id=remoteaccess_oauth_jwt_flow.htm&type=0#create_token).
 *
 * @param env The OpenID environment parameters.
 * @param user The user to generate the assertion for.
 */
export async function createJwtBearerGrantAssertion(env: Environment, user: User) {
	const payload = createPayload(env.openidIssuerURI, env.openidClientId, user.username);
	return signClientAssertion(payload, env.jwtSigningKey, AssertionType.GRANT);

}

/**
 * Create the JWT payload.
 *
 * @param aud Audience(s) that this ID Token is intended for.
 * @param iss Issuer.
 * @param sub Subject identifier.
 */
function createPayload(aud: string, iss: string, sub: string) {

	const now = Date.now() / 1000;

	const nowPlusFourMinutes = () => {
		return Math.floor(Date.now() / 1000) + (60 * 4);
	};

	return {
		aud,
		exp: nowPlusFourMinutes(),
		iat: now,
		iss,
		jti: uuid().toString(),
		sub
	};

}

/**
 * Sign the payload using the given private key.
 *
 * @param payload The payload to sign.
 * @param privateKey The private key to sign the payload with.
 * @param type The assertion type (either client or grant).
 */
function signClientAssertion(payload: OpenIDToken, privateKey: string, type: AssertionType) {

	return new Promise<string>((resolve, reject) => {

		sign(payload, privateKey, { algorithm: 'RS256' }, (err, encoded) => {
			if (err) {
				reject(new Error(`Failed to sign ${type} assertion.`));
			} else {
				resolve(encoded);
			}
		});

	});

}
