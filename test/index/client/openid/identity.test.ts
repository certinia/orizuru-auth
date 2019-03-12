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

import { OpenIDAccessTokenResponse } from '../../../../src';

import { decodeIdToken } from '../../../../src/index/client/openid/identity';

const expect = chai.expect;

chai.use(sinonChai);

describe('index/client/openid/identity', () => {

	let accessTokenResponse: OpenIDAccessTokenResponse;

	beforeEach(() => {

		accessTokenResponse = {
			access_token: '00Dxx0000001gPL!AR8AQJXg5oj8jXSgxJfA0lBog.39AsX.LVpxezPwuX5VAIrrbbHMuol7GQxnMeYMN7cj8EoWr78nt1u44zU31IbYNNJguseu',
			id_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
			scope: 'web openid api id',
			token_type: 'Bearer'
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
				scope: 'api',
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
				id_token: {
					iat: 1516239022,
					name: 'John Doe',
					sub: '1234567890'
				},
				scope: 'web openid api id',
				token_type: 'Bearer'
			});

		});

	});

});
