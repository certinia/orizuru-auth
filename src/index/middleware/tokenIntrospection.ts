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
 * @module middleware/tokenIntrospection
 */

import { NextFunction, Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { EVENT_TOKEN_VALIDATED } from '../..';
import { IntrospectionOptions, IntrospectionResponse } from '../client/oauth2';
import { createTokenIntrospector } from '../introspection/introspect';
import { extractAccessToken } from './common/accessToken';
import { fail } from './common/fail';

/**
 * Returns an express middleware that validates the OpenID Connect access token
 * passed in an HTTP Authorization header and if successful sets the user object onto
 * the request object.
 *
 * @fires EVENT_TOKEN_INTROSPECTED, EVENT_DENIED
 * @param app The Orizuru server instance.
 * @param provider The name of the auth provider.
 * @param [opts] The parameters used when introspecting tokens.
 * @returns An express middleware that introspects an access token.
 */
export function createMiddleware(app: Orizuru.IServer, provider: string, opts?: IntrospectionOptions): RequestHandler {

	const introspectAccessToken = createTokenIntrospector(app.options.authProvider[provider]);

	return async function introspectToken(req: Request, res: Response, next: NextFunction) {

		try {

			const accessToken = extractAccessToken(req);

			const middlewareOpts = opts || app.options.openid[provider];
			const internalOpts = Object.assign({}, middlewareOpts) as IntrospectionOptions;

			const tokenInformation = await introspectAccessToken(accessToken, internalOpts);

			setTokenInformationOnRequest(app, req, tokenInformation);

			next();

		} catch (error) {
			fail(app, error, req, res, next);
		}

	};

}

/**
 * Sets the token infrormation on the Orizuru context.
 *
 * It also sets the username on the request if the username is contained in the
 * introspection response.
 *
 * @fires EVENT_TOKEN_VALIDATED
 * @param app The Orizuru server instance.
 * @param req The HTTP request.
 * @param tokenInformation The token information to set on the request.
 */
function setTokenInformationOnRequest(app: Orizuru.IServer, req: Request, tokenInformation: IntrospectionResponse) {

	const orizuru = req.orizuru || {};

	if (tokenInformation.username) {

		orizuru.user = {
			username: tokenInformation.username
		};

		app.emit(EVENT_TOKEN_VALIDATED, `Token validated for user (${tokenInformation.username}) [${req.ip}].`);
	}

	orizuru.tokenInformation = tokenInformation;
	req.orizuru = orizuru;

}
