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

import { Options, SalesforceJwt } from '../../src';
import * as issuer from '../../src/openid/shared/issuer';
import * as jwt from '../../src/openid/shared/jwt';

import { webServer } from '../../src/flow/webServer';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('webServer.ts', () => {

	let env: Options.Auth;

	before(() => {
		env = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'test',
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

		it('should obtain the access token response', async () => {

			// Given
			const expectedAccessTokenResponse = {
				access_token: '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4',
				id: 'https://login.salesforce.com/id/00Dx0000000BV7z/005x00000012Q9P',
				instance_url: 'https://yourInstance.salesforce.com/',
				issued_at: '1278448101416',
				refresh_token: '5Aep8614iLM.Dq661ePDmPEgaAW9Oh_L3JKkDpB4xReb54_pZebnUG0h6Sb4KUVDpNtWEofWM39yg==',
				scope: 'id api refresh_token',
				signature: 'CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe + fVg=',
				token_type: 'Bearer'
			};

			const expectedResponse = {
				data: expectedAccessTokenResponse
			};

			sinon.stub(issuer, 'constructIssuer').resolves({
				authorization_endpoint: 'https://login.salesforce.com/services/oauth2/authorize',
				token_endpoint: 'https://login.salesforce.com/services/oauth2/token'
			});

			sinon.stub(request, 'post')
				.withArgs('https://login.salesforce.com/services/oauth2/token?grant_type=authorization_code&code=c&client_id=test&client_assertion=signed&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&redirect_uri=a&format=json')
				.resolves(expectedResponse);

			sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');

			// When
			const accessTokenResponse = await webServer.requestAccessTokenWithClientAssertion(env, 'a', 'b', 'c');

			// Then
			expect(accessTokenResponse).to.eql(expectedAccessTokenResponse);
			expect(accessTokenResponse.id_token).to.be.undefined;

		});

		it('should decode the id_token', async () => {

			// Given
			const expectedAccessTokenResponse = {
				access_token: '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4',
				id: 'https://login.salesforce.com/id/00D1r000000rk9ZEAQ/0051r000007w0jRAAQ',
				id_token: 'eyJraWQiOiIyMTQiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdF9oYXNoIjoibVcyNDhXd2loTm1FZ2hWNE1NUjF2QSIsInN1YiI6Imh0dHBzOi8vbG9naW4uc2FsZXNmb3JjZS5jb20vaWQvMDBEMXIwMDAwMDByazlaRUFRLzAwNTFyMDAwMDA3dzBqUkFBUSIsImF1ZCI6IjNNVkc5NU5Qc0YyZ3dPaU1nSENOREJPMGE0WjF0OXRiV2lRbGdCa09vUGcuM3ZnRGJ2MlE0bXlOTzU1czhJaUNLV29NVjVaV1RtdzE0d19ZSmlsUHQiLCJpc3MiOiJodHRwczovL2xvZ2luLnNhbGVzZm9yY2UuY29tIiwiZXhwIjoxNTI4ODEyODM3LCJpYXQiOjE1Mjg4MTI3MTd9.YfPECaC6weYtrWB-b3GqejJwiGNJkhHNBF-2ftyoLDXg34hoKQAEo3Cj6pyitrn_e_XdIHnxrqKLUvSGwc49nrex-C74pQ2LccTEKak2tht5UPuDJ4aqczBfYPB3L22wK6EfIOzMroFf0WlxnS2V4p84oBL1QOlreCCOa7HyFaamRS4C_K7Of2HeVOWeBQdSSfRH39Cbh1xYCxJx1hrapugE1N-xEpVTr4SkpC4fJXpnzOEVTiYoRbnRNz0vLBhnIv43CtgVHRJbKj7_xNP6XOBDLppjG0_Px636LmT_1jWU1t6i1hVt7CwF1EIFiLD8atExVTrE0ybKWD97xvBdrg2mLOCt20wpvaYooJfeiyUNJjzphXtx4gotUlV4s-TEtfHDwswV4kjKhDHqjRxkD1RuYYt4cPWqo20N_w5CrGYnj6ce9goASZ2OU0InruCLA3MzvagzpzqbfrXxAVMj1kjjoVMHzI2noSUN-1aqnwwgK6womCAQlzaw-N_kIonhmXyUxEyRL0dSWz27RUcwUYzKis2H_deL-p4U5oYrQB6FpBK0Z9gzxvJ2nCjq39le9tUbEhSKTXdFS2SP3W7ztcXhtUypHgg72IuYYkuAnBESCFFa-I_1r_I80JfSf8PPAILRS3Z3hVi6qyvPP70YV5f7JEkzXoK4CRVMGEdUuuw',
				instance_url: 'https://yourInstance.salesforce.com/',
				issued_at: '1278448101416',
				refresh_token: '5Aep8614iLM.Dq661ePDmPEgaAW9Oh_L3JKkDpB4xReb54_pZebnUG0h6Sb4KUVDpNtWEofWM39yg==',
				scope: 'id api refresh_token',
				signature: 'CMJ4l+CCaPQiKjoOEwEig9H4wqhpuLSk4J2urAe + fVg=',
				token_type: 'Bearer'
			};

			const expectedResponse = {
				data: expectedAccessTokenResponse
			};

			sinon.stub(issuer, 'constructIssuer').resolves({
				authorization_endpoint: 'https://login.salesforce.com/services/oauth2/authorize',
				token_endpoint: 'https://login.salesforce.com/services/oauth2/token'
			});

			sinon.stub(request, 'post')
				.withArgs('https://login.salesforce.com/services/oauth2/token?grant_type=authorization_code&code=c&client_id=test&client_assertion=signed&client_assertion_type=urn:ietf:params:oauth:client-assertion-type:jwt-bearer&redirect_uri=a&format=json')
				.resolves(expectedResponse);

			sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');

			// When
			const accessTokenResponse = await webServer.requestAccessTokenWithClientAssertion(env, 'a', 'b', 'c');

			// Then
			expect(accessTokenResponse).to.eql(expectedAccessTokenResponse);
			expect(accessTokenResponse.id_token).to.contain.keys(['at_hash', 'aud', 'exp', 'iat', 'iss', 'sub']);
			expect((accessTokenResponse.id_token as SalesforceJwt).sub).to.eql(accessTokenResponse.id);

		});

	});

});
