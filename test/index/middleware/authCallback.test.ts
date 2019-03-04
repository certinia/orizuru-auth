/**
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
import chaiAsPromised from 'chai-as-promised';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import { EventEmitter } from 'events';

import { Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { Environment, EVENT_AUTHORIZATION_HEADER_SET } from '../../../src';
import * as webServer from '../../../src/index/flow/webServer';
import * as fail from '../../../src/index/middleware/common/fail';

import { createMiddleware } from '../../../src/index/middleware/authCallback';

const expect = chai.expect;
const has = sinon.match.has;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/middleware/authCallback', () => {

	let app: Orizuru.IServer & EventEmitter;
	let env: Environment;
	let requestAccessTokenStub: SinonStub;

	beforeEach(() => {

		env = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'test',
			openidClientSecret: 'test',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'https://login.salesforce.com/'
		};

		const partialApp: Partial<Orizuru.IServer & EventEmitter> = {
			emit: sinon.stub(),
			options: {
				auth: {
					webServer: env
				}
			}
		};

		app = partialApp as Orizuru.IServer & EventEmitter;

		requestAccessTokenStub = sinon.stub();

		sinon.stub(webServer, 'createTokenGrantor').returns(requestAccessTokenStub);
		sinon.stub(fail, 'fail');

	});

	afterEach(() => {

		// Then
		expect(webServer.createTokenGrantor).to.have.been.calledOnce;
		expect(webServer.createTokenGrantor).to.have.been.calledWithExactly(app.options.auth.webServer);

		sinon.restore();

	});

	it('should return a function when called with the app', () => {

		// Given
		// When
		const middleware = createMiddleware(app);

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
				headers: {},
				ip: '1.1.1.1',
				query: {
					code: 'testCode'
				}
			};
			req = partialRequest as Request;

			const partialResponse: Partial<Response> = {};
			res = partialResponse as Response;

			next = sinon.stub();

			middleware = createMiddleware(app);

		});

		describe('should emit a deny event', () => {

			afterEach(() => {

				// Then
				expect(fail.fail).to.have.been.calledOnce;
				expect(next).to.not.have.been.called;

			});

			it('if query is not on the request', async () => {

				// Given
				delete req.query;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, req, res, has('message', 'Missing required object parameter: query'));

			});

			it('if the code is not on the request', async () => {

				// Given
				delete req.query.code;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, req, res, has('message', 'Missing required string parameter: query[code]'));

			});

			it('if the query parameters contain an error', async () => {

				// Given
				req.query.error = 'access-denied';

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, req, res, has('message', 'access-denied'));

			});

			it('if requestAccessToken rejects', async () => {

				// Given
				requestAccessTokenStub.rejects(new Error('Invalid grant for user (test@test.com). Caused by: something or other'));

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, req, res, has('message', 'Invalid grant for user (test@test.com). Caused by: something or other'));

			});

		});

		describe('should call next if the code is exchanged for an access token', () => {

			it('and update the request authorization header', async () => {

				// Given
				requestAccessTokenStub.resolves({
					access_token: '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4',
					id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					instance_url: 'https://yourInstance.salesforce.com/',
					issued_at: '1278448384422',
					scope: 'id api refresh_token',
					signature: 'R9e8hftsV8AqMd5M3ddTXsXNr6NwHoye4VeNY8Tqs44=',
					token_type: 'Bearer',
					userInfo: {
						id: '005xx000001SwiUAAS',
						organizationId: '00Dxx0000001gPLEAY',
						url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS'
					}
				});

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');

				expect(requestAccessTokenStub).to.have.been.calledOnce;
				expect(requestAccessTokenStub).to.have.been.calledWithExactly({
					code: 'testCode'
				});
				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for 005xx000001SwiUAAS (1.1.1.1).');
				expect(next).to.have.been.calledOnce;

			});

			it('and emit an event with the use as unknown if the userinfo has not been parsed', async () => {

				// Given
				requestAccessTokenStub.resolves({
					access_token: '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4',
					id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					instance_url: 'https://yourInstance.salesforce.com/',
					issued_at: '1278448384422',
					scope: 'id api refresh_token',
					signature: 'R9e8hftsV8AqMd5M3ddTXsXNr6NwHoye4VeNY8Tqs44=',
					token_type: 'Bearer'
				});

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');

				expect(requestAccessTokenStub).to.have.been.calledOnce;
				expect(requestAccessTokenStub).to.have.been.calledWithExactly({
					code: 'testCode'
				});
				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for unknown (1.1.1.1).');
				expect(next).to.have.been.calledOnce;

			});

		});

	});

});
