/**
 * Copyright (c) 2018-2019, FinancialForce.com, inc
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

import { AxiosRequestConfig, default as request } from 'axios';
import { Environment } from '..';

import { validate } from '../openid/shared/envValidator';
import { constructIssuer } from '../openid/shared/issuer';

export namespace revocation {

	/**
	 * Revokes the given access token using the Salesforce GET support.
	 *
	 * We need to use axios rather than the OpenID issuer client revoke function as it does not follow redirects.
	 * Specifically, the 302 http response code with the POST method and the got NPM module.
	 *
	 * @see https://help.salesforce.com/articleView?id=remoteaccess_revoke_token.htm
	 */
	export async function revokeAccessToken(env: Environment, token: string) {

		validate(env);

		const issuer = await constructIssuer(env);

		const revocationUri = `${issuer.revocation_endpoint}?token=${token}`;

		const config: AxiosRequestConfig = {
			validateStatus: () => true
		};

		const response = await request.get(revocationUri, config);
		return response.status === 200;

	}

}
