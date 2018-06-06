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

import { AccessTokenResponse, Options } from '..';
import { validate } from './shared/envValidator';
import { constructIssuer } from './shared/issuer';
import { createJwtBearerClientAssertion } from './shared/jwt';

const ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

export async function generateAuthorizeUrl(env: Options.Auth, redirectUri: string, state: string) {

	validate(env);

	const issuer = await constructIssuer(env);

	const responseType = 'response_type=code';
	const clientId = `client_id=${env.openidClientId}`;
	return `${issuer.authorization_endpoint}?${responseType}&${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;

}

export async function requestAccessTokenWithClientAssertion(env: Options.Auth, redirectUri: string, state: string, code: string): Promise<AccessTokenResponse> {

	validate(env);

	const issuer = await constructIssuer(env);
	const jwtBearerAssertion = await createJwtBearerClientAssertion(env, issuer);

	const grantType = 'grant_type=authorization_code';
	const clientId = `client_id=${env.openidClientId}`;
	const clientAssertion = `client_assertion=${jwtBearerAssertion}`;

	const clientAssertionType = `client_assertion_type=${ASSERTION_TYPE}`;

	const authUri = `${issuer.token_endpoint}?${grantType}&code=${code}&${clientId}&${clientAssertion}&${clientAssertionType}&redirect_uri=${encodeURIComponent(redirectUri)}&format=json`;

	const response = await request.post(authUri);
	return response.data;

}
