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

import * as openIdClient from 'openid-client';

import { Options } from '../../../src';

import * as issuer from '../../../src/openid/shared/issuer';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('openid/shared/issuer.js', () => {

	const env: Options.Auth = {
		jwtSigningKey: 'testJwtSigningKey',
		openidClientId: 'testOpenidClientKey',
		openidHTTPTimeout: 2000,
		openidIssuerURI: 'https://login.salesforce.com'
	};

	afterEach(() => {
		sinon.restore();
		issuer.clearCache();
	});

	describe('constructIssuerClient', () => {

		it('should throw an error if discover rejects', () => {

			// Given
			sinon.stub(openIdClient.Issuer, 'discover').rejects(new Error('error'));

			// When
			return expect(issuer.constructIssuerClient(env))
				.to.be.rejectedWith('Could not get an issuer for timeout: 2000 and URI: https://login.salesforce.com.')
				.then(() => {
					// Then
					expect(openIdClient.Issuer.discover).to.have.been.calledOnce;
					expect(openIdClient.Issuer.discover).to.have.been.calledWith(env.openidIssuerURI);
				});

		});

		it('should discover the issuer', async () => {

			// Given
			const issuerMock: any = sinon.createStubInstance(openIdClient.Issuer);

			issuerMock.Client = sinon.stub();
			sinon.stub(openIdClient.Issuer, 'discover').resolves(issuerMock);

			// When
			const issuerClient = await issuer.constructIssuerClient(env);

			// Then
			expect(issuerClient).to.eql(issuerMock.Client.returnValues[0]);

			expect(openIdClient.Issuer.discover).to.have.been.calledOnce;
			expect(openIdClient.Issuer.discover).to.have.been.calledWith(env.openidIssuerURI);

			expect(issuerMock.Client).to.have.been.calledWithNew;

		});

		it('should return the same issuer for multiple callouts', async () => {

			// Given
			const issuerMock: any = sinon.createStubInstance(openIdClient.Issuer);

			issuerMock.Client = sinon.stub();
			sinon.stub(openIdClient.Issuer, 'discover').resolves(issuerMock);

			await issuer.constructIssuerClient(env);

			// When
			const issuerClient = await issuer.constructIssuerClient(env);

			// Then
			expect(issuerClient).to.eql(issuerMock.Client.returnValues[1]);

			expect(openIdClient.Issuer.discover).to.have.been.calledOnce;
			expect(openIdClient.Issuer.discover).to.have.been.calledWith(env.openidIssuerURI);

			expect(issuerMock.Client).to.have.been.calledWithNew;

		});

	});

});
