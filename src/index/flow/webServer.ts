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
 * @module flow/webServer
 */

import { AuthCodeAccessTokenGrantor, AuthCodeGrantParameters, AuthOptions, AuthUrlGenerator, Environment, GrantOptions } from '..';
import { findOrCreateOpenIdClient } from '../openid/cache';
import { validate } from '../openid/validator/environment';

/**
 * Creates the authorization endpoint to initialise the [OAuth 2.0 Web Server Authentication Flow](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm).
 *
 * @param [env] The OpenID environment parameters.
 */
export function authorizationUrlGenerator(env?: Environment): AuthUrlGenerator {

	const validatedEnvironment = validate(env);

	return async function generateAuthorizationUrl(state: string, opts?: AuthOptions) {

		const openidClient = await findOrCreateOpenIdClient(validatedEnvironment);
		return openidClient.createAuthorizationUrl({
			redirect_uri: validatedEnvironment.redirectUri!,
			state
		}, opts);

	};

}

/**
 * [Exchanges a verification code for an access token](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm#vc_for_at).
 *
 * Defaults to using a signed JWT bearer assertion to validate the user rather than the
 * using the client secret. However, this is configurable via the GrantOptions.
 *
 * @param [env] The OpenID environment parameters.
 */
export function createTokenGrantor(env?: Environment): AuthCodeAccessTokenGrantor {

	const validatedEnvironment = validate(env);

	return async function requestAccessToken(params: AuthCodeGrantParameters, opts?: GrantOptions) {

		const client = await findOrCreateOpenIdClient(validatedEnvironment);
		return client.grant({
			code: params.code,
			grantType: 'auth'
		}, opts);

	};

}
