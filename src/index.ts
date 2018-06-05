/**
 * Copyright (c) 2017-2018, FinancialForce.com, inc
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
 * Orizuru Auth module.
 */

import * as grant from './openid/grant';
import * as middleware from './openid/middleware';
import * as webFlow from './openid/webFlow';

export {
	grant,
	middleware,
	webFlow
};

declare global {

	namespace Express {

		interface Request {
			orizuru?: {
				grantChecked?: boolean,
				user?: {
					organizationId: string;
					username: string;
				}
			};
		}

	}
}

export declare namespace Options {

	/**
	 * The OpenID environment parameters.
	 */
	export interface Auth {
		jwtSigningKey: string;
		openidClientId: string;
		openidHTTPTimeout: number;
		openidIssuerURI: string;
	}

}

/**
 * The access token response.
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
 * ```
 */
export interface AccessTokenResponse {

	/**
	 * Salesforce session ID that can be used with the web services API.
	 */
	access_token: string;

	/**
	 * Value is Bearer for all responses that include an access token.
	 */
	token_type: string;

	/**
	 * Salesforce value conforming to the OpenID Connect specifications.
	 * This parameter is returned only if the scope parameter includes openid.
	 */
	id_token?: any;

	/**
	 * Token that can be used in the future to obtain new access tokens (sessions).
	 * This value is a secret. Treat it like the user’s password, and use appropriate measures to protect it.
	 * This parameter is returned only if your connected app is set up with a scope of at least refresh_token.
	 */
	refresh_token: string;

	/**
	 * A URL indicating the instance of the user’s org. For example: https://yourInstance.salesforce.com/.
	 */
	instance_url: string;

	/**
	 * Identity URL that can be used to both identify the user and query for more information about the user.See Identity URLs.
	 */
	id: string;

	/**
	 * If the user is a member of a Salesforce community, the community URL is provided.
	 */
	sfdc_community_url?: string;

	/**
	 * If the user is a member of a Salesforce community, the user’s community ID is provided.
	 */
	sfdc_community_id?: string;

	/**
	 * Base64-encoded HMAC-SHA256 signature signed with the client_secret (private key) containing the
	 * concatenated ID and issued_at. Used to verify that the identity URL hasn’t changed since the
	 * server sent it.
	 */
	signature: string;

	/**
	 * When the signature was created.
	 */
	issued_at: string;

}

export interface User {
	username: string;
}

export interface Grant {
	accessToken: string;
	instanceUrl: string;
}
