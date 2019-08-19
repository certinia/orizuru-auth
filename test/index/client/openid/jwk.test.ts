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
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

import { retrieveJsonWebKeysInPemFormat } from '../../../../src/index/client/openid/jwk';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/client/openid/jwk', () => {

	let config: AxiosRequestConfig;

	beforeEach(() => {
		config = {
			timeout: 4001,
			validateStatus: () => true
		};
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('retrieveJsonWebKeysInPemFormat', () => {

		it('should throw an error for a bad request', async () => {

			// Given
			const response: AxiosResponse = {
				config: {},
				data: {},
				headers: {},
				request: {},
				status: 400,
				statusText: 'Bad Request'
			};

			sinon.stub(axios, 'get').resolves(response);

			// When
			// Then
			await expect(retrieveJsonWebKeysInPemFormat('https://login.salesforce.com/id/keys', config)).to.be.rejectedWith('Failed to retrieve JWKs');

		});

		it('should convert a JWK to PEM', async () => {

			// Given
			const response: AxiosResponse = {
				config: {},
				data: {
					keys: [{
						alg: 'RS256',
						e: 'AQAB',
						kid: '123',
						kty: 'RSA',
						n: 'n95Pd-vs7woQJ4gyzLoFnr2KlN9hjBUY79WWeYvHWYRQx37gI3xm9yqI8WGszNoLoiKtCN95882f5_eZyDMlopOFaa_OrZIj3lgd7OXd_E8uTuw89fv1v2O5a5rGYm_-rLRMJXb5aiqTeMpbWHJUmMi9a-Jf_vU-3OCJLRYggVmFa2B3XL5BQLt7jKhHExo0kdMn-0v-uRBsyhbc6nSmKPzuWRgDRDEzLY3dmrG3MHu-m09ticeBIX3iOzaTNEP8SZdR6MIZtwxnjDlD3zIqiT93JIs8ArXV_WcNMp1HJJFW_HLcx3P4qmkAwgqbAwWWYI5Wt1o64jynBL-2a0hPKQ',
						use: 'sig'
					}]
				},
				headers: {},
				request: {},
				status: 200,
				statusText: 'OK'
			};

			sinon.stub(axios, 'get').resolves(response);

			// When
			const jwks = await retrieveJsonWebKeysInPemFormat('https://login.salesforce.com/id/keys', config);

			// Then
			expect(jwks).to.have.key('123');
			expect(jwks['123'].replace(/\n/g, '')).to.eql('-----BEGIN PUBLIC KEY-----MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn95Pd+vs7woQJ4gyzLoFnr2KlN9hjBUY79WWeYvHWYRQx37gI3xm9yqI8WGszNoLoiKtCN95882f5/eZyDMlopOFaa/OrZIj3lgd7OXd/E8uTuw89fv1v2O5a5rGYm/+rLRMJXb5aiqTeMpbWHJUmMi9a+Jf/vU+3OCJLRYggVmFa2B3XL5BQLt7jKhHExo0kdMn+0v+uRBsyhbc6nSmKPzuWRgDRDEzLY3dmrG3MHu+m09ticeBIX3iOzaTNEP8SZdR6MIZtwxnjDlD3zIqiT93JIs8ArXV/WcNMp1HJJFW/HLcx3P4qmkAwgqbAwWWYI5Wt1o64jynBL+2a0hPKQIDAQAB-----END PUBLIC KEY-----');

		});

	});

});
