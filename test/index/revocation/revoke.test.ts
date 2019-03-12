/*
 * Copyright (c) 2018-2019, FinancialForce.com, inc
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

import { Environment } from '../../../src';
import * as cache from '../../../src/index/client/cache';
import { OpenIdClient } from '../../../src/index/client/openid';
import * as validator from '../../../src/index/client/validator/environment';

import { createTokenRevoker } from '../../../src/index/revocation/revoke';

const expect = chai.expect;

chai.use(sinonChai);

describe('index/revocation/revoke', () => {

	let env: Environment;

	before(() => {

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
		const revokeToken = createTokenRevoker(env);

		// Then
		expect(revokeToken).to.be.a('function');

		expect(validator.validate).to.have.been.calledOnce;
		expect(validator.validate).to.have.been.calledWithExactly(env);

	});

	describe('revoke', () => {

		let revokeToken: (token: string) => Promise<boolean>;

		beforeEach(() => {
			revokeToken = createTokenRevoker(env);
		});

		it('should call the revoke function from the OpenID client', async () => {

			// Given
			const openIdClientStubInstance = sinon.createStubInstance(OpenIdClient);
			sinon.stub(cache, 'findOrCreateClient').resolves(openIdClientStubInstance);

			openIdClientStubInstance.revoke.resolves(true);

			// When
			const result = await revokeToken('testToken');

			// Then
			expect(result).to.be.true;
			expect(openIdClientStubInstance.revoke).to.have.been.calledOnce;
			expect(openIdClientStubInstance.revoke).to.have.been.calledWith('testToken');

		});

	});

});
