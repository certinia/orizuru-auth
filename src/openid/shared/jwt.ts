/**
 * Copyright (c) 2018, FinancialForce.com, inc
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

import { sign } from 'jsonwebtoken';
import { Issuer } from 'openid-client';
import uuid from 'uuid';

import { Options, User } from '../..';

/**
 * @private
 */
const RSA_256 = 'RS256';

/**
 * @private
 */
const RSA_256_ALGORITHM = { algorithm: RSA_256 };

export async function createJwtBearerClientAssertion(env: Options.Auth, issuer: Issuer) {

	const nowPlusFourMinutes = () => {
		return Math.floor(Date.now() / 1000) + (60 * 4);
	};

	const payload = {
		aud: issuer.token_endpoint,
		exp: nowPlusFourMinutes(),
		iss: env.openidClientId,
		jti: uuid.v4(),
		sub: env.openidClientId
	};

	try {
		return await sign(payload, env.jwtSigningKey, RSA_256_ALGORITHM);
	} catch (error) {
		throw new Error('Failed to sign client assertion');
	}

}

export async function createJwtBearerGrantAssertion(env: Options.Auth, user: User) {

	const nowPlusFourMinutes = () => {
		return Math.floor(Date.now() / 1000) + (60 * 4);
	};

	const payload = {
		aud: env.openidIssuerURI,
		exp: nowPlusFourMinutes(),
		iss: env.openidClientId,
		sub: user.username
	};

	try {
		return await sign(payload, env.jwtSigningKey, RSA_256_ALGORITHM);
	} catch (error) {
		throw new Error('Failed to sign grant assertion');
	}

}