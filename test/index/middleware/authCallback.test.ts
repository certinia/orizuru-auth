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

import { Environment, EVENT_AUTHORIZATION_HEADER_SET, OpenIdOptions, OpenIDTokenWithStandardClaims, SalesforceAccessTokenResponse } from '../../../src';
import * as webServer from '../../../src/index/flow/webServer';
import * as fail from '../../../src/index/middleware/common/fail';

import { createMiddleware } from '../../../src/index/middleware/authCallback';

const expect = chai.expect;
const has = sinon.match.has;

chai.use(sinonChai);

describe('index/middleware/authCallback', () => {

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
			scope: 'api openid',
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

		sinon.stub(webServer, 'createTokenGrantor').returns(requestAccessTokenStub);
		sinon.stub(fail, 'fail');

	});

	afterEach(() => {

		// Then
		expect(webServer.createTokenGrantor).to.have.been.calledOnce;
		expect(webServer.createTokenGrantor).to.have.been.calledWithExactly(app.options.authProvider.salesforce);

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

			middleware = createMiddleware(app, 'salesforce', app.options.openid.salesforce, {
				decodeIdToken: true,
				signingSecret: 'testSigningSecret'
			});

		});

		describe('should fail the request', () => {

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
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required object parameter: query'), req, res, next);

			});

			it('if the code is not on the request', async () => {

				// Given
				delete req.query.code;

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'Missing required string parameter: query[code]'), req, res, next);

			});

			it('if the query parameters contain an error', async () => {

				// Given
				req.query.error = 'access-denied';

				// When
				await middleware(req, res, next);

				// Then
				expect(fail.fail).to.have.been.calledWithExactly(app, has('message', 'access-denied'), req, res, next);

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

		describe('should call next if the code is exchanged for an access token and update the authorization header', () => {

			let accessTokenResponse: SalesforceAccessTokenResponse;

			beforeEach(() => {

				const partialIdToken: Partial<OpenIDTokenWithStandardClaims> = {
					email: 'test@test.com'
				};

				accessTokenResponse = {
					access_token: '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4',
					id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					id_token: partialIdToken as OpenIDTokenWithStandardClaims,
					instance_url: 'https://yourInstance.salesforce.com/',
					issued_at: '1278448384422',
					scope: 'id api refresh_token',
					signature: 'R9e8hftsV8AqMd5M3ddTXsXNr6NwHoye4VeNY8Tqs44=',
					token_type: 'Bearer',
					userInfo: {
						id: '005xx000001SwiUAAS',
						organizationId: '00Dxx0000001gPLEAY',
						url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
						validated: true
					}
				};

				requestAccessTokenStub.resolves(accessTokenResponse);

			});

			afterEach(() => {

				// Then
				expect(requestAccessTokenStub).to.have.been.calledOnce;
				expect(requestAccessTokenStub).to.have.been.calledWithExactly({
					clientId: 'testClientId',
					clientSecret: 'testClientSecret',
					code: 'testCode',
					grantType: 'authorization_code',
					redirectUri: 'https://localhost:8080/api/auth/v1.0/callback',
					scope: 'api openid',
					signingSecret: 'testSigningSecret'
				}, { decodeIdToken: true, signingSecret: 'testSigningSecret' });

			});

			it('adding the orizuru userInfo property for a salesforce access token', async () => {

				// Given
				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');
				expect(req).to.have.property('orizuru');
				expect(req.orizuru).to.have.property('salesforce');
				expect(req.orizuru!.salesforce).to.have.property('userInfo').that.eqls({
					id: '005xx000001SwiUAAS',
					organizationId: '00Dxx0000001gPLEAY',
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					validated: true
				});

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

				expect(req.orizuru).to.not.have.property('accessToken');
				expect(req.orizuru).to.not.have.property('grantChecked');

			});

			it('adding the orizuru userInfo property respecting an existing orizuru property', async () => {

				// Given
				req.orizuru = {
					grantChecked: true
				};

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');
				expect(req).to.have.property('orizuru');
				expect(req.orizuru).to.have.property('salesforce');
				expect(req.orizuru!.salesforce).to.have.property('userInfo').that.eqls({
					id: '005xx000001SwiUAAS',
					organizationId: '00Dxx0000001gPLEAY',
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					validated: true
				});
				expect(req.orizuru).to.have.property('grantChecked', true);

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

				expect(req.orizuru).to.not.have.property('accessToken');

			});

			it('adding the orizuru access token property for a salesforce access token', async () => {

				// Given
				sinon.resetHistory();

				middleware = createMiddleware(app, 'salesforce', app.options.openid.salesforce, {
					decodeIdToken: true,
					setTokenOnContext: true,
					signingSecret: 'testSigningSecret'
				});

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');
				expect(req).to.have.property('orizuru');
				expect(req.orizuru).to.have.property('accessToken', '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');
				expect(req.orizuru).to.have.property('salesforce');
				expect(req.orizuru!.salesforce).to.have.property('userInfo').that.eqls({
					id: '005xx000001SwiUAAS',
					organizationId: '00Dxx0000001gPLEAY',
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					validated: true
				});

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

				expect(req.orizuru).to.not.have.property('grantChecked');

			});

			it('adding the orizuru user property for an openid access token', async () => {

				// Given
				delete accessTokenResponse.id;
				delete accessTokenResponse.instance_url;
				delete accessTokenResponse.issued_at;
				delete accessTokenResponse.signature;

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

				expect(req).to.not.have.property('orizuru');

			});

			it('and emit an event with the user id if the id_token has not been decoded but the userinfo is present', async () => {

				// Given
				delete accessTokenResponse.id_token;

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for user (005xx000001SwiUAAS) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

			});

			it('and emit an event with the user as unknown if the id_token has been decoded but the user id is not present', async () => {

				// Given
				delete accessTokenResponse.userInfo!.id;
				delete (accessTokenResponse.id_token as OpenIDTokenWithStandardClaims).email;

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for user (unknown) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

			});

			it('and emit an event with the user as unknown if the id_token has not been decoded', async () => {

				// Given
				delete accessTokenResponse.id_token;
				delete accessTokenResponse.userInfo;

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for user (unknown) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

			});

			it('and not have an orizuru property if the userinfo has not been parsed', async () => {

				// Given
				delete accessTokenResponse.userInfo;

				// When
				await middleware(req, res, next);

				// Then
				expect(req.headers).to.have.property('authorization', 'Bearer 00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4');

				expect(app.emit).to.have.been.calledOnce;
				expect(app.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, 'Authorization headers set for user (test@test.com) [1.1.1.1].');
				expect(next).to.have.been.calledOnce;
				expect(next).to.have.been.calledWithExactly();

				expect(req).to.not.have.property('orizuru');

			});

		});

	});

});
