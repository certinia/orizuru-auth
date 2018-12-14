/**
 * Copyright (c) 2018, FinancialForce.com, inc
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
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { default as request } from 'axios';
import crypto from 'crypto';

import { AccessTokenResponse, Environment, SalesforceJwt } from '../../src';
import * as issuer from '../../src/openid/shared/issuer';
import * as jwt from '../../src/openid/shared/jwt';

import { webServer } from '../../src/flow/webServer';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('flow/webServer.ts', () => {

	let env: Environment;

	before(() => {
		env = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'test',
			openidClientSecret: 'test',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'https://login.salesforce.com/'
		};
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('generateAuthorizeUrl', () => {

		it('should create the authorization url', async () => {

			// Given
			sinon.stub(issuer, 'constructIssuer').resolves({
				authorization_endpoint: 'https://login.salesforce.com/services/oauth2/authorize'
			});

			// When
			const authorizeUrl = await webServer.generateAuthorizeUrl(env, 'https://test.app.com/auth/callback', 'testState');

			// Then
			expect(authorizeUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=test&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&state=testState&prompt=login');

		});

	});

	describe('requestAccessTokenWithClientAssertion', () => {

		let expectedAccessTokenResponse: AccessTokenResponse;
		let hmacStub: any;

		beforeEach(() => {

			expectedAccessTokenResponse = {
				access_token: '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4',
				id: 'https://login.salesforce.com/id/00D1r000000rk9ZEAQ/0051r000007w0jRAAQ',
				instance_url: 'https://yourInstance.salesforce.com/',
				issued_at: '1278448101416',
				refresh_token: '5Aep8614iLM.Dq661ePDmPEgaAW9Oh_L3JKkDpB4xReb54_pZebnUG0h6Sb4KUVDpNtWEofWM39yg==',
				scope: 'id api refresh_token',
				signature: 'CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe+fVg=',
				token_type: 'Bearer'
			};

			hmacStub = {
				digest: sinon.stub(),
				update: sinon.stub()
			};

			sinon.stub(crypto, 'createHmac').returns(hmacStub);

			sinon.stub(issuer, 'constructIssuer').resolves({
				authorization_endpoint: 'https://login.salesforce.com/services/oauth2/authorize',
				token_endpoint: 'https://login.salesforce.com/services/oauth2/token'
			});

		});

		it('should throw an error if the signature has an invalid length', async () => {

			hmacStub.digest.returns('invalid');

			const expectedResponse = {
				data: expectedAccessTokenResponse
			};

			sinon.stub(request, 'post')
				.withArgs('https://login.salesforce.com/services/oauth2/token?grant_type=authorization_code&code=c&client_id=test&client_assertion=signed&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&redirect_uri=a&format=json')
				.resolves(expectedResponse);

			sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');

			// When
			// Then
			await expect(webServer.requestAccessTokenWithClientAssertion(env, 'a', 'b', 'c')).to.eventually.eventually.be.rejectedWith('Invalid signature');

			expect(crypto.createHmac).to.have.been.calledOnce;
			expect(hmacStub.update).to.have.been.calledOnce;
			expect(hmacStub.digest).to.have.been.calledOnce;

		});

		it('should throw an error if the signature has a valid length but is invalid', async () => {

			hmacStub.digest.returns('CMJ5l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe+fVg=');

			const expectedResponse = {
				data: expectedAccessTokenResponse
			};

			sinon.stub(request, 'post')
				.withArgs('https://login.salesforce.com/services/oauth2/token?grant_type=authorization_code&code=c&client_id=test&client_assertion=signed&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&redirect_uri=a&format=json')
				.resolves(expectedResponse);

			sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');

			// When
			// Then
			await expect(webServer.requestAccessTokenWithClientAssertion(env, 'a', 'b', 'c')).to.eventually.eventually.be.rejectedWith('Invalid signature');

			expect(crypto.createHmac).to.have.been.calledOnce;
			expect(hmacStub.update).to.have.been.calledOnce;
			expect(hmacStub.digest).to.have.been.calledOnce;

		});

		it('should obtain the access token response and verify the signature', async () => {

			// Given
			hmacStub.digest.returns('CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe+fVg=');

			const expectedResponse = {
				data: expectedAccessTokenResponse
			};

			sinon.stub(request, 'post')
				.withArgs('https://login.salesforce.com/services/oauth2/token?grant_type=authorization_code&code=c&client_id=test&client_assertion=signed&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&redirect_uri=a&format=json')
				.resolves(expectedResponse);

			sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');

			// When
			const accessTokenResponse = await webServer.requestAccessTokenWithClientAssertion(env, 'a', 'b', 'c');

			// Then
			expect(accessTokenResponse).to.eql(expectedAccessTokenResponse);
			expect(accessTokenResponse.id_token).to.be.undefined;

			expect(crypto.createHmac).to.have.been.calledOnce;
			expect(hmacStub.update).to.have.been.calledOnce;
			expect(hmacStub.digest).to.have.been.calledOnce;

		});

		it('should obtain the access token response and not verify the signature if the options are set', async () => {

			// Given
			hmacStub.digest.returns('CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe+fVg=');

			const expectedResponse = {
				data: expectedAccessTokenResponse
			};

			sinon.stub(request, 'post')
				.withArgs('https://login.salesforce.com/services/oauth2/token?grant_type=authorization_code&code=c&client_id=test&client_assertion=signed&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&redirect_uri=a&format=json')
				.resolves(expectedResponse);

			sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');

			// When
			const accessTokenResponse = await webServer.requestAccessTokenWithClientAssertion(env, 'a', 'b', 'c', {
				validateIdentityURL: false
			});

			// Then
			expect(accessTokenResponse).to.eql(expectedAccessTokenResponse);
			expect(accessTokenResponse.id_token).to.be.undefined;

			expect(crypto.createHmac).to.not.have.been.called;
			expect(hmacStub.update).to.not.have.been.called;
			expect(hmacStub.digest).to.not.have.been.called;

		});

		it('should decode the id_token', async () => {

			// Given
			hmacStub.digest.returns('CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe+fVg=');

			expectedAccessTokenResponse.id_token = 'eyJraWQiOiIyMTQiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoibVcyNDhXd2loTm1FZ2hWNE1NUjF2QSIsInN1YiI6Imh0dHBzOi8vbG9naW4uc2FsZXNmb3JjZS5jb20vaWQvMDBEMXIwMDAwMDByazlaRUFRLzAwNTFyMDAwMDA3dzBqUkFBUSIsImF1ZCI6IjNNVkc5NU5Qc0YyZ3dPaU1nSENOREJPMGE0WjF0OXRiV2lRbGdCa09vUGcuM3ZnRGJ2MlE0bXlOTzU1czhJaUNLV29NVjVaV1RtdzE0d19ZSmlsUHQiLCJpc3MiOiJodHRwczovL2xvZ2luLnNhbGVzZm9yY2UuY29tIiwiZXhwIjoxNTI4ODEyODM3LCJpYXQiOjE1Mjg4MTI3MTd9.YfPECaC6weYtrWB-b3GqejJwiGNJkhHNBF-2ftyoLDXg34hoKQAEo3Cj6pyitrn_e_XdIHnxrqKLUvSGwc49nrex-C74pQ2LccTEKak2tht5UPuDJ4aqczBfYPB3L22wK6EfIOzMroFf0WlxnS2V4p84oBL1QOlreCCOa7HyFaamRS4C_K7Of2HeVOWeBQdSSfRH39Cbh1xYCxJx1hrapugE1N-xEpVTr4SkpC4fJXpnzOEVTiYoRbnRNz0vLBhnIv43CtgVHRJbKj7_xNP6XOBDLppjG0_Px636LmT_1jWU1t6i1hVt7CwF1EIFiLD8atExVTrE0ybKWD97xvBdrg2mLOCt20wpvaYooJfeiyUNJjzphXtx4gotUlV4s-TEtfHDwswV4kjKhDHqjRxkD1RuYYt4cPWqo20N_w5CrGYnj6ce9goASZ2OU0InruCLA3MzvagzpzqbfrXxAVMj1kjjoVMHzI2noSUN-1aqnwwgK6womCAQlzaw-N_kIonhmXyUxEyRL0dSWz27RUcwUYzKis2H_deL-p4U5oYrQB6FpBK0Z9gzxvJ2nCjq39le9tUbEhSKTXdFS2SP3W7ztcXhtUypHgg72IuYYkuAnBESCFFa-I_1r_I80JfSf8PPAILRS3Z3hVi6qyvPP70YV5f7JEkzXoK4CRVMGEdUuuw';

			const expectedResponse = {
				data: expectedAccessTokenResponse
			};

			sinon.stub(request, 'post')
				.withArgs('https://login.salesforce.com/services/oauth2/token?grant_type=authorization_code&code=c&client_id=test&client_assertion=signed&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&redirect_uri=a&format=json')
				.resolves(expectedResponse);

			sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');

			// When
			const accessTokenResponse = await webServer.requestAccessTokenWithClientAssertion(env, 'a', 'b', 'c');

			// Then
			expect(accessTokenResponse).to.eql(expectedAccessTokenResponse);
			expect(accessTokenResponse.id_token).to.contain.keys(['at_hash', 'aud', 'exp', 'iat', 'iss', 'sub']);
			expect((accessTokenResponse.id_token as SalesforceJwt).sub).to.eql(accessTokenResponse.id);

			expect(crypto.createHmac).to.have.been.calledOnce;
			expect(hmacStub.update).to.have.been.calledOnce;
			expect(hmacStub.digest).to.have.been.calledOnce;

		});

	});

});
