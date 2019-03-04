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

import { AccessTokenResponse, Environment } from '../../../../src';

import { decodeIdToken, parseUserInfo, verifySignature } from '../../../../src/index/openid/client/identity';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/openid/client/identity', () => {

	let accessTokenResponse: AccessTokenResponse;
	let env: Environment;

	beforeEach(() => {

		accessTokenResponse = {
			access_token: '00Dxx0000001gPL!AR8AQJXg5oj8jXSgxJfA0lBog.39AsX.LVpxezPwuX5VAIrrbbHMuol7GQxnMeYMN7cj8EoWr78nt1u44zU31IbYNNJguseu',
			id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
			id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
			instance_url: 'https:// yourInstance.salesforce.com',
			issued_at: '1551531242643',
			scope: 'web openid api id',
			signature: 'HHjDwETDb5VyLcjcB6+c/brBnhAE7zNKu0bgYnVqn9o=',
			token_type: 'Bearer'
		};

		env = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'testOpenidClientId',
			openidClientSecret: 'testOpenidClientSecret',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'https://login.salesforce.com/'
		};

		sinon.stub(Date, 'now').returns(1551521526000);

	});

	afterEach(() => {
		sinon.restore();
	});

	describe('decodeIdToken', () => {

		describe('should throw an error', () => {

			it('if the id_token is not present when validated and openid is present in the scopes', () => {

				// Given
				delete accessTokenResponse.id_token;

				// When
				// Then
				expect(() => decodeIdToken(accessTokenResponse)).to.throw('No id_token present');

			});

			it('if the id_token and scope are not present when validated', () => {

				// Given
				delete accessTokenResponse.id_token;
				delete accessTokenResponse.scope;

				// When
				// Then
				expect(() => decodeIdToken(accessTokenResponse)).to.throw('No id_token present');

			});

		});

		it('should not throw an error if the id_token is not present and openid is not present in the scopes', () => {

			// Given
			delete accessTokenResponse.id_token;

			accessTokenResponse.scope = 'api';

			// When
			decodeIdToken(accessTokenResponse);

			// Then
			expect(accessTokenResponse).to.eql({
				access_token: '00Dxx0000001gPL!AR8AQJXg5oj8jXSgxJfA0lBog.39AsX.LVpxezPwuX5VAIrrbbHMuol7GQxnMeYMN7cj8EoWr78nt1u44zU31IbYNNJguseu',
				id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				instance_url: 'https:// yourInstance.salesforce.com',
				issued_at: '1551531242643',
				scope: 'api',
				signature: 'HHjDwETDb5VyLcjcB6+c/brBnhAE7zNKu0bgYnVqn9o=',
				token_type: 'Bearer'
			});

		});

		it('should decode the JWT from the id_token field', () => {

			// Given
			// When
			decodeIdToken(accessTokenResponse);

			// Then
			expect(accessTokenResponse).to.eql({
				access_token: '00Dxx0000001gPL!AR8AQJXg5oj8jXSgxJfA0lBog.39AsX.LVpxezPwuX5VAIrrbbHMuol7GQxnMeYMN7cj8EoWr78nt1u44zU31IbYNNJguseu',
				id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				id_token: {
					iat: 1516239022,
					name: 'John Doe',
					sub: '1234567890'
				},
				instance_url: 'https:// yourInstance.salesforce.com',
				issued_at: '1551531242643',
				scope: 'web openid api id',
				signature: 'HHjDwETDb5VyLcjcB6+c/brBnhAE7zNKu0bgYnVqn9o=',
				token_type: 'Bearer'
			});

		});

	});

	describe('parseUserInfo', () => {

		describe('should throw an error', () => {

			it('if the id is not present when validated', () => {

				// Given
				delete accessTokenResponse.id;

				// When
				// Then
				expect(() => parseUserInfo(accessTokenResponse)).to.throw('No id present');

			});

			it('if the user ID is not present', () => {

				// Given
				accessTokenResponse.id = 'https://login.salesforce.com/id';

				// When
				// Then
				expect(() => parseUserInfo(accessTokenResponse)).to.throw('User ID not present');

			});

			it('if the organization ID is not present', () => {

				// Given
				accessTokenResponse.id = 'https://login.salesforce.com/id/00Dxx0000001gPLEAY';

				// When
				// Then
				expect(() => parseUserInfo(accessTokenResponse)).to.throw('Organization ID not present');

			});

		});

		it('should parse the user information from the id property', () => {

			// Given
			// When
			parseUserInfo(accessTokenResponse);

			// Then
			expect(accessTokenResponse).to.eql({
				access_token: '00Dxx0000001gPL!AR8AQJXg5oj8jXSgxJfA0lBog.39AsX.LVpxezPwuX5VAIrrbbHMuol7GQxnMeYMN7cj8EoWr78nt1u44zU31IbYNNJguseu',
				id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
				instance_url: 'https:// yourInstance.salesforce.com',
				issued_at: '1551531242643',
				scope: 'web openid api id',
				signature: 'HHjDwETDb5VyLcjcB6+c/brBnhAE7zNKu0bgYnVqn9o=',
				token_type: 'Bearer',
				userInfo: {
					id: '005xx000001SwiUAAS',
					organizationId: '00Dxx0000001gPLEAY',
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS'
				}
			});

		});

	});

	describe('verifySignature', () => {

		describe('should throw an error', () => {

			it('if the signature is not present when validated', () => {

				// Given
				delete accessTokenResponse.signature;

				// When
				// Then
				expect(() => verifySignature(env, accessTokenResponse)).to.throw('No signature present');

			});

			it('if the signature is not the correct length', () => {

				// Given
				accessTokenResponse.signature = 'invalid';

				// When
				expect(() => verifySignature(env, accessTokenResponse)).to.throw('Invalid signature');

			});

			it('if the signature does not match the expected signature', () => {

				// Given
				accessTokenResponse.signature = 'd4A6A67xJuzK4iYucL/EsnC/caaWl0aUfs1a9aSFAMw=';

				// When
				// Then
				expect(() => verifySignature(env, accessTokenResponse)).to.throw('Invalid signature');

			});

		});

		it('should not throw an error if the signature is valid', () => {

			// Given
			// When
			// Then
			expect(() => verifySignature(env, accessTokenResponse)).to.not.throw();

		});

	});

});