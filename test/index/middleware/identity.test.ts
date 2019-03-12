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

import chai from 'chai';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import { default as axios } from 'axios';

import { Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { EVENT_USER_IDENTITY_RETRIEVED } from '../../../src';
import * as fail from '../../../src/index/middleware/common/fail';

import { createMiddleware } from '../../../src/index/middleware/identity';

const expect = chai.expect;
const has = sinon.match.has;

chai.use(sinonChai);

describe('index/middleware/identity', () => {

	let app: Orizuru.IServer;

	beforeEach(() => {

		const partialApp: Partial<Orizuru.IServer> = {
			emit: sinon.stub()
		};

		app = partialApp as Orizuru.IServer;

	});

	afterEach(() => {
		sinon.restore();
	});

	it('should return a function when called with the app', () => {

		// Given
		// When
		const middleware = createMiddleware(app);

		// Then
		expect(middleware).to.be.a('function');

	});

	describe('retrieveIdentityInformation', () => {

		let middleware: RequestHandler;
		let req: Request;
		let res: Response;
		let next: SinonStub;

		beforeEach(() => {

			sinon.stub(fail, 'fail');

			const partialRequest: Partial<Request> = {
				headers: {
					authorization: 'Bearer testToken'
				},
				ip: '1.1.1.1',
				orizuru: {
					salesforce: {
						userInfo: {
							url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
							validated: true
						}
					}
				}
			};
			req = partialRequest as Request;

			const partialResponse: Partial<Response> = {};
			res = partialResponse as Response;

			next = sinon.stub();

			middleware = createMiddleware(app);

		});

		describe('should fail the request', () => {

			afterEach(() => {

				// Then
				expect(fail.fail).to.have.been.calledOnce;
				expect(next).to.not.have.been.called;

			});

			it('if the headers are not provided', async () => {

				// Given
				delete req.headers;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required object parameter: headers.'), req, res, next);

			});

			it('if the authorization header is not provided', async () => {

				// Given
				delete req.headers.authorization;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required string parameter: headers[authorization].'), req, res, next);

			});

			it('if the header is empty', async () => {

				// Given
				req.headers.authorization = '';

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required string parameter: headers[authorization].'), req, res, next);

			});

			it('with no bearer', async () => {

				// Given
				req.headers.authorization = '12345';

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Authorization header with \'Bearer ***...\' required.'), req, res, next);

			});

			it('for \'Bearer \'', async () => {

				// Given
				req.headers.authorization = 'Bearer ';

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Authorization header with \'Bearer ***...\' required.'), req, res, next);

			});

			it('if orizuru is not on the request', async () => {

				// Given
				delete req.orizuru;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required object parameter: orizuru.'), req, res, next);

			});

			it('if the salesforce is not on the request', async () => {

				// Given
				delete req.orizuru!.salesforce;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required object parameter: orizuru[salesforce].'), req, res, next);

			});

			it('if the salesforce user info is not on the request', async () => {

				// Given
				delete req.orizuru!.salesforce!.userInfo;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required object parameter: orizuru[salesforce][userInfo].'), req, res, next);

			});

			it('if the salesforce user info url is not on the request', async () => {

				// Given
				delete req.orizuru!.salesforce!.userInfo!.url;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required string parameter: orizuru[salesforce][userInfo][url].'), req, res, next);

			});

			it('if the salesforce user info validated is not on the request', async () => {

				// Given
				delete req.orizuru!.salesforce!.userInfo!.validated;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required string parameter: orizuru[salesforce][userInfo][validated].'), req, res, next);

			});

			it('if the salesforce user info validated is false', async () => {

				// Given
				req.orizuru!.salesforce!.userInfo!.validated = false;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'The Identity URL must be validated.'), req, res, next);

			});

			it('if api call fails', async () => {

				// Given
				sinon.stub(axios, 'get').rejects(new Error('Failed to retrieve user information.'));

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Failed to retrieve user information.'), req, res, next);

				expect(axios.get).to.have.been.calledOnce;
				expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS', {
					headers: {
						Authorization: 'Bearer testToken'
					}
				});

			});

		});

		describe('should call next if the code is exchanged for an access token', () => {

			it('and update the request authorization header and orizuru identity property', async () => {

				// Given
				sinon.stub(axios, 'get').resolves({
					config: {},
					data: {
						id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
						organization_id: '00Dxx0000001gPLEAY',
						user_id: '005xx000001SwiUAAS',
						username: 'test@test.com'
					},
					headers: {},
					status: 200,
					statusText: 'OK'
				});

				// When
				await middleware(req, res, next);

				// Then
				expect(req).to.have.property('orizuru');
				expect(req.orizuru).to.have.property('salesforce');
				expect(req.orizuru!.salesforce).to.have.property('userInfo').that.eqls({
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					validated: true
				});
				expect(req.orizuru).to.have.property('salesforce').to.have.property('identity').that.eqls({
					id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					organization_id: '00Dxx0000001gPLEAY',
					user_id: '005xx000001SwiUAAS',
					username: 'test@test.com'
				});

				expect(axios.get).to.have.been.calledOnce;
				expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS', {
					headers: {
						Authorization: 'Bearer testToken'
					}
				});

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_USER_IDENTITY_RETRIEVED, 'Identity information retrieved for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

			});

		});

	});

});
