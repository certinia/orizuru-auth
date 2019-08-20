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
 * @module middleware/tokenValidator
 */

import { NextFunction, Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { EVENT_TOKEN_VALIDATED, OpenIDTokenWithStandardClaims, UserInfoOptions } from '../..';
import { SalesforceUser } from '../client/salesforce';
import { createUserInfoRequester } from '../userInfo/userinfo';
import { DEFAULT_MIDDLEWARE_OPTIONS, extractAccessToken, MiddlewareOptions, setAccessTokenOnRequest } from './common/accessToken';
import { fail } from './common/fail';

const instanceUrlRegex = new RegExp('(https:\/\/[^\/]*)');

/**
 * Returns an express middleware that validates the OpenID Connect access token
 * passed in an HTTP Authorization header and if successful sets the user object onto
 * the request object.
 *
 * @fires EVENT_TOKEN_VALIDATED, EVENT_DENIED
 * @param app The Orizuru server instance.
 * @param [provider] The name of the auth provider. Defaults to 'salesforce'.
 * @param [opts] The optional parameters used when requesting user information.
 * @returns An express middleware that validates an access token.
 */
export function createMiddleware(app: Orizuru.IServer, provider?: string, opts?: MiddlewareOptions & UserInfoOptions): RequestHandler {

	const internalProvider = provider || 'salesforce';
	const { setTokenOnContext, ...userInfoOptions } = opts || DEFAULT_MIDDLEWARE_OPTIONS;

	const requestUserInfo = createUserInfoRequester(app.options.authProvider[internalProvider]);

	return async function validateToken(req: Request, res: Response, next: NextFunction) {

		try {

			const accessToken = extractAccessToken(req);
			const userInfo = await requestUserInfo(accessToken, userInfoOptions);
			setUserOnRequest(app, req, userInfo);
			setAccessTokenOnRequest(req, accessToken, setTokenOnContext);
			setInstanceUrlOnRequest(req, userInfo);

			next();

		} catch (error) {
			fail(app, error, req, res, next);
		}

	};

}

/**
 * Sets the user on the Orizuru context.
 *
 * @fires EVENT_TOKEN_VALIDATED
 * @param app The Orizuru server instance.
 * @param req The HTTP request.
 * @param userInfo The user information.
 */
function setUserOnRequest(app: Orizuru.IServer, req: Request, userInfo: OpenIDTokenWithStandardClaims) {

	const user: SalesforceUser = {
		username: userInfo.preferred_username
	};

	if (userInfo.organization_id && typeof userInfo.organization_id === 'string') {
		user.organizationId = userInfo.organization_id;
	}

	const orizuru = req.orizuru || {};
	orizuru.user = user;
	req.orizuru = orizuru;

	app.emit(EVENT_TOKEN_VALIDATED, `Token validated for user (${user.username}) [${req.ip}].`);

}

/**
 * Sets the Salesforce instance URL on the Orizuru context.
 *
 * @param req The HTTP request.
 * @param userInfo The user information.
 */
function setInstanceUrlOnRequest(req: Request, userInfo: OpenIDTokenWithStandardClaims) {

	if (!userInfo.urls) {
		return;
	}

	const orizuru = req.orizuru!;
	orizuru.salesforce = orizuru.salesforce || {};

	const urls = Object.values(userInfo.urls);
	while (urls.length) {

		const url = urls.shift();

		const regexResults = instanceUrlRegex.exec(url);
		if (regexResults) {
			orizuru.salesforce.instanceUrl = regexResults[0];
			break;
		}

	}

	req.orizuru = orizuru;

}
