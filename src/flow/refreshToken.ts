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

import { default as request } from 'axios';
import formUrlencoded from 'form-urlencoded';
import { decode } from 'jsonwebtoken';

import { AccessTokenResponse, Options, SalesforceJwt } from '..';
import { validate } from '../openid/shared/envValidator';
import { constructIssuer } from '../openid/shared/issuer';
import { createJwtBearerClientAssertion } from '../openid/shared/jwt';

const ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

/**
 * The OAuth 2.0 refresh token flow is for renewing tokens issued by the web server or user-agent flows.
 *
 * @see https://help.salesforce.com/articleView?id=remoteaccess_oauth_refresh_token_flow.htm
 */
export namespace refreshToken {

	export async function requestAccessTokenWithClientAssertion(env: Options.Auth, token: string): Promise<AccessTokenResponse> {

		validate(env);

		const issuer = await constructIssuer(env);
		const jwtBearerAssertion = await createJwtBearerClientAssertion(env, issuer);

		const parameters = {
			['grant_type']: 'refresh_token',
			['refresh_token']: token,
			['client_id']: env.openidClientId,
			['client_assertion']: jwtBearerAssertion,
			['client_assertion_type']: ASSERTION_TYPE,
			format: 'json'
		};

		const authUri = `${issuer.token_endpoint}?${formUrlencoded(parameters)}`;

		const response = await request.post(authUri);

		const accessTokenResponse: AccessTokenResponse = response.data;
		const idToken = accessTokenResponse.id_token;
		if (idToken) {
			const decodedToken = decode(idToken as string) as SalesforceJwt;
			accessTokenResponse.id_token = decodedToken;
			accessTokenResponse.refresh_token = token;
		}

		return accessTokenResponse;

	}

}
