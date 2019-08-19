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
 * @module middleware/common/accessToken
 */

import { Request } from '@financialforcedev/orizuru';

const tokenRegex = new RegExp('^Bearer (.+)$');

export interface MiddlewareOptions {

	/**
	 * Set the token on orizuru context.
	 *
	 * WARNING: This option should be used with care;
	 * make sure that the token is as secure as possible.
	 */
	setTokenOnContext?: boolean;

}

export const DEFAULT_MIDDLEWARE_OPTIONS: MiddlewareOptions = Object.freeze({
	setTokenOnContext: false
});

/**
 * Extracts the access token from the incoming request.
 *
 * @param req The HTTP request.
 * @param tokenRegex The regular expression used for parsing the token.
 * @returns The access token from the request authorization header.
 */
export function extractAccessToken(req: Request) {

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
 * Sets the access token on the Orizuru context.
 *
 * @param req The HTTP request.
 * @param accessToken The access token.
 * @param setTokenOnContext If true, add the token to the Orizuru context.
 */
export function setAccessTokenOnRequest(req: Request, accessToken: string, setTokenOnContext?: boolean) {

	if (!setTokenOnContext) {
		return;
	}

	const orizuru = req.orizuru || {};
	orizuru.accessToken = accessToken;
	req.orizuru = orizuru;

}
