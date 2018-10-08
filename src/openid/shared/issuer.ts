/**
 * Copyright (c) 2017-2018, FinancialForce.com, inc
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

import { createHash } from 'crypto';

import * as openidClient from 'openid-client';
import { Environment } from '../..';

/**
 * @private
 */
const cache: { [s: string]: openidClient.Issuer; } = {};

/**
 * @private
 */
function createKey(httpTimeOut: number, openidIssuerUri: string) {
	return createHash('sha1').update(openidIssuerUri + '|' + httpTimeOut).digest('hex');
}

/**
 * @private
 */
async function buildIssuer(httpTimeOut: number, openidIssuerUri: string) {

	openidClient.Issuer.defaultHttpOptions = {
		timeout: httpTimeOut
	};

	return await openidClient.Issuer.discover(openidIssuerUri);

}

/**
 * @private
 */
export function clearCache() {
	Object.keys(cache).forEach((key) => {
		delete cache[key];
	});
}

/**
 * @private
 */
export async function constructIssuer(env: Environment) {

	const httpTimeOut = env.openidHTTPTimeout;
	const openidIssuerUri = env.openidIssuerURI;
	const key = createKey(httpTimeOut, openidIssuerUri);

	let issuer = cache[key];
	if (!issuer) {
		issuer = await buildIssuer(httpTimeOut, openidIssuerUri);
		cache[key] = issuer;
	}

	return Promise.resolve(issuer);

}

/**
 * @private
 */
export function constructIssuerClient(env: Environment) {

	return constructIssuer(env)
		.then((issuer) => {
			return new issuer.Client();
		})
		.catch(() => {
			throw new Error(`Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}.`);
		});

}
