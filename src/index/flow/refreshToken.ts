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
 * @module flow/refreshToken
 */

import { AccessTokenResponse, Environment, GrantOptions, RefreshAccessTokenGrantor, RefreshGrantParams, RefreshTokenGrantorParams } from '..';
import { findOrCreateClient } from '../client/cache';
import { validate } from '../client/validator/environment';

/**
 * Uses the [OAuth 2.0 Refresh Token Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_refresh_token_flow.htm) to renew tokens issued by the web server or
 * user-agent flows.
 *
 * @param [env] The auth environment parameters.
 * @returns A function that requests an access token from the given refresh token.
 */
export function createTokenGrantor(env: Environment): RefreshAccessTokenGrantor {

	const validatedEnvironment = validate(env);

	return async function requestAccessToken(params: RefreshTokenGrantorParams, opts?: GrantOptions): Promise<AccessTokenResponse> {

		const client = await findOrCreateClient(validatedEnvironment);

		// The RefreshTokenGrantorParams interface excludes the grant_type so that it
		// doesn't have to be set by the caller. Make sure it is set here.
		const internalParams: Partial<RefreshGrantParams> = Object.assign({}, params);
		internalParams.grantType = 'refresh_token';

		const accessTokenResponse = await client.grant(internalParams as RefreshGrantParams, opts);
		accessTokenResponse.refresh_token = params.refreshToken;
		return accessTokenResponse;

	};

}
