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
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { SalesforceAccessTokenResponse } from '../../../../src';

import { parseUserInfo, UserInfoResponse, verifySignature } from '../../../../src/index/client/salesforce/identity';

const expect = chai.expect;

chai.use(sinonChai);

describe('index/client/salesforce/identity', () => {

	beforeEach(() => {
		sinon.stub(Date, 'now').returns(1551521526000);
	});

	afterEach(() => {
		sinon.restore();
	});

	describe('parseUserInfo', () => {

		let userInfoResponse: UserInfoResponse;

		beforeEach(() => {

			userInfoResponse = {
				id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS'
			};

		});

		describe('should throw an error', () => {

			it('if the id is not present when validated', () => {

				// Given
				delete userInfoResponse.id;

				// When
				// Then
				expect(() => parseUserInfo(userInfoResponse)).to.throw('Missing required string parameter: identityUrl');

			});

			it('if the user ID is not present', () => {

				// Given
				userInfoResponse.id = 'https://login.salesforce.com/id';

				// When
				// Then
				expect(() => parseUserInfo(userInfoResponse)).to.throw('Missing required string parameter: id');

			});

			it('if the organization ID is not present', () => {

				// Given
				userInfoResponse.id = 'https://login.salesforce.com/id/00Dxx0000001gPLEAY';

				// When
				// Then
				expect(() => parseUserInfo(userInfoResponse)).to.throw('Missing required string parameter: organizationId');

			});

		});

		it('should parse the user information from the id property', () => {

			// Given
			// When
			parseUserInfo(userInfoResponse);

			// Then
			expect(userInfoResponse).to.eql({
				id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				userInfo: {
					id: '005xx000001SwiUAAS',
					organizationId: '00Dxx0000001gPLEAY',
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					validated: false
				}
			});

		});

		it('should parse the user information from the sub property', () => {

			// Given
			userInfoResponse.sub = userInfoResponse.id;
			delete userInfoResponse.id;

			// When
			parseUserInfo(userInfoResponse);

			// Then
			expect(userInfoResponse).to.eql({
				sub: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				userInfo: {
					id: '005xx000001SwiUAAS',
					organizationId: '00Dxx0000001gPLEAY',
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					validated: false
				}
			});

		});

		it('should respect an existing userinfo property', () => {

			// Given
			userInfoResponse.userInfo = {
				url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				validated: true
			};

			// When
			parseUserInfo(userInfoResponse);

			// Then
			expect(userInfoResponse).to.eql({
				id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				userInfo: {
					id: '005xx000001SwiUAAS',
					organizationId: '00Dxx0000001gPLEAY',
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					validated: true
				}
			});

		});

	});

	describe('verifySignature', () => {

		let accessTokenResponse: SalesforceAccessTokenResponse;

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

		});

		describe('should throw an error', () => {

			it('if the signature is not present when validated', () => {

				// Given
				delete accessTokenResponse.signature;

				// When
				// Then
				expect(() => verifySignature('testOpenidClientSecret', accessTokenResponse)).to.throw('No signature present');

			});

			it('if the signature is not the correct length', () => {

				// Given
				accessTokenResponse.signature = 'invalid';

				// When
				expect(() => verifySignature('testOpenidClientSecret', accessTokenResponse)).to.throw('Invalid signature');

			});

			it('if the signature does not match the expected signature', () => {

				// Given
				accessTokenResponse.signature = 'd4A6A67xJuzK4iYucL/EsnC/caaWl0aUfs1a9aSFAMw=';

				// When
				// Then
				expect(() => verifySignature('testOpenidClientSecret', accessTokenResponse)).to.throw('Invalid signature');

			});

		});

		describe('should not throw an error', () => {

			it('if the signature is valid', () => {

				// Given
				// When
				expect(() => verifySignature('testOpenidClientSecret', accessTokenResponse)).to.not.throw();

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
						url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
						validated: true
					}
				});

			});

		});

	});

});
