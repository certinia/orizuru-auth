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

import { validate } from '../../../src/openid/shared/envValidator';

const expect = chai.expect;

chai.use(chaiAsPromised);

describe('shared/envValidator.ts', () => {

	let env: any;

	beforeEach(() => {
		env = {
			jwtSigningKey: 'test',
			openidClientId: 'test',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'test'
		};
	});

	describe('should reject', () => {

		it('if jwtSigningKey is null', () => {

			// given
			env.jwtSigningKey = null;

			// when - then
			expect(() => validate(env)).to.throw('Missing required parameter: jwtSigningKey.');

		});

		it('if jwtSigningKey is empty', () => {

			// given
			env.jwtSigningKey = '';

			// when - then
			expect(() => validate(env)).to.throw('Invalid parameter: jwtSigningKey cannot be empty.');

		});

		it('if openidClientId is null', () => {

			// given
			env.openidClientId = null;

			// when - then
			expect(() => validate(env)).to.throw('Missing required parameter: openidClientId.');

		});

		it('if openidClientId is empty', () => {

			// given
			env.openidClientId = '';

			// when - then
			expect(() => validate(env)).to.throw('Invalid parameter: openidClientId cannot be empty.');

		});

		it('if openidHTTPTimeout is null', () => {

			// given
			env.openidHTTPTimeout = null;

			// when - then
			expect(() => validate(env)).to.throw('Invalid parameter: openidHTTPTimeout is not an integer.');

		});

		it('if openidHTTPTimeout is not an integer', () => {

			// given
			env.openidHTTPTimeout = '';

			// when - then
			expect(() => validate(env)).to.throw('Invalid parameter: openidHTTPTimeout is not an integer.');

		});

		it('if openidIssuerURI is null', () => {

			// given
			env.openidIssuerURI = null;

			// when - then
			expect(() => validate(env)).to.throw('Missing required parameter: openidIssuerURI.');

		});

		it('if openidIssuerURI is empty', () => {

			// given
			env.openidIssuerURI = '';

			// when - then
			expect(() => validate(env)).to.throw('Invalid parameter: openidIssuerURI cannot be empty.');

		});

	});

	it('should resolve with env if env is ok', () => {

		// given - when - then
		expect(validate(env)).to.deep.equal(env);

	});

});
