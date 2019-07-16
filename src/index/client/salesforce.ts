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
 * @module client/salesforce
 */

import { Environment } from './cache';
import { GrantOptions, GrantParams, IntrospectionOptions, IntrospectionResponse } from './oauth2';
import { User } from './oauth2Jwt';
import { OpenIDAccessTokenResponse, OpenIdClient } from './openid';
import { parseUserInfo, UserInfoResponse, verifySignature } from './salesforce/identity';

/**
 * The Salesforce Access Token Response.
 *
 * @example
 * ```json
 *
 * {
 * 	"id": "https://login.salesforce.com/id/00Dx0000000BV7z/005x00000012Q9P",
 * 	"issued_at": "1278448101416",
 * 	"refresh_token": "5Aep8614iLM.Dq661ePDmPEgaAW9Oh_L3JKkDpB4xReb54_pZebnUG0h6Sb4KUVDpNtWEofWM39yg==",
 * 	"instance_url": "https://yourInstance.salesforce.com/",
 * 	"signature": "CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe+fVg=",
 * 	"access_token": "00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4",
 * 	"token_type": "Bearer",
 * 	"scope": "id api refresh_token"
 * }
 *
 * ```
 */
export interface SalesforceAccessTokenResponse extends OpenIDAccessTokenResponse, UserInfoResponse {

	/**
	 * A URL indicating the instance of the user’s org. For example: https://yourInstance.salesforce.com/.
	 */
	instance_url?: string;

	/**
	 * If the user is a member of a Salesforce community, the community URL is provided.
	 */
	sfdc_community_url?: string;

	/**
	 * If the user is a member of a Salesforce community, the user’s community ID is provided.
	 */
	sfdc_community_id?: string;

	/**
	 * Base64-encoded HMAC-SHA256 signature signed with the client secret (private key) containing the
	 * concatenated ID and issued_at. Used to verify that the identity URL hasn’t changed since the
	 * server sent it.
	 */
	signature: string;

	/**
	 * When the signature was created.
	 */
	issued_at: string;

}

/**
 * The Salesforce Introspection Response.
 *
 * Adds the user info information to the standard introspection response.
 *
 * @example
 * ```json
 * {
 * 	"active": true,
 * 	"client_id": "OAuthSp",
 * 	"exp": 1528502109,
 * 	"iat": 1528494909,
 * 	"nbf": 1528494909,
 * 	"scope": "id api web full refresh_token openid",
 * 	"sub": "https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001Sv6AAAS",
 * 	"token_type": "access_token",
 * 	"username": "test@test.com"
 * }
 * ```
 */
export interface SalesforceIntrospectionResponse extends IntrospectionResponse, UserInfoResponse {
}

/**
 * The User credentials required to initialise the JWT flow.
 */
export interface SalesforceUser extends User {

	/**
	 * The organization ID.
	 */
	organizationId?: string;

}

/**
 * A Salesforce Client that implements the [Salesforce OAuth 2.0](https://help.salesforce.com/articleView?id=remoteaccess_authenticate_overview.htm) specification.
 */
export class SalesforceClient extends OpenIdClient {

	/**
	 * Creates a new OpenID client with the given environment.
	 *
	 * @param env The OAuth2 environment parameters.
	 */
	constructor(env: Environment) {
		super(env);
		this.clientType = 'Salesforce';
	}

	/**
	 * @inheritdoc
	 * @returns The Salesforce Access Token Response.
	 */
	public async grant(params: GrantParams, opts?: GrantOptions): Promise<SalesforceAccessTokenResponse> {
		return super.grant(params as GrantParams, opts) as Promise<SalesforceAccessTokenResponse>;
	}

	/**
	 * @inheritdoc
	 */
	protected handleAccessTokenResponse(accessTokenResponse: SalesforceAccessTokenResponse, internalOpts: GrantOptions) {

		super.handleAccessTokenResponse(accessTokenResponse, internalOpts);

		try {

			if (internalOpts.verifySignature) {

				if (internalOpts && internalOpts.clientSecret) {
					verifySignature(internalOpts.clientSecret, accessTokenResponse);
				} else {
					throw new Error('Missing required string parameter: clientSecret');
				}

			}

			if (internalOpts.parseUserInfo) {
				parseUserInfo(accessTokenResponse);
			}

		} catch (error) {
			throw new Error(`Failed to obtain grant: ${error.message}.`);
		}

		return accessTokenResponse;

	}

	/**
	 * @inheritdoc
	 */
	protected handleIntrospectionResponse(introspectionResponse: SalesforceIntrospectionResponse, internalOpts: IntrospectionOptions) {

		if (internalOpts.parseUserInfo) {
			parseUserInfo(introspectionResponse);
		}

		return introspectionResponse;
	}

}
