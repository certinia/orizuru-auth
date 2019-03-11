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
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { Environment, OpenIDTokenWithStandardClaims, UserInfoRequester } from '../../../src';
import * as cache from '../../../src/index/client/cache';
import { OAuth2Client } from '../../../src/index/client/oauth2';
import { OpenIdClient } from '../../../src/index/client/openid';
import { SalesforceClient } from '../../../src/index/client/salesforce';
import * as validator from '../../../src/index/client/validator/environment';

import { createUserInfoRequester } from '../../../src/index/userInfo/userinfo';

const expect = chai.expect;

chai.use(sinonChai);

describe('index/userInfo/userinfo', () => {

	let env: Environment;

	beforeEach(() => {

		env = {
			httpTimeout: 4001,
			issuerURI: 'https://login.salesforce.com/',
			type: 'OpenID'
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
				sinon.stub(cache, 'findOrCreateClient').rejects(new Error('Failed to create client.'));

				// When
				// Then
				await expect(requestUserInfo('ABCDE123')).to.be.rejectedWith('Failed to retrieve user information. Caused by: Failed to create client.');

			});

			it('if the client is not a OpenID client', async () => {

				// Given
				sinon.stub(cache, 'findOrCreateClient').resolves(new OAuth2Client(env));

				// When
				// Then
				await expect(requestUserInfo('ABCDE123')).to.be.rejectedWith('Failed to retrieve user information. Caused by: This function must be used with a OpenID client.');

			});

			it('if the userinfo request fails', async () => {

				// Given
				const clientStubInstance = sinon.createStubInstance(OpenIdClient);
				sinon.stub(cache, 'findOrCreateClient').resolves(clientStubInstance);

				clientStubInstance.userinfo.throws(new Error('Bad_OAuth_Token.'));

				// When
				// Then
				await expect(requestUserInfo('ABCDE123')).to.be.rejectedWith('Failed to retrieve user information. Caused by: Bad_OAuth_Token.');

			});

		});

		describe('should return the user info on success', () => {

			it('for an OpenID client', async () => {

				// Given
				const clientStubInstance = sinon.createStubInstance(OpenIdClient);
				sinon.stub(cache, 'findOrCreateClient').resolves(clientStubInstance);

				const partialUserInfo: Partial<OpenIDTokenWithStandardClaims> = {
					preferred_username: 'user1@1135222488950007.com'
				};

				clientStubInstance.userinfo.resolves(partialUserInfo as OpenIDTokenWithStandardClaims);

				// When
				const result = await requestUserInfo('ABCDE123');

				// Then
				expect(result).to.eql({
					preferred_username: 'user1@1135222488950007.com'
				});

			});

			it('for a Salesforce client', async () => {

				// Given
				const clientStubInstance = sinon.createStubInstance(SalesforceClient);
				sinon.stub(cache, 'findOrCreateClient').resolves(clientStubInstance);

				const partialUserInfo: Partial<OpenIDTokenWithStandardClaims> = {
					preferred_username: 'user1@1135222488950007.com'
				};

				clientStubInstance.userinfo.resolves(partialUserInfo as OpenIDTokenWithStandardClaims);

				// When
				const result = await requestUserInfo('ABCDE123');

				// Then
				expect(result).to.eql({
					preferred_username: 'user1@1135222488950007.com'
				});

			});

		});

	});

});
