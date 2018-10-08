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

import { refreshToken } from './flow/refreshToken';
import { webServer } from './flow/webServer';

import { revocation } from './revocation/revoke';

import { grant } from './openid/grant';
import { middleware } from './openid/middleware';

export { AccessTokenResponse } from './flow/response/accessToken';
export { SalesforceJwt } from './flow/response/salesforceJwt';
export { SalesforceJwtStandardClaims } from './flow/response/salesforceJwtStandardClaims';

export { getUserInfo, UserInformation } from './openid/shared/userinfo';

const flow = {
	refreshToken,
	webServer
};

export {
	flow,
	grant,
	middleware,
	revocation
};

declare global {

	namespace Express {

		interface Request {
			orizuru?: Orizuru.Context;
		}

	}

	namespace Orizuru {

		interface Context {
			grantChecked?: boolean;
			user?: {
				organizationId: string;
				username: string;
			};
		}

		namespace Options {

			interface IServer {
				auth: Environment;
			}

		}

	}
}

/**
 * The OpenID environment parameters.
 */
export interface Environment {
	jwtSigningKey: string;
	openidClientId: string;
	openidHTTPTimeout: number;
	openidIssuerURI: string;
}

export interface User {
	username: string;
}

export interface Grant {
	accessToken: string;
	instanceUrl: string;
}
