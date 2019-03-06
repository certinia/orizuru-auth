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
 * @module middleware/common/fail
 */

import { NextFunction, Request, Response } from '@financialforcedev/orizuru';

import { EVENT_DENIED } from '../../..';

/**
 * Helper function for a failed request.
 *
 * Emits a denied event and calls next with the access denied error.
 *
 * @fires EVENT_DENIED
 * @param app The Orizuru server instance.
 * @param error The error that caused the failed request.
 * @param req The HTTP request.
 * @param res The HTTP response.
 * @param next Callback argument to the middleware function.
 */
export function fail(app: Orizuru.IServer, error: Error, req: Request, res: Response, next: NextFunction) {

	const message = `Access denied to: ${req.ip ? req.ip : 'unknown'}. Error: ${error.message}`;
	const accessDeniedError = new Error(message);

	app.emit(EVENT_DENIED, message);

	// Rather than returning a 401 directly, we need to call next with the error.
	// This should then find the appropriate error handler.
	next(accessDeniedError);

}
