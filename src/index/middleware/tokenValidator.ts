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
 * @module index/middleware/tokenValidator
 */

import { EventEmitter } from 'events';

import { NextFunction, Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { EVENT_TOKEN_VALIDATED, OpenIDTokenWithStandardClaims, User } from '../..';
import { createUserInfoRequester } from '../userInfo/userinfo';

import { fail } from './common/fail';

/**
 * Returns an express middleware that validates the OpenID Connect access token
 * passed in an HTTP Authorization header and if successful sets the user object onto
 * the request object.
 *
 * @fires EVENT_TOKEN_VALIDATED, EVENT_DENIED
 */
export function createMiddleware(app: Orizuru.IServer & EventEmitter): RequestHandler {

	const validateAccessToken = createUserInfoRequester(app.options.auth.jwtBearer);

	return async function validateToken(req: Request, res: Response, next: NextFunction) {

		try {

			const accessToken = extractAccessToken(req);
			const userInfo = await validateAccessToken(accessToken) as OpenIDTokenWithStandardClaims;

			const user = {
				organizationId: userInfo.organization_id,
				username: userInfo.preferred_username
			};

			setUserOnRequest(app, req, user);

			next();

		} catch (error) {
			fail(app, req, res, error);
		}

	};

}

function extractAccessToken(req: Request) {

	const authorizationHeader = req.headers && req.headers.authorization;
	if (!authorizationHeader || !authorizationHeader.length || !authorizationHeader.startsWith('Bearer ')) {
		throw new Error('Authorization header with \'Bearer ***...\' required');
	}

	const accessToken = authorizationHeader.replace('Bearer ', '');
	if (!accessToken.length) {
		throw new Error('Authorization header with \'Bearer ***...\' required');
	}

	return accessToken;

}

function setUserOnRequest(app: Orizuru.IServer & EventEmitter, req: Request, user: User) {

	const orizuru = req.orizuru || {} as Orizuru.Context;
	orizuru.user = user;
	req.orizuru = orizuru;

	app.emit(EVENT_TOKEN_VALIDATED, `Token validated for ${user.username} (${req.ip}).`);

}
