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
 * Express middlewares for user identitfication and authorisation.
 * It is aimed at users of the Salesforce Identity Provider and designed
 * to be used with the Orizuru framework.
 */

import { EventEmitter } from 'events';
import { NextFunction, Request, Response } from 'express';
import _ from 'lodash';
import { Client, UserInfo } from 'openid-client';

import { Options, User } from '..';
import { obtainAuthorizationGrant } from './shared/authorizationGrant';
import { validate } from './shared/envValidator';
import { constructIssuerClient } from './shared/issuer';
import { createJwtBearerGrantAssertion } from './shared/jwt';

/**
 * @private
 */
const BEARER_PREFIX: string = 'Bearer ';

/**
 * @private
 */
const DENIED_EVENT = 'denied';

/**
 * @private
 */
const GRANT_CHECKED_EVENT = 'grant_checked';

/**
 * @private
 */
const HTTP_AUTHORIZATION_HEADER: string = 'Authorization';

/**
 * @private
 */
const TOKEN_VALIDATED_EVENT = 'token_validated';

/**
 * @private
 */
function extractAccessToken(req: Request) {

	// https://tools.ietf.org/html/rfc6750
	const authorizationHeader = req ? req.get ? req.get(HTTP_AUTHORIZATION_HEADER) : null : null;
	const accessToken = authorizationHeader ? authorizationHeader.substring(BEARER_PREFIX.length) : null;

	if (_.isNull(accessToken) || _.isEmpty(accessToken)) {
		throw new Error('Authorization header with \'Bearer ***...\' required');
	}

	return accessToken;

}

/**
 * @private
 */
function checkUserIsOnTheRequest(req: Request) {

	const user: User = _.get(req, 'orizuru.user');

	if (!user || !user.username) {
		throw new Error('A valid User is not set on the request');
	}

	return user;

}

/**
 * @private
 */
function validateAccessToken(issuerClient: Client, accessToken: string) {

	return issuerClient.userinfo(accessToken)
		.then((userInfo) => userInfo)
		.catch(() => {
			throw new Error('Failed to authenticate with Authorisation header');
		});

}

/**
 * @private
 */
function setUserOnRequest(req: Request, userInfo: UserInfo) {

	const user = {
		organizationId: userInfo.organization_id,
		username: userInfo.preferred_username
	};

	const orizuru = req.orizuru || {};
	orizuru.user = user;
	req.orizuru = orizuru;

	emitter.emit(TOKEN_VALIDATED_EVENT, `Token validated for: ${req.ip}`);

}

/**
 * @private
 */
function setGrant(req: Request) {

	return () => {

		(req.orizuru as any).grantChecked = true;

		emitter.emit(GRANT_CHECKED_EVENT, `Grant checked for: ${req.ip}`);

		return undefined;

	};

}

/**
 * @private
 */
function fail(req: Request, res: Response) {

	return (error: Error) => {

		emitter.emit(DENIED_EVENT, `Access denied to: ${req ? req.ip ? req.ip : 'unknown' : 'unknown'}, error: ${error.message}.`);

		res.sendStatus(401);

	};

}

export const emitter: EventEmitter = new EventEmitter();

/**
 * Returns an express middleware that checks that an access token
 * can be retrieved for the user specified on the request.
 * Should be used in tandem with the tokenValidator middleware,
 * and must be executed after that. This requires that a ConnectedApp
 * is configured to pre authorise users and the user is
 * authorised.
 */
export function grantChecker(env: Options.Auth) {

	validate(env);

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {

		try {

			const user = checkUserIsOnTheRequest(req);
			const issuerClient = await constructIssuerClient(env);
			const assertion = await createJwtBearerGrantAssertion(env, user);
			await obtainAuthorizationGrant(assertion, issuerClient);
			setGrant(req)();

			next();

		} catch (error) {
			fail(req, res)(error);
		}

	};

}

/**
 * Returns an express middleware that validates the OpenID Connect
 * access token passed in an HTTP Authorization header and if successful
 * sets the user object onto the request object.
 */
export function tokenValidator(env: Options.Auth) {

	validate(env);

	return async (req: Request, res: Response, next: NextFunction): Promise<void> => {

		try {

			const accessToken = extractAccessToken(req);
			const issuerClient = await constructIssuerClient(env);

			const userInfo = await validateAccessToken(issuerClient, accessToken);

			setUserOnRequest(req, userInfo);

			next();

		} catch (error) {
			fail(req, res)(error);
		}

	};

}