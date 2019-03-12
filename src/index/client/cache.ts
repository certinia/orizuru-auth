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
 * @module client/cache
 */

import { createHash } from 'crypto';

import { AuthClient, OAuth2Client } from './oauth2';
import { OAuth2JWTClient } from './oauth2Jwt';
import { OpenIdClient } from './openid';
import { SalesforceClient } from './salesforce';

const cache = new Map<string, AuthClient>();

/**
 * The Auth client environment parameters.
 */
export interface Environment {

	/**
	 * [Authorization Endpoint](https://tools.ietf.org/html/rfc6749#section-3.1).
	 *
	 * This must be defined for OAuth2 clients but should be omitted for OpenID clients.
	 */
	authorizationEndpoint?: string;

	/**
	 * The HTTP timeout used when creating an Auth Client.
	 */
	httpTimeout: number;

	/**
	 * The Issuer URI used when creating an Auth Client.
	 */
	issuerURI: string;

	/**
	 * [Revocation Endpoint](https://tools.ietf.org/html/rfc7009#section-2.1)
	 *
	 * This must be defined for OAuth2 clients but should be omitted for OpenID clients.
	 */
	revocationEndpoint?: string;

	/**
	 * [Token Endpoint](https://tools.ietf.org/html/rfc6749#section-3.2)
	 *
	 * This must be defined for OAuth2 clients but should be omitted for OpenID clients.
	 */
	tokenEndpoint?: string;

	/**
	 * The type of Auth Client.
	 */
	type: 'OAuth2' | 'OAuth2JWT' | 'OpenID' | 'Salesforce';

}

/**
 * Finds the auth client for the given environment.
 *
 * If the auth client is not found, a new client is created and stored in the cache.
 *
 * @param env The auth environment parameters.
 */
export async function findOrCreateClient(env: Environment) {

	const key = createKey(env);

	let client = cache.get(key);
	if (!client) {

		if (env.type === 'Salesforce') {
			client = new SalesforceClient(env);
		} else if (env.type === 'OpenID') {
			client = new OpenIdClient(env);
		} else if (env.type === 'OAuth2JWT') {
			client = new OAuth2JWTClient(env);
		} else {
			client = new OAuth2Client(env);
		}

		await client.init();

		cache.set(key, client);

	}

	return client;

}

/**
 * Clears the OpenID client cache.
 *
 * This results in the recreation of OpenID clients.
 */
export function clear() {
	cache.clear();
}

/**
 * Creates a hash key for the given environment to use in the cache.
 *
 * @param env The auth environment parameters.
 */
function createKey(env: Environment) {
	const { httpTimeout, issuerURI, type } = env;
	return createHash('sha1').update(`${type}|${issuerURI}|${httpTimeout}`).digest('hex');
}
