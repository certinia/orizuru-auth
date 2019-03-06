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
 * @module middleware/authCallback
 */

import { NextFunction, Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { AccessTokenResponse, EVENT_AUTHORIZATION_HEADER_SET } from '../..';
import { createTokenGrantor } from '../flow/webServer';

import { fail } from './common/fail';

/**
 * Returns an express middleware that [exchanges a verification code for an access token](https://help.salesforce.com/articleView?id=remoteaccess_oauth_web_server_flow.htm#vc_for_at).
 *
 * This can be used in tandem with the tokenValidator to set the user on the request.
 *
 * @fires EVENT_AUTHORIZATION_HEADER_SET
 * @param app The Orizuru server instance.
 * @returns An express middleware that exchanges a verification code for an access
 * token.
 */
export function createMiddleware(app: Orizuru.IServer): RequestHandler {

	const requestAccessToken = createTokenGrantor(app.options.auth.webServer);

	return async function checkUserGrant(req: Request, res: Response, next: NextFunction) {

		try {

			validateRequest(req);

			const token = await requestAccessToken({
				code: req.query.code
			});

			setAuthorizationHeaderAndIdentity(app, req, token);

			next();

		} catch (error) {
			fail(app, error, req, res, next);
		}

	};

}

/**
 * Validates the request contains the verification code.
 *
 * @param req The HTTP request.
 */
function validateRequest(req: Request) {

	if (!req.query) {
		throw new Error('Missing required object parameter: query');
	}

	if (req.query.error) {
		throw new Error(req.query.error);
	}

	if (!req.query.code) {
		throw new Error('Missing required string parameter: query[code]');
	}

}

/**
 * Sets the authorization header with the access_token from the response and emits
 * an authorization header set event.
 *
 * If present, it also sets the user information in the Orizuru context identity property.
 *
 * @fires EVENT_AUTHORIZATION_HEADER_SET
 * @param app The Orizuru server instance.
 * @param req The HTTP request.
 * @param token The access token response.
 */
function setAuthorizationHeaderAndIdentity(app: Orizuru.IServer, req: Request, token: AccessTokenResponse) {

	req.headers.authorization = `Bearer ${token.access_token}`;

	if (token.userInfo) {

		req.orizuru = {
			identity: token.userInfo
		};

	}

	app.emit(EVENT_AUTHORIZATION_HEADER_SET, `Authorization headers set for ${token.userInfo ? token.userInfo.id : 'unknown'} (${req.ip}).`);

}
