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
 * @module middleware/grantChecker
 */

import { NextFunction, Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { EVENT_GRANT_CHECKED, GrantOptions, JwtGrantParams, JwtTokenGrantorParams } from '../..';
import { createTokenGrantor } from '../flow/jwtBearerToken';

import { fail } from './common/fail';

/**
 * Returns an express middleware that checks that an access token can be retrieved
 * for the user specified on the request.
 *
 * Should be used in tandem with the tokenValidator middleware, and must be
 * executed after that. This requires that a ConnectedApp is configured to pre-
 * authorise users and the user is authorised.
 *
 * @fires EVENT_GRANT_CHECKED, EVENT_DENIED
 * @param app The Orizuru server instance.
 * @param provider The name of the auth provider.
 * @param params The grant checker middleware parameters.
 * @param [opts] The optional parameters used when requesting grants.
 * @returns A express middleware that checks an access token can be retrieved for
 * the user on the request.
 */
export function createMiddleware(app: Orizuru.IServer, provider: string, params: JwtTokenGrantorParams, opts?: GrantOptions): RequestHandler {

	const requestAccessToken = createTokenGrantor(app.options.authProvider[provider]);

	// The GrantCheckerMiddlewareParameters type excludes the grant_type
	// so that it doesn't have to be set by the caller. Make sure it is set here.
	const internalParams: Partial<JwtGrantParams> = Object.assign({}, params);
	internalParams.grantType = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

	return async function checkUserGrant(req: Request, res: Response, next: NextFunction) {

		try {

			const user = checkUserIsOnTheRequest(req);

			await requestAccessToken(Object.assign(internalParams, { user }) as JwtGrantParams, opts);

			setGrant(app, req);

			next();

		} catch (error) {
			fail(app, error, req, res, next);
		}

	};

}

/**
 * Checks that the user is present on the request and is valid.
 *
 * @param req The HTTP request.
 */
function checkUserIsOnTheRequest(req: Request) {

	if (!req.orizuru) {
		throw new Error('Missing required object parameter: orizuru');
	}

	if (!req.orizuru.user) {
		throw new Error('Missing required object parameter: orizuru[user]');
	}

	if (req.orizuru.user.username == null) {
		throw new Error('Missing required string parameter: orizuru[user][username]');
	}

	if (!req.orizuru.user.username.length) {
		throw new Error('Invalid parameter: orizuru[user][username] cannot be empty');
	}

	return req.orizuru.user;

}

/**
 * Sets the grant checked boolean on the Orizuru context.
 *
 * @fires EVENT_GRANT_CHECKED
 * @param app The Orizuru server instance.
 * @param req The HTTP request.
 */
function setGrant(app: Orizuru.IServer, req: Request) {

	const orizuru = req.orizuru!;
	orizuru.grantChecked = true;

	app.emit(EVENT_GRANT_CHECKED, `Grant checked for user (${orizuru.user!.username}) [${req.ip}].`);

}
