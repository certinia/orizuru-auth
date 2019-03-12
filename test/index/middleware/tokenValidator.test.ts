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

import { Environment, EVENT_TOKEN_VALIDATED, OpenIdOptions, ResponseFormat, UserInfoOptions } from '../../../src';
import * as fail from '../../../src/index/middleware/common/fail';
import * as userInfo from '../../../src/index/userInfo/userinfo';

import { createMiddleware } from '../../../src/index/middleware/tokenValidator';

const expect = chai.expect;
const has = sinon.match.has;

chai.use(sinonChai);

describe('index/middleware/tokenValidator', () => {

	let app: Orizuru.IServer;
	let env: Environment;
	let validateAccessTokenStub: SinonStub;

	beforeEach(() => {

		env = {
			httpTimeout: 4001,
			issuerURI: 'https://login.salesforce.com/',
			type: 'OpenID'
		};

		const openIdOptions: Partial<OpenIdOptions> = {
			clientId: 'testClientId',
			clientSecret: 'testClientSecret',
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

		validateAccessTokenStub = sinon.stub();

		sinon.stub(userInfo, 'createUserInfoRequester').returns(validateAccessTokenStub);
		sinon.stub(fail, 'fail');

	});

	afterEach(() => {

		// Then
		expect(userInfo.createUserInfoRequester).to.have.been.calledOnce;
		expect(userInfo.createUserInfoRequester).to.have.been.calledWithExactly(app.options.authProvider.salesforce);

		sinon.restore();

	});

	it('should return a function when called with the app', () => {

		// Given
		// When
		const middleware = createMiddleware(app, 'salesforce');

		// Then
		expect(middleware).to.be.a('function');

	});

	describe('validateToken', () => {

		let middleware: RequestHandler;
		let req: Request;
		let res: Response;
		let next: SinonStub;

		beforeEach(() => {

			const partialRequest: Partial<Request> = {
				ip: '1.1.1.1'
			};
			req = partialRequest as Request;

			const partialResponse: Partial<Response> = {};
			res = partialResponse as Response;

			next = sinon.stub();

			const opts: UserInfoOptions = {
				responseFormat: ResponseFormat.JSON
			};

			middleware = createMiddleware(app, 'salesforce', opts);

		});

		describe('should fail the request', () => {

			afterEach(() => {

				// Then
				expect(fail.fail).to.have.been.calledOnce;
				expect(next).to.not.have.been.called;

			});

			it('if the headers are not provided', async () => {

				// Given
				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required object parameter: headers.'), req, res, next);

			});

			it('if the authorization header is not provided', async () => {

				// Given
				req.headers = {};

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required string parameter: headers[authorization].'), req, res, next);

			});

			it('if the header is empty', async () => {

				// Given
				req.headers = {
					authorization: ''
				};

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required string parameter: headers[authorization].'), req, res, next);

			});

			it('with no bearer', async () => {

				// Given
				req.headers = {
					authorization: '12345'
				};

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Authorization header with \'Bearer ***...\' required.'), req, res, next);

			});

			it('for \'Bearer \'', async () => {

				// Given
				req.headers = {
					authorization: 'Bearer '
				};

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Authorization header with \'Bearer ***...\' required.'), req, res, next);

			});

			it('if validateAccessToken rejects', async () => {

				// Given
				req.headers = {
					authorization: 'Bearer 12345'
				};

				validateAccessTokenStub.rejects(new Error('Failed to retrieve user information.'));

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Failed to retrieve user information.'), req, res, next);

				expect(validateAccessTokenStub).to.have.been.calledOnce;
				expect(validateAccessTokenStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});

			});

		});

		describe('should call next if the token is validated', () => {

			beforeEach(() => {

				req.headers = {
					authorization: 'Bearer 12345'
				};

				validateAccessTokenStub.resolves({
					preferred_username: 'test@test.com'
				});

			});

			afterEach(() => {

				// Then
				expect(req.orizuru).to.have.property('user').that.eqls({
					username: 'test@test.com'
				});

				expect(validateAccessTokenStub).to.have.been.calledOnce;
				expect(validateAccessTokenStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});
				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, 'Token validated for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

			});

			it('and set orizuru on the request', async () => {

				// Given
				// When
				// Then
				await middleware(req, res, next);

			});

			it('and respect an existing orizuru object', async () => {

				// Given
				req.orizuru = {
					grantChecked: true
				};

				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('grantChecked', true);

			});

		});

	});

});
