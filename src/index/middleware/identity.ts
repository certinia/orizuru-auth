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
 * @module middleware/identity
 */

import { AxiosResponse, default as axios } from 'axios';

import { NextFunction, Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { EVENT_USER_IDENTITY_RETRIEVED, SalesforceIdentity } from '../..';

import { fail } from './common/fail';

/**
 * Returns an express middleware that uses the [Identity URL](https://help.salesforce.com/articleView?id=remoteaccess_using_openid.htm)
 * to retrieve information about the current Salesforce user.
 *
 * This can be used in tandem with the **auth callback** middleware to retrieve the user information with the granted access token.
 *
 * @fires EVENT_USER_IDENTITY_RETRIEVED
 * @param app The Orizuru server instance.
 * @returns An express middleware that retrieves the identity information.
 */
export function createMiddleware(app: Orizuru.IServer): RequestHandler {

	const tokenRegex = new RegExp('^Bearer (.+)$');

	return async function retrieveIdentityInformation(req: Request, res: Response, next: NextFunction) {

		try {

			const identityUrl = validateRequest(req, tokenRegex);

			const identityResponse: AxiosResponse<SalesforceIdentity> = await axios.get(identityUrl, {
				headers: {
					Authorization: req.headers.authorization
				}
			});

			setIdentityInformation(app, req, identityResponse.data);

			next();

		} catch (error) {
			fail(app, error, req, res, next);
		}

	};

}

/**
 * Validate the request.
 *
 * @param req The HTTP request.
 * @param tokenRegex The regular expression used for parsing the token.
 * @returns The Identity URL.
 */
function validateRequest(req: Request, tokenRegex: RegExp) {

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

	if (!req.orizuru) {
		throw new Error('Missing required object parameter: orizuru.');
	}

	if (!req.orizuru.salesforce) {
		throw new Error('Missing required object parameter: orizuru[salesforce].');
	}

	const salesforce = req.orizuru.salesforce;
	if (!salesforce.userInfo) {
		throw new Error('Missing required object parameter: orizuru[salesforce][userInfo].');
	}

	const userInfo = salesforce.userInfo;
	if (!userInfo.url) {
		throw new Error('Missing required string parameter: orizuru[salesforce][userInfo][url].');
	}

	if (userInfo.validated === false) {
		throw new Error('The Identity URL must be validated.');
	}

	if (!userInfo.validated) {
		throw new Error('Missing required string parameter: orizuru[salesforce][userInfo][validated].');
	}

	return userInfo.url;

}

/**
 * Sets the identity information in the Orizuru context and emits a user identity
 * retrieved event.
 *
 * @param app The Orizuru server instance.
 * @param req The HTTP request.
 * @param identity The Salesforce Identity.
 */
function setIdentityInformation(app: Orizuru.IServer, req: Request, identity: SalesforceIdentity) {

	req.orizuru!.salesforce!.identity = identity;

	app.emit(EVENT_USER_IDENTITY_RETRIEVED, `Identity information retrieved for user (${identity.username}) [${req.ip}].`);

}
