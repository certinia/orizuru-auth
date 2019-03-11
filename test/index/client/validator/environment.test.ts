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

import { Environment } from '../../../../src';

import { validate } from '../../../../src/index/client/validator/environment';

const expect = chai.expect;

describe('index/client/validator/environment', () => {

	let env: Environment;

	beforeEach(() => {
		env = {
			httpTimeout: 4001,
			issuerURI: 'test',
			type: 'OpenID'
		};
	});

	describe('should reject', () => {

		it('if the environment is undefined', () => {

			// Given
			// When
			// Then
			expect(() => validate(undefined)).to.throw('Missing required object parameter.');

		});

		it('if httpTimeout is undefined', () => {

			// Given
			delete env.httpTimeout;

			// When
			// Then
			expect(() => validate(env)).to.throw('Missing required number parameter: httpTimeout.');

		});

		it('if httpTimeout is not an integer', () => {

			// Given
			env.httpTimeout = 'test' as unknown as number;

			// When
			// Then
			expect(() => validate(env)).to.throw('Invalid parameter: httpTimeout is not a number.');

		});

		it('if issuerURI is undefined', () => {

			// Given
			delete env.issuerURI;

			// When
			// Then
			expect(() => validate(env)).to.throw('Missing required string parameter: issuerURI.');

		});

		it('if issuerURI is empty', () => {

			// Given
			env.issuerURI = '';

			// When
			// Then
			expect(() => validate(env)).to.throw('Invalid parameter: issuerURI cannot be empty.');

		});

		it('if issuerURI is not a string', () => {

			// Given
			Object.assign(env, {
				issuerURI: 2
			});

			// When
			// Then
			expect(() => validate(env)).to.throw('Invalid parameter: issuerURI is not a string.');

		});

		it('if the type is undefined', () => {

			// Given
			delete env.type;

			// When
			// Then
			expect(() => validate(env)).to.throw('Missing required string parameter: type.');

		});

		it('if the type is not a string', () => {

			// Given
			Object.assign(env, {
				type: 2
			});

			// When
			// Then
			expect(() => validate(env)).to.throw('Invalid parameter: type is not a string.');

		});

	});

	describe('should resolve', () => {

		it('if the environment is correct', () => {

			// Given
			// When
			// Then
			expect(validate(env)).to.eql(env);

		});

	});

});
