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
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { obtainAuthorizationGrant } from '../../../src/openid/shared/authorizationGrant';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('openid/shared/authorizationGrant.ts', () => {

	afterEach(() => {
		sinon.restore();
	});

	describe('obtainAuthorizationGrant', () => {

		let issuerClient: any;

		beforeEach(() => {
			issuerClient = {
				grant: sinon.stub()
			};
		});

		it('should reject if issuerClient grant rejects', async () => {

			// Given
			issuerClient.grant.rejects(new Error('Some error or other'));

			// When
			await expect(obtainAuthorizationGrant('assertionTest', issuerClient)).to.eventually.be.rejectedWith('Grant request failed: Some error or other');

			// Then
			expect(issuerClient.grant).to.have.been.calledOnce;
			expect(issuerClient.grant).to.have.been.calledWith({
				['grant_type']: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: 'assertionTest'
			});

		});

		it('should reject if issuerClient grant resolves with null', async () => {

			// Given
			issuerClient.grant.resolves(null);

			// When
			await expect(obtainAuthorizationGrant('assertionTest', issuerClient)).to.eventually.be.rejectedWith('Grant request failed: No grant received.');

			// Then
			expect(issuerClient.grant).to.have.been.calledOnce;
			expect(issuerClient.grant).to.have.been.calledWith({
				['grant_type']: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: 'assertionTest'
			});

		});

		it('should resolve if issuerClient grant resolves', async () => {

			// Given
			issuerClient.grant.resolves('test');

			// When
			const grant = await obtainAuthorizationGrant('assertionTest', issuerClient);

			// Then
			expect(grant).to.eql('test');
			expect(issuerClient.grant).to.have.been.calledOnce;
			expect(issuerClient.grant).to.have.been.calledWith({
				['grant_type']: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				assertion: 'assertionTest'
			});

		});

	});

});
