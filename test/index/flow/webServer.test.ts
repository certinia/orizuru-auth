/**
 * Copyright (c) 2018-2019, FinancialForce.com, inc
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
import sinon, { SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import { AuthCodeAccessTokenGrantor, AuthUrlGenerator, Environment } from '../../../src';
import * as cache from '../../../src/index/openid/cache';
import { OpenIdClient } from '../../../src/index/openid/client';
import * as validator from '../../../src/index/openid/validator/environment';

import { authorizationUrlGenerator, createTokenGrantor } from '../../../src/index/flow/webServer';

const expect = chai.expect;

chai.use(sinonChai);

describe('index/flow/webServer', () => {

	let env: Environment;

	beforeEach(() => {

		env = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'test',
			openidClientSecret: 'test',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'https://login.salesforce.com/',
			redirectUri: 'https://test.app.com/auth/callback'
		};

		sinon.stub(validator, 'validate').returns(env);

	});

	afterEach(() => {
		sinon.restore();
	});

	describe('authorizationUrlGenerator', () => {

		it('should return a function when called with the environment', () => {

			// Given
			// When
			const createAuthorizationUrl = authorizationUrlGenerator(env);

			// Then
			expect(createAuthorizationUrl).to.be.a('function');

			expect(validator.validate).to.have.been.calledOnce;
			expect(validator.validate).to.have.been.calledWithExactly(env);

		});

		describe('generateAuthorizationUrl', () => {

			let generateAuthorizationUrl: AuthUrlGenerator;
			let openIdClientStubInstance: SinonStubbedInstance<OpenIdClient>;

			beforeEach(() => {

				openIdClientStubInstance = sinon.createStubInstance(OpenIdClient);
				sinon.stub(cache, 'findOrCreateOpenIdClient').resolves(openIdClientStubInstance as unknown as OpenIdClient);

				generateAuthorizationUrl = authorizationUrlGenerator(env);

			});

			it('should call the openIdClient createAuthorizationUrl method with the correct parameters', async () => {

				// Given
				openIdClientStubInstance.createAuthorizationUrl.returns('authorizationUrl');

				// When
				const authorizeUrl = await generateAuthorizationUrl('testState', { prompt: 'login' });

				// Then
				expect(authorizeUrl).to.eql('authorizationUrl');

				expect(cache.findOrCreateOpenIdClient).to.have.been.calledOnce;
				expect(cache.findOrCreateOpenIdClient).to.have.been.calledWithExactly(env);
				expect(openIdClientStubInstance.createAuthorizationUrl).to.have.been.calledOnce;
				expect(openIdClientStubInstance.createAuthorizationUrl).to.have.been.calledWithExactly({
					redirect_uri: 'https://test.app.com/auth/callback',
					state: 'testState'
				}, { prompt: 'login' });

			});

		});

	});

	describe('createTokenGrantor', () => {

		it('should return a function when called with the environment', () => {

			// Given
			// When
			const tokenGrantor = createTokenGrantor(env);

			// Then
			expect(tokenGrantor).to.be.a('function');

			expect(validator.validate).to.have.been.calledOnce;
			expect(validator.validate).to.have.been.calledWithExactly(env);

		});

		describe('requestAccessToken', () => {

			let tokenGrantor: AuthCodeAccessTokenGrantor;
			let openIdClientStubInstance: SinonStubbedInstance<OpenIdClient>;

			beforeEach(() => {

				openIdClientStubInstance = sinon.createStubInstance(OpenIdClient);
				sinon.stub(cache, 'findOrCreateOpenIdClient').resolves(openIdClientStubInstance as unknown as OpenIdClient);

				tokenGrantor = createTokenGrantor(env);

			});

			it('should call the openIdClient grant method with the correct parameters', async () => {

				// Given
				const expectedAccessTokenResponse = {
					access_token: '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4',
					id: 'https://login.salesforce.com/id/00D1r000000rk9ZEAQ/0051r000007w0jRAAQ',
					instance_url: 'https://yourInstance.salesforce.com/',
					issued_at: '1278448101416',
					refresh_token: '5Aep8614iLM.Dq661ePDmPEgaAW9Oh_L3JKkDpB4xReb54_pZebnUG0h6Sb4KUVDpNtWEofWM39yg==',
					scope: 'id api refresh_token',
					signature: 'CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe+fVg=',
					token_type: 'Bearer'
				};

				openIdClientStubInstance.grant.resolves(expectedAccessTokenResponse);

				// When
				const accessTokenResponse = await tokenGrantor({ code: 'b' }, { useJwt: false });

				// Then
				expect(accessTokenResponse).to.eql(expectedAccessTokenResponse);

				expect(cache.findOrCreateOpenIdClient).to.have.been.calledOnce;
				expect(cache.findOrCreateOpenIdClient).to.have.been.calledWithExactly(env);
				expect(openIdClientStubInstance.grant).to.have.been.calledOnce;
				expect(openIdClientStubInstance.grant).to.have.been.calledWithExactly({
					code: 'b',
					grantType: 'auth'
				}, { useJwt: false });

			});

		});

	});

});
