/**
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
 * Used to get access tokens from the identity provider for a
 * user.
 */

import { OpenIdGrant } from 'openid-client';

import { Environment, Grant as IGrant, User, UserInfo } from '..';
import { obtainAuthorizationGrant } from './shared/authorizationGrant';
import { validate } from './shared/envValidator';
import { constructIssuerClient } from './shared/issuer';
import { createJwtBearerGrantAssertion } from './shared/jwt';

/**
 * @private
 */
function validateUser(user: User) {

	if (!user || user.username === '') {
		throw new Error('Invalid parameter: username cannot be empty.');
	}

	if (!user.username) {
		throw new Error('Missing required parameter: username.');
	}

}

/**
 * @private
 */
function convertGrantToCredentials(authorizationGrant: OpenIdGrant): IGrant {

	let userInfo: UserInfo | undefined;

	if (authorizationGrant.id) {

		const idUrls = authorizationGrant.id.split('/');
		const id = idUrls.pop() as string;
		const organizationId = idUrls.pop() as string;

		userInfo = {
			id,
			organizationId,
			url: authorizationGrant.id
		};

	}

	return {
		accessToken: authorizationGrant.access_token,
		instanceUrl: authorizationGrant.instance_url,
		userInfo
	};

}

export namespace grant {

	/**
	 * Returns a function that can obtain a token for the passed user.
	 */
	export function getToken(env: Environment) {

		validate(env);

		return async (user: User) => {

			try {

				validateUser(user);

				const issuerClient = await constructIssuerClient(env);
				const assertion = await createJwtBearerGrantAssertion(env, user);
				const authorizationGrant = await obtainAuthorizationGrant(assertion, issuerClient);
				return convertGrantToCredentials(authorizationGrant);

			} catch (error) {
				throw new Error(`Failed to grant token, error: ${error.message}`);
			}

		};

	}

}
