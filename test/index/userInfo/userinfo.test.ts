/**
 * Copyright (c) 2017-2019, FinancialForce.com, inc
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

import { Environment, OpenIDTokenWithStandardClaims, UserInfoRequester } from '../../../src';
import * as cache from '../../../src/index/openid/cache';
import { OpenIdClient } from '../../../src/index/openid/client';
import * as validator from '../../../src/index/openid/validator/environment';

import { createUserInfoRequester } from '../../../src/index/userInfo/userinfo';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('openid/shared/userinfo', () => {

	let env: Environment;

	before(() => {

		env = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'test',
			openidClientSecret: 'test',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'https://login.salesforce.com/'
		};

		sinon.stub(validator, 'validate').returns(env);

	});

	afterEach(() => {
		sinon.restore();
	});

	it('should return a function when called with the environment', () => {

		// Given
		// When
		const userInfoRequester = createUserInfoRequester(env);

		// Then
		expect(userInfoRequester).to.be.a('function');

		expect(validator.validate).to.have.been.calledOnce;
		expect(validator.validate).to.have.been.calledWithExactly(env);

	});

	describe('requestUserInfo', () => {

		let requestUserInfo: UserInfoRequester;

		beforeEach(() => {
			requestUserInfo = createUserInfoRequester(env);
		});

		describe('should throw an error', () => {

			it('if the client cannot be created', async () => {

				// Given
				sinon.stub(cache, 'findOrCreateOpenIdClient').rejects(new Error('Failed to create client.'));

				// When
				// Then
				await expect(requestUserInfo('ABCDE123')).to.be.rejectedWith('Failed to retrieve user information. Caused by: Failed to create client.');

			});

			it('if the userinfo request fails', async () => {

				// Given
				const openIdClientStubInstance = sinon.createStubInstance(OpenIdClient);
				sinon.stub(cache, 'findOrCreateOpenIdClient').resolves(openIdClientStubInstance as unknown as OpenIdClient);

				openIdClientStubInstance.userinfo.throws(new Error('Bad_OAuth_Token.'));

				// When
				// Then
				await expect(requestUserInfo('ABCDE123')).to.be.rejectedWith('Failed to retrieve user information. Caused by: Bad_OAuth_Token.');

			});

		});

		it('should return the user info on success', async () => {

			// Given
			const openIdClientStubInstance = sinon.createStubInstance(OpenIdClient);
			sinon.stub(cache, 'findOrCreateOpenIdClient').resolves(openIdClientStubInstance as unknown as OpenIdClient);

			const partialUserInfo: Partial<OpenIDTokenWithStandardClaims> = {
				organization_id: '123',
				preferred_username: 'user1@1135222488950007.com'
			};

			openIdClientStubInstance.userinfo.resolves(partialUserInfo as OpenIDTokenWithStandardClaims);

			// When
			const result = await requestUserInfo('ABCDE123');

			// Then
			expect(result).to.eql({
				organization_id: '123',
				preferred_username: 'user1@1135222488950007.com'
			});

		});

	});

});
