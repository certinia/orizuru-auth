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
 * @module index/grant/grant
 */

import { AccessTokenResponse, Environment, Grant, User, UserTokenGrantor } from '../..';
import { findOrCreateOpenIdClient } from '../openid/cache';
import { validate } from '../openid/validator/environment';

/**
 * Returns a function that can obtain a token for the passed user.
 *
 * @param [env] The OpenID environment parameters.
 */
export function getToken(env?: Environment): UserTokenGrantor {

	const validatedEnvironment = validate(env);

	return async function getUserCredentials(user: User) {

		try {

			validateUser(user);

			const authorizationGrant = await obtainGrant(validatedEnvironment, user);
			return convertGrantToCredentials(authorizationGrant);

		} catch (error) {
			throw new Error(`Failed to obtain grant for user${error.message}.`);
		}

	};

}

function validateUser(user: User) {

	if (!user) {
		throw new Error('. Caused by: Missing required object parameter: user');
	}

	if (user.username == null) {
		throw new Error('. Caused by: Missing required string parameter: user[username]');
	}

	if (!user.username.length) {
		throw new Error('. Caused by: Invalid parameter: user[username] cannot be empty');
	}

}

async function obtainGrant(env: Environment, user: User) {

	try {

		const client = await findOrCreateOpenIdClient(env);
		return client.grant({
			grantType: 'jwt',
			user
		}, { decodeIdToken: false, verifySignature: false });

	} catch (error) {
		throw new Error(` (${user.username}). Caused by: ${error.message}`);
	}

}

function convertGrantToCredentials(authorizationGrant: AccessTokenResponse): Grant {

	return {
		accessToken: authorizationGrant.access_token,
		instanceUrl: authorizationGrant.instance_url,
		userInfo: authorizationGrant.userInfo
	};

}