/*
 * Copyright (c) 2017-2019, FinancialForce.com, inc
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

import chai from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import { Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { Environment, EVENT_GRANT_CHECKED, GrantOptions, OpenIdOptions } from '../../../src';
import * as jwtBearerToken from '../../../src/index/flow/jwtBearerToken';
import * as fail from '../../../src/index/middleware/common/fail';

import { createMiddleware } from '../../../src/index/middleware/grantChecker';

const expect = chai.expect;
const has = sinon.match.has;

chai.use(sinonChai);

describe('index/middleware/grantChecker', () => {

	let app: Orizuru.IServer;
	let env: Environment;
	let requestAccessTokenStub: SinonStub;

	beforeEach(() => {

		env = {
			httpTimeout: 4001,
			issuerURI: 'https://login.salesforce.com/',
			type: 'OpenID'
		};

		const openIdOptions: Partial<OpenIdOptions> = {
			clientId: 'testClientId',
			clientSecret: 'testClientSecret',
			redirectUri: 'https://localhost:8080/api/auth/v1.0/callback',
			signingSecret: 'testSigningSecret'
		};

		const partialApp: Partial<Orizuru.IServer> = {
			emit: sinon.stub(),
			options: {
				authProvider: {
					salesforce: env
				},
				openid: {
					salesforce: openIdOptions as OpenIdOptions
				}
			}
		};

		app = partialApp as Orizuru.IServer;

		requestAccessTokenStub = sinon.stub();

		sinon.stub(jwtBearerToken, 'createTokenGrantor').returns(requestAccessTokenStub);
		sinon.stub(fail, 'fail');

	});

	afterEach(() => {

		// Then
		expect(jwtBearerToken.createTokenGrantor).to.have.been.calledOnce;
		expect(jwtBearerToken.createTokenGrantor).to.have.been.calledWithExactly(app.options.authProvider.salesforce);

		sinon.restore();

	});

	it('should return a function when called with the app', () => {

		// Given
		// When
		const middleware = createMiddleware(app, 'salesforce', app.options.openid.salesforce);

		// Then
		expect(middleware).to.be.a('function');

	});

	describe('checkUserGrant', () => {

		let middleware: RequestHandler;
		let req: Request;
		let res: Response;
		let next: SinonStub;

		beforeEach(() => {

			const partialRequest: Partial<Request> = {
				ip: '1.1.1.1',
				orizuru: {
					user: {
						organizationId: 'testOrganizationId',
						username: 'test@test.com'
					}
				}
			};
			req = partialRequest as Request;

			const partialResponse: Partial<Response> = {};
			res = partialResponse as Response;

			next = sinon.stub();

			const opts: GrantOptions = {
				verifySignature: false
			};

			middleware = createMiddleware(app, 'salesforce', app.options.openid.salesforce, opts);

		});

		describe('should fail the request', () => {

			afterEach(() => {

				// Then
				expect(fail.fail).to.have.been.calledOnce;
				expect(next).to.not.have.been.called;

			});

			it('if orizuru is not on the request', async () => {

				// Given
				delete req.orizuru;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required object parameter: orizuru'), req, res, next);

			});

			it('if the user is not on the request', async () => {

				// Given
				delete req.orizuru!.user;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required object parameter: orizuru[user]'), req, res, next);

			});

			it('if the username is not on the request', async () => {

				// Given
				delete req.orizuru!.user!.username;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required string parameter: orizuru[user][username]'), req, res, next);

			});

			it('if the username is empty on the request', async () => {

				// Given
				req.orizuru!.user!.username = '';

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Invalid parameter: orizuru[user][username] cannot be empty'), req, res, next);

			});

			it('if requestAccessToken rejects', async () => {

				// Given
				requestAccessTokenStub.rejects(new Error('Invalid grant for user (test@test.com). Caused by: something or other'));

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Invalid grant for user (test@test.com). Caused by: something or other'), req, res, next);

			});

		});

		describe('should call next if the grant is validated', () => {

			it('and update orizuru on the request', async () => {

				// Given
				requestAccessTokenStub.resolves();

				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('user').that.eqls({
					organizationId: 'testOrganizationId',
					username: 'test@test.com'
				});

				expect(requestAccessTokenStub).to.have.been.calledOnce;
				expect(requestAccessTokenStub).to.have.been.calledWithExactly({
					clientId: 'testClientId',
					clientSecret: 'testClientSecret',
					grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
					redirectUri: 'https://localhost:8080/api/auth/v1.0/callback',
					signingSecret: 'testSigningSecret',
					user: {
						organizationId: 'testOrganizationId',
						username: 'test@test.com'
					}
				}, { verifySignature: false });
				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_GRANT_CHECKED, 'Grant checked for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

			});

		});

	});

});
