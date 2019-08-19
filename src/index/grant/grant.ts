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
 * @module grant/grant
 */

import { AccessTokenResponse, Environment, GrantOptions, JwtGrantParams, User, UserTokenGrantor, UserTokenGrantorParams } from '../..';
import { findOrCreateClient } from '../client/cache';
import { isSalesforceAccessTokenResponse, UserInfo } from '../client/salesforce/identity';
import { validate } from '../client/validator/environment';

export interface Grant {

	/**
	 * The access token issued by the authorization server.
	 */
	accessToken: string;

	/**
	 * A URL indicating the instance of the user’s org. For example: https://yourInstance.salesforce.com/.
	 */
	instanceUrl?: string;

	/**
	 * The user information generated when parsing the [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm).
	 */
	userInfo?: UserInfo;

}

/**
 * Returns a function that can obtain a token for the passed user.
 *
 * @param env The auth environment parameters.
 * @returns A function that retrieves the user credentials.
 */
export function getToken(env: Environment): UserTokenGrantor {

	const validatedEnvironment = validate(env);

	return async function getUserCredentials(params: UserTokenGrantorParams, opts?: GrantOptions) {

		try {

			validateUser(params.user);

			// The TokenGrantorParams interface excludes the grant_type so that it
			// doesn't have to be set by the caller. Make sure it is set here.
			const internalParams: Partial<JwtGrantParams> = Object.assign({}, params);
			internalParams.grantType = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

			const authorizationGrant = await obtainGrant(validatedEnvironment, internalParams as JwtGrantParams, opts);
			return convertGrantToCredentials(authorizationGrant);

		} catch (error) {
			throw new Error(`Failed to obtain grant for user${error.message}.`);
		}

	};

}

/**
 * Validates that the user contains the correct information.
 * @param user The user to validate.
 */
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

/**
 * Obtains a grant for the given user using the OpenID client.
 * @param env The auth environment parameters.
 * @param params The parameters required for the JWT grant type.
 * @param [opts] The grant options to be used.
 * @returns The access token response.
 */
async function obtainGrant(env: Environment, params: JwtGrantParams, opts?: GrantOptions) {

	try {

		const client = await findOrCreateClient(env);
		return await client.grant(params, opts);

	} catch (error) {
		throw new Error(` (${params.user.username}). Caused by: ${error.message}`);
	}

}

/**
 * Converts the access token response to a grant that can be used in tandem with
 * other NPM modules such as [JSforce])https://github.com/jsforce/jsforce).
 * @param token - The access token response.
 * @returns The user credentials.
 */
function convertGrantToCredentials(token: AccessTokenResponse): Grant {

	if (isSalesforceAccessTokenResponse(token)) {

		return {
			accessToken: token.access_token,
			instanceUrl: token.instance_url,
			userInfo: token.userInfo
		};

	}

	return { accessToken: token.access_token };

}
