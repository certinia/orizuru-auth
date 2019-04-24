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

import { EVENT_TOKEN_VALIDATED, OpenIDTokenWithStandardClaims, User, UserInfoOptions } from '../..';
import { createUserInfoRequester } from '../userInfo/userinfo';

import { SalesforceUser } from '../client/salesforce';
import { fail } from './common/fail';

/**
 * Returns an express middleware that validates the OpenID Connect access token
 * passed in an HTTP Authorization header and if successful sets the user object onto
 * the request object.
 *
 * @fires EVENT_TOKEN_VALIDATED, EVENT_DENIED
 * @param app The Orizuru server instance.
 * @param provider The name of the auth provider.
 * @param [opts] The optional parameters used when requesting user information.
 * @returns An express middleware that validates an access token.
 */
export function createMiddleware(app: Orizuru.IServer, provider: string, opts?: UserInfoOptions): RequestHandler {

	const validateAccessToken = createUserInfoRequester(app.options.authProvider[provider]);
	const tokenRegex = new RegExp('^Bearer (.+)$');

	return async function validateToken(req: Request, res: Response, next: NextFunction) {

		try {

			const accessToken = extractAccessToken(req, tokenRegex);
			const userInfo = await validateAccessToken(accessToken, opts) as OpenIDTokenWithStandardClaims;

			let user: User | SalesforceUser;

			if (userInfo.organization_id) {
				user = {
					organizationId: userInfo.organization_id,
					username: userInfo.preferred_username
				};
			} else {
				user = {
					username: userInfo.preferred_username
				};
			}

			setUserOnRequest(app, req, user);

			next();

		} catch (error) {
			fail(app, error, req, res, next);
		}

	};

}

/**
 * Extracts the access token from the incoming request.
 *
 * @param req The HTTP request.
 * @param tokenRegex The regular expression used for parsing the token.
 * @returns The access token from the request authorization header.
 */
function extractAccessToken(req: Request, tokenRegex: RegExp) {

	if (!req.headers) {
		throw new Error('Missing required object parameter: headers.');
	}

	if (!req.headers.authorization) {
		throw new Error('Missing required string parameter: headers[authorization].');
	}

	const matches = tokenRegex.exec(req.headers.authorization);
	if (matches === null) {
		throw new Error('Authorization header with \'Bearer ***...\' required.');
	}

	return matches[1];

}

/**
 * Sets the user on the Orizuru context.
 *
 * @fires EVENT_TOKEN_VALIDATED
 * @param app The Orizuru server instance.
 * @param req The HTTP request.
 * @param user The user to set on the request.
 */
function setUserOnRequest(app: Orizuru.IServer, req: Request, user: User) {

	const orizuru = req.orizuru || {};
	orizuru.user = user;
	req.orizuru = orizuru;

	app.emit(EVENT_TOKEN_VALIDATED, `Token validated for user (${user.username}) [${req.ip}].`);

}
