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
import * as accessToken from '../../../src/index/middleware/common/accessToken';
import * as fail from '../../../src/index/middleware/common/fail';
import * as userInfo from '../../../src/index/userInfo/userinfo';

import { createMiddleware } from '../../../src/index/middleware/tokenValidator';

const expect = chai.expect;
const has = sinon.match.has;

chai.use(sinonChai);

describe('index/middleware/tokenValidator', () => {

	let app: Orizuru.IServer;
	let env: Environment;
	let requestUserInfoStub: SinonStub;

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

		requestUserInfoStub = sinon.stub();

		sinon.stub(userInfo, 'createUserInfoRequester').returns(requestUserInfoStub);
		sinon.stub(accessToken, 'extractAccessToken').returns('12345');
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
		const middleware = createMiddleware(app);

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

			it('if validateAccessToken rejects', async () => {

				// Given
				req.headers = {
					authorization: 'Bearer 12345'
				};

				requestUserInfoStub.rejects(new Error('Failed to retrieve user information.'));

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Failed to retrieve user information.'), req, res, next);

				expect(requestUserInfoStub).to.have.been.calledOnce;
				expect(requestUserInfoStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});

			});

		});

		describe('should call next if the token is validated', () => {

			beforeEach(() => {

				req.headers = {
					authorization: 'Bearer 12345'
				};

				requestUserInfoStub.resolves({
					preferred_username: 'test@test.com'
				});

			});

			afterEach(() => {

				// Then
				expect(requestUserInfoStub).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, 'Token validated for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

			});

			it('and set orizuru on the request', async () => {

				// Given
				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('user').that.eqls({
					username: 'test@test.com'
				});
				expect(requestUserInfoStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});

				expect(req.orizuru).to.not.have.property('accessToken');

			});

			it('adding the orizuru access token property for a salesforce access token', async () => {

				// Given
				sinon.resetHistory();

				middleware = createMiddleware(app, 'salesforce', {
					responseFormat: ResponseFormat.JSON,
					setTokenOnContext: true
				});

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 12345');
				expect(req).to.have.property('orizuru');
				expect(req.orizuru).to.have.property('accessToken', '12345');
				expect(req.orizuru).to.have.property('user').that.eqls({
					username: 'test@test.com'
				});
				expect(requestUserInfoStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});

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
				expect(requestUserInfoStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});

			});

			it('and set organization id on the request if available', async () => {

				// Given
				requestUserInfoStub.resolves({
					organization_id: 'orgid',
					preferred_username: 'test@test.com'
				});

				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('user').that.eqls({
					organizationId: 'orgid',
					username: 'test@test.com'
				});
				expect(requestUserInfoStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});

				expect(req.orizuru).to.not.have.property('salesforce');

			});

			it('and set the instance url on the request if available', async () => {

				// Given
				requestUserInfoStub.resolves({
					organization_id: 'orgid',
					preferred_username: 'test@test.com',
					urls: {
						enterprise: '',
						rest: 'https://yourInstance.salesforce.com/services/data/v{version}/',
						sobjects: 'https://yourInstance.salesforce.com/services/data/v{version}/sobjects/'
					}
				});

				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('salesforce').that.has.property('instanceUrl', 'https://yourInstance.salesforce.com');
				expect(req.orizuru).to.have.property('user').that.eqls({
					organizationId: 'orgid',
					username: 'test@test.com'
				});
				expect(requestUserInfoStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});

			});

			it('and not set the instance URL if none of the urls match the regex', async () => {

				// Given
				requestUserInfoStub.resolves({
					organization_id: 'orgid',
					preferred_username: 'test@test.com',
					urls: {
						enterprise: 'enterprise',
						rest: 'rest',
						sobjects: 'sobjects'
					}
				});

				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('user').that.eqls({
					organizationId: 'orgid',
					username: 'test@test.com'
				});
				expect(requestUserInfoStub).to.have.been.calledWithExactly('12345', {
					responseFormat: ResponseFormat.JSON
				});

				expect(req.orizuru).to.have.property('salesforce').that.does.not.have.property('instanceUrl');

			});

		});

	});

});
