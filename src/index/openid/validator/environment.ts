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
 * @module index/openid/validator/environment
 */

import { Environment } from '../../..';

/**
 * Validates the environment and throws an error if it is invalid.
 *
 * @param [env] The OpenID environment parameters.
 */
export function validate(env?: Environment) {

	if (!env) {
		throw new Error('Missing required object parameter.');
	}

	if (env.jwtSigningKey === '') {
		throw new Error('Invalid parameter: jwtSigningKey cannot be empty.');
	}

	if (!env.jwtSigningKey) {
		throw new Error('Missing required string parameter: jwtSigningKey.');
	}

	if (env.openidClientId === '') {
		throw new Error('Invalid parameter: openidClientId cannot be empty.');
	}

	if (!env.openidClientId) {
		throw new Error('Missing required string parameter: openidClientId.');
	}

	if (env.openidClientSecret === '') {
		throw new Error('Invalid parameter: openidClientSecret cannot be empty.');
	}

	if (!env.openidClientSecret) {
		throw new Error('Missing required string parameter: openidClientSecret.');
	}

	if (!env.openidHTTPTimeout) {
		throw new Error('Missing required number parameter: openidHTTPTimeout.');
	}

	if (typeof env.openidHTTPTimeout !== 'number') {
		throw new Error('Invalid parameter: openidHTTPTimeout is not a number.');
	}

	if (env.openidIssuerURI === '') {
		throw new Error('Invalid parameter: openidIssuerURI cannot be empty.');
	}

	if (!env.openidIssuerURI) {
		throw new Error('Missing required string parameter: openidIssuerURI.');
	}

	return env;

}
