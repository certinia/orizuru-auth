/**
 * Copyright (c) 2017-2018, FinancialForce.com, inc
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

import * as issuer from '../../../src/openid/shared/issuer';

import { Options } from '../../../src';

import * as userinfo from '../../../src/openid/shared/userinfo';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('openid/shared/userinfo.js', () => {

	const env: Options.Auth = {
		jwtSigningKey: 'testJwtSigningKey',
		openidClientId: 'testOpenidClientKey',
		openidHTTPTimeout: 2000,
		openidIssuerURI: 'https://login.salesforce.com'
	};

	afterEach(() => {
		sinon.restore();
	});

	describe('getUserInfo', () => {

		it('should return the user info on success', async () => {

			const issuerClient = {
				userinfo: sinon.stub()
			};

			// Given
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClient);
			issuerClient.userinfo.returns({
				organization_id: '123',
				preferred_username: 'bob'
			});

			// When

			const result: userinfo.UserInformation = await userinfo.getUserInfo(env, 'ABCDE123');

			// Then

			expect(result).to.eql({
				organizationId: '123',
				preferredUsername: 'bob'
			});

		});

		it('should throw an error on failure', async () => {

			// Given

			sinon.stub(issuer, 'constructIssuerClient').rejects(new Error());

			// When - Then

			return expect(userinfo.getUserInfo(env, 'ABCDE123'))
				.to.be.rejectedWith(Error, 'Failed to get the user info.');

		});

	});

});
