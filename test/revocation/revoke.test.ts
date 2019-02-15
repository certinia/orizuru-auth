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
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import openidClient from 'openid-client';

import { Environment } from '../../src';
import * as issuer from '../../src/openid/shared/issuer';

import { revocation } from '../../src/revocation/revoke';

const expect = chai.expect;

chai.use(sinonChai);

describe('revocation/revoke.ts', () => {

	const env: Environment = {
		jwtSigningKey: 'test',
		openidClientId: 'test',
		openidClientSecret: 'test',
		openidHTTPTimeout: 4001,
		openidIssuerURI: 'https://login.something.com/'
	};

	afterEach(() => {
		sinon.restore();
	});

	describe('revoke', () => {

		it('should return false if the request fails', async () => {

			// Given
			sinon.stub(issuer, 'constructIssuer').resolves({
				revocation_endpoint: 'https://login.salesforce.com/services/oauth2/revoke'
			} as openidClient.Issuer);

			const expectedResponse: Partial<AxiosResponse> = {
				status: 400
			};

			sinon.stub(axios, 'get').resolves(expectedResponse as AxiosResponse);

			// When
			const result = await revocation.revokeAccessToken(env, 'testToken');

			// Then
			expect(result).to.be.false;
			expect(axios.get).to.have.been.calledOnce;
			expect(axios.get).to.have.been.calledWith('https://login.salesforce.com/services/oauth2/revoke?token=testToken', { validateStatus: sinon.match.func });

		});

		it('should return true if the request succeeds', async () => {

			// Given
			sinon.stub(issuer, 'constructIssuer').resolves({
				revocation_endpoint: 'https://login.salesforce.com/services/oauth2/revoke'
			} as openidClient.Issuer);

			const expectedResponse: Partial<AxiosResponse> = {
				status: 200
			};

			sinon.stub(axios, 'get').resolves(expectedResponse as AxiosResponse);

			// When
			const result = await revocation.revokeAccessToken(env, 'testToken');

			// Then
			expect(result).to.be.true;
			expect(axios.get).to.have.been.calledOnce;
			expect(axios.get).to.have.been.calledWith('https://login.salesforce.com/services/oauth2/revoke?token=testToken', { validateStatus: sinon.match.func });

		});

		it('should call the validateStatus function which returns true', async () => {

			// Given
			sinon.stub(issuer, 'constructIssuer').resolves({
				revocation_endpoint: 'https://login.salesforce.com/services/oauth2/revoke'
			} as openidClient.Issuer);

			sinon.stub(axios, 'get').callsFake((uri: string, config?: AxiosRequestConfig) => {
				config && config.validateStatus && config.validateStatus(200);
				return Promise.resolve({ status: 200 } as AxiosResponse);
			});

			// When
			const result = await revocation.revokeAccessToken(env, 'testToken');

			// Then
			expect(result).to.be.true;
			expect(axios.get).to.have.been.calledOnce;
			expect(axios.get).to.have.been.calledWith('https://login.salesforce.com/services/oauth2/revoke?token=testToken', { validateStatus: sinon.match.func });

		});

	});

});
