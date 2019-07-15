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

import { json, Request, Response, Server, urlencoded } from '@financialforcedev/orizuru';

import { flow, middleware } from '../../src';
import { createTokenRevoker } from '../../src/index/revocation/revoke';
import { TestServer } from './common';

export async function createServer(authProvider: string) {

	const server = new TestServer([authProvider]);

	addAuthRoute(server, authProvider);
	addAuthCallbackRoute(server, authProvider);
	addRevokeTokenRoute(server, authProvider);

	return server;

}

function addAuthRoute(server: Server, authProvider: string) {

	const generateAuthorizationUrl = flow.webServer.authorizationUrlGenerator(server.options.authProvider[authProvider]);

	server.addRoute({
		method: 'get',
		middleware: [
			json()
		],
		responseWriter: () => async (err, req, res) => {
			const opts = Object.assign({}, server.options.openid[authProvider], { state: 'test' });
			const url = await generateAuthorizationUrl(server.options.openid[authProvider], opts);
			res.redirect(url);
		},
		schema: {
			fields: [],
			name: 'auth',
			namespace: 'api.v1_0',
			type: 'record'
		},
		synchronous: true
	});

}

function addAuthCallbackRoute(server: Server, authProvider: string) {

	server.addRoute({
		method: 'get',
		middleware: [
			urlencoded({
				extended: true
			}),
			middleware.authCallback(server, authProvider, server.options.openid[authProvider], server.options.openid[authProvider]),
			(error, req, res, next) => {
				if (error) {
					res.sendStatus(401);
					return;
				}
			}
		],
		responseWriter: (app) => async (error, req, res) => {
			res.set('Content-Type', 'application/json');
			res.send(req.headers);
		},
		schema: {
			fields: [],
			name: 'callback',
			namespace: 'api.auth.v1_0',
			type: 'record'
		},
		synchronous: true
	});

}

function addRevokeTokenRoute(server: Server, authProvider: string) {

	const tokenRevoker = createTokenRevoker(server.options.authProvider[authProvider]);

	server.addRoute({
		method: 'get',
		responseWriter: (app) => async (error: Error | undefined, req: Request, res: Response) => {
			let tokenRevoked = false;
			if (req.headers.authorization) {
				const accessToken = req.headers.authorization.replace('Bearer ', '');
				tokenRevoked = await tokenRevoker(accessToken);
			}
			res.json({ tokenRevoked });
		},
		schema: {
			fields: [],
			name: 'revokeToken',
			namespace: 'api.auth.v1_0',
			type: 'record'
		},
		synchronous: true
	});

}
