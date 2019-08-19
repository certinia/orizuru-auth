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

import { Request } from '@financialforcedev/orizuru';

import { extractAccessToken, setAccessTokenOnRequest } from '../../../../src/index/middleware/common/accessToken';

const expect = chai.expect;

describe('index/middleware/common/accessToken', () => {

	let req: Request;

	beforeEach(() => {

		const partialRequest: Partial<Request> = {
			ip: '1.1.1.1'
		};
		req = partialRequest as Request;

	});

	describe('extractAccessToken', () => {

		it('should extract the access token from the request', () => {

			// Given
			req.headers = {
				authorization: 'Bearer 12345'
			};

			// When
			const accessToken = extractAccessToken(req);

			// Then
			expect(accessToken).to.eql(accessToken);

		});

		describe('should fail the request', () => {

			it('if the headers are not provided', () => {

				// Given
				// When
				// Then
				expect(() => extractAccessToken(req)).to.throw('Missing required object parameter: headers.');

			});

			it('if the authorization header is not provided', async () => {

				// Given
				req.headers = {};

				// When
				// Then
				expect(() => extractAccessToken(req)).to.throw('Missing required string parameter: headers[authorization].');

			});

			it('if the header is empty', async () => {

				// Given
				req.headers = {
					authorization: ''
				};

				// When
				// Then
				expect(() => extractAccessToken(req)).to.throw('Missing required string parameter: headers[authorization].');

			});

			it('with no bearer', async () => {

				// Given
				req.headers = {
					authorization: '12345'
				};

				// When
				// Then
				expect(() => extractAccessToken(req)).to.throw('Authorization header with \'Bearer ***...\' required.');

			});

			it('for \'Bearer \'', async () => {

				// Given
				req.headers = {
					authorization: 'Bearer '
				};

				// When
				// Then
				expect(() => extractAccessToken(req)).to.throw('Authorization header with \'Bearer ***...\' required.');

			});

		});

	});

	describe('setAccessTokenOnRequest', () => {

		describe('should do nothing', () => {

			it('if setTokenOnContext is undefined', () => {

				// Given
				// When
				setAccessTokenOnRequest(req, 'token');

				// Then
				expect(req).to.not.have.property('orizuru');

			});

			it('if setTokenOnContext is false', () => {

				// Given
				// When
				setAccessTokenOnRequest(req, 'token', false);

				// Then
				expect(req).to.not.have.property('orizuru');

			});

		});

		describe('should add the token to the context', () => {

			it('if setTokenOnContext is true', () => {

				// Given
				// When
				setAccessTokenOnRequest(req, 'token', true);

				// Then
				expect(req).to.have.property('orizuru');
				expect(req.orizuru).to.have.property('accessToken', 'token');

			});

			it('if setTokenOnContext is true respecting an existing orizuru property', () => {

				// Given
				req.orizuru = {
					grantChecked: true
				};

				// When
				setAccessTokenOnRequest(req, 'token', true);

				// Then
				expect(req).to.have.property('orizuru');
				expect(req.orizuru).to.have.property('accessToken', 'token');
				expect(req.orizuru).to.have.property('grantChecked', true);

			});

		});

	});

});
