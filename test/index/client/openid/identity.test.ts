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

import crypto from 'crypto';

import jwt from 'jsonwebtoken';

import { OpenIDAccessTokenResponse, OpenIDToken } from '../../../../src';

import { decodeIdToken, verifyIdToken } from '../../../../src/index/client/openid/identity';

const expect = chai.expect;

chai.use(sinonChai);

describe('index/client/openid/identity', () => {

	let accessTokenResponse: OpenIDAccessTokenResponse;
	let keyPair: crypto.KeyPairSyncResult<string, string>;

	beforeEach(() => {

		keyPair = crypto.generateKeyPairSync('rsa', {
			modulusLength: 2048,
			privateKeyEncoding: {
				format: 'pem',
				type: 'pkcs8'
			},
			publicKeyEncoding: {
				format: 'pem',
				type: 'spki'
			}
		});

		const idToken = jwt.sign({
			aud: 'audience',
			iat: 1516239022,
			iss: 'issuer',
			name: 'John Doe'
		}, keyPair.privateKey, { algorithm: 'RS256', keyid: '200' });

		accessTokenResponse = {
			access_token: '00Dxx0000001gPL!AR8AQJXg5oj8jXSgxJfA0lBog.39AsX.LVpxezPwuX5VAIrrbbHMuol7GQxnMeYMN7cj8EoWr78nt1u44zU31IbYNNJguseu',
			id_token: idToken,
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

		describe('should not throw an error', () => {

			it('if the id_token is not present and openid is not present in the scopes', () => {

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

			it('if the id_token has already been decoded', () => {

				// Given
				accessTokenResponse.id_token = {
					aud: 'audience',
					iat: 1516239022,
					iss: 'issuer',
					name: 'John Doe'
				} as OpenIDToken;

				accessTokenResponse.scope = 'api';

				// When
				decodeIdToken(accessTokenResponse);

				// Then
				expect(accessTokenResponse).to.eql({
					access_token: '00Dxx0000001gPL!AR8AQJXg5oj8jXSgxJfA0lBog.39AsX.LVpxezPwuX5VAIrrbbHMuol7GQxnMeYMN7cj8EoWr78nt1u44zU31IbYNNJguseu',
					id_token: {
						aud: 'audience',
						iat: 1516239022,
						iss: 'issuer',
						name: 'John Doe'
					},
					scope: 'api',
					token_type: 'Bearer'
				});

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
					aud: 'audience',
					iat: 1516239022,
					iss: 'issuer',
					name: 'John Doe'
				},
				scope: 'web openid api id',
				token_type: 'Bearer'
			});

		});

	});

	describe('verifyIdToken', () => {

		describe('should throw an error', () => {

			it('if the jwkPemFormatMap is not provided', () => {

				// Given
				delete accessTokenResponse.id_token;

				// When
				// Then
				expect(() => verifyIdToken(accessTokenResponse)).to.throw('Unable to verify ID token: No JWKs provided');

			});

			it('if the id_token is not present when validated and openid is present in the scopes', () => {

				// Given
				delete accessTokenResponse.id_token;

				// When
				// Then
				expect(() => verifyIdToken(accessTokenResponse, {})).to.throw('No id_token present');

			});

			it('if the id_token and scope are not present when validated', () => {

				// Given
				delete accessTokenResponse.id_token;
				delete accessTokenResponse.scope;

				// When
				// Then
				expect(() => verifyIdToken(accessTokenResponse, {})).to.throw('No id_token present');

			});

			it('if the id_token is not a string', () => {

				// Given
				Object.assign(accessTokenResponse, {
					id_token: {}
				});

				// When
				// Then
				expect(() => verifyIdToken(accessTokenResponse, {})).to.throw('Unable to verify ID token: id_token is not a string');

			});

			it('if the decodedIdToken is not an object', () => {

				// Given
				sinon.stub(jwt, 'decode').returns('invalid token');

				// When
				// Then
				expect(() => verifyIdToken(accessTokenResponse, {})).to.throw('Unable to verify ID token: decoded token is not an object');

			});

			it('if the decodedIdToken does not contain the header', () => {

				// Given
				sinon.stub(jwt, 'decode').returns({
					payload: {}
				});

				// When
				// Then
				expect(() => verifyIdToken(accessTokenResponse, {})).to.throw('Unable to verify ID token: decoded token does not contain the header');

			});

			it('if the decodedIdToken does not contain the kid in the header', () => {

				// Given
				sinon.stub(jwt, 'decode').returns({
					header: {},
					payload: {}
				});

				// When
				// Then
				expect(() => verifyIdToken(accessTokenResponse, {})).to.throw('Unable to verify ID token: decoded token header does not contain the kid');

			});

		});

		describe('should not throw an error', () => {

			it('if the id_token is not present and openid is not present in the scopes', () => {

				// Given
				delete accessTokenResponse.id_token;

				accessTokenResponse.scope = 'api';

				// When
				verifyIdToken(accessTokenResponse, {});

				// Then
				expect(accessTokenResponse).to.eql({
					access_token: '00Dxx0000001gPL!AR8AQJXg5oj8jXSgxJfA0lBog.39AsX.LVpxezPwuX5VAIrrbbHMuol7GQxnMeYMN7cj8EoWr78nt1u44zU31IbYNNJguseu',
					scope: 'api',
					token_type: 'Bearer'
				});

			});

		});

		it('should verify the JWT from the id_token field', () => {

			// Given
			// When
			// Then
			expect(verifyIdToken(accessTokenResponse, {
				200: keyPair.publicKey
			})).to.not.throw;

		});

	});

});
