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

import { Request, RequestHandler, Response } from '@financialforcedev/orizuru';

import { Environment, EVENT_TOKEN_INTROSPECTED, EVENT_TOKEN_VALIDATED, IntrospectionParams, IntrospectionResponse, OpenIdOptions } from '../../../src';
import * as introspect from '../../../src/index/introspection/introspect';
import * as accessToken from '../../../src/index/middleware/common/accessToken';
import * as fail from '../../../src/index/middleware/common/fail';

import { createMiddleware } from '../../../src/index/middleware/tokenIntrospection';

const expect = chai.expect;
const has = sinon.match.has;

chai.use(sinonChai);

describe('index/middleware/tokenIntrospection', () => {

	let app: Orizuru.IServer;
	let env: Environment;
	let params: IntrospectionParams;
	let introspectTokenStub: SinonStub;

	beforeEach(() => {

		env = {
			httpTimeout: 4001,
			issuerURI: 'https://login.salesforce.com/',
			type: 'OpenID'
		};

		params = {
			clientId: 'testClientId',
			clientSecret: 'testClientSecret'
		};

		const partialApp: Partial<Orizuru.IServer> = {
			emit: sinon.stub(),
			options: {
				authProvider: {
					salesforce: env
				},
				openid: {
					salesforce: params as OpenIdOptions
				}
			}
		};

		app = partialApp as Orizuru.IServer;

		introspectTokenStub = sinon.stub();

		sinon.stub(introspect, 'createTokenIntrospector').returns(introspectTokenStub);
		sinon.stub(accessToken, 'extractAccessToken').returns('12345');
		sinon.stub(fail, 'fail');

	});

	afterEach(() => {

		// Then
		expect(introspect.createTokenIntrospector).to.have.been.calledOnce;
		expect(introspect.createTokenIntrospector).to.have.been.calledWithExactly(app.options.authProvider.salesforce);

		sinon.restore();

	});

	it('should return a function when called with the app', () => {

		// Given
		// When
		const middleware = createMiddleware(app);

		// Then
		expect(middleware).to.be.a('function');

	});

	describe('introspectToken', () => {

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

		});

		describe('should fail the request', () => {

			beforeEach(() => {
				middleware = createMiddleware(app, 'salesforce', app.options.openid.salesforce);
			});

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

				introspectTokenStub.rejects(new Error('Failed to retrieve user information.'));

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Failed to retrieve user information.'), req, res, next);

				expect(introspectTokenStub).to.have.been.calledOnce;
				expect(introspectTokenStub).to.have.been.calledWithExactly('12345', {
					clientId: 'testClientId',
					clientSecret: 'testClientSecret'
				}, undefined);

			});

		});

		describe('should call next if the token is introspected', () => {

			let response: IntrospectionResponse;

			beforeEach(() => {

				req.headers = {
					authorization: 'Bearer 12345'
				};

				middleware = createMiddleware(app, 'salesforce', app.options.openid.salesforce);

				response = {
					active: true,
					client_id: 'OAuthSp',
					exp: 1528502109,
					iat: 1528494909,
					nbf: 1528494909,
					scope: 'id api web full refresh_token openid',
					sub: 'https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001Sv6AAAS',
					token_type: 'access_token',
					userInfo: {
						id: '005xx000001Sv6AAAS',
						organizationId: '00Dxx0000001gEREAY',
						url: 'https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001Sv6AAAS',
						validated: false
					},
					username: 'test@test.com'
				};

				introspectTokenStub.resolves(response);

			});

			afterEach(() => {

				// Then
				expect(introspectTokenStub).to.have.been.calledOnce;
				expect(introspectTokenStub).to.have.been.calledWithExactly('12345', {
					clientId: 'testClientId',
					clientSecret: 'testClientSecret'
				}, undefined);
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

			});

			it('and set orizuru on the request with the username', async () => {

				// Given
				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('user').that.eqls({
					organizationId: '00Dxx0000001gEREAY',
					username: 'test@test.com'
				});
				expect(req.orizuru).to.have.property('tokenInformation').that.eqls({
					active: true,
					client_id: 'OAuthSp',
					exp: 1528502109,
					iat: 1528494909,
					nbf: 1528494909,
					scope: 'id api web full refresh_token openid',
					sub: 'https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001Sv6AAAS',
					token_type: 'access_token',
					userInfo: {
						id: '005xx000001Sv6AAAS',
						organizationId: '00Dxx0000001gEREAY',
						url: 'https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001Sv6AAAS',
						validated: false
					},
					username: 'test@test.com'
				});

				expect(app.emit).to.have.been.calledTwice;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_INTROSPECTED, 'Token introspected for user (test@test.com) [1.1.1.1].');
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, 'Token validated for user (test@test.com) [1.1.1.1].');

			});

			it('and set orizuru on the request without the username', async () => {

				// Given
				delete response.sub;
				delete response.userInfo;
				delete response.username;

				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('tokenInformation').that.eqls({
					active: true,
					client_id: 'OAuthSp',
					exp: 1528502109,
					iat: 1528494909,
					nbf: 1528494909,
					scope: 'id api web full refresh_token openid',
					token_type: 'access_token'
				});

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_INTROSPECTED, 'Token introspected for user (unknown) [1.1.1.1].');

				expect(req.orizuru).to.not.have.property('user');

			});

			it('and set orizuru on the request without the userInfo', async () => {

				// Given
				delete response.sub;
				delete response.userInfo;

				// When
				await middleware(req, res, next);

				// Then
				expect(req.orizuru).to.have.property('user').that.eqls({
					username: 'test@test.com'
				});
				expect(req.orizuru).to.have.property('tokenInformation').that.eqls({
					active: true,
					client_id: 'OAuthSp',
					exp: 1528502109,
					iat: 1528494909,
					nbf: 1528494909,
					scope: 'id api web full refresh_token openid',
					token_type: 'access_token',
					username: 'test@test.com'
				});

				expect(app.emit).to.have.been.calledTwice;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_INTROSPECTED, 'Token introspected for user (test@test.com) [1.1.1.1].');
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, 'Token validated for user (test@test.com) [1.1.1.1].');

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
				expect(req.orizuru).to.have.property('user').that.eqls({
					organizationId: '00Dxx0000001gEREAY',
					username: 'test@test.com'
				});
				expect(req.orizuru).to.have.property('tokenInformation').that.eqls({
					active: true,
					client_id: 'OAuthSp',
					exp: 1528502109,
					iat: 1528494909,
					nbf: 1528494909,
					scope: 'id api web full refresh_token openid',
					sub: 'https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001Sv6AAAS',
					token_type: 'access_token',
					userInfo: {
						id: '005xx000001Sv6AAAS',
						organizationId: '00Dxx0000001gEREAY',
						url: 'https://login.salesforce.com/id/00Dxx0000001gEREAY/005xx000001Sv6AAAS',
						validated: false
					},
					username: 'test@test.com'
				});

				expect(app.emit).to.have.been.calledTwice;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_INTROSPECTED, 'Token introspected for user (test@test.com) [1.1.1.1].');
				expect(app.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, 'Token validated for user (test@test.com) [1.1.1.1].');

			});

		});

	});

});
