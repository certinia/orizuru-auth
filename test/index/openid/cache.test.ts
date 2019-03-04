/**
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
import sinon, { SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import crypto, { Hash } from 'crypto';

import { Environment } from '../../../src';
import * as client from '../../../src/index/openid/client';

import * as cache from '../../../src/index/openid/cache';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/openid/cache', () => {

	let productionEnv: Environment;
	let sandboxEnvironment: Environment;
	let createHashStub: SinonStub;
	let digestStub: SinonStub;
	let updateStub: SinonStub;
	let openIdClientStubInstance: SinonStubbedInstance<client.OpenIdClient>;

	beforeEach(() => {

		productionEnv = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'testOpenidClientId',
			openidClientSecret: 'testOpenidClientSecret',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'https://login.salesforce.com'
		};

		sandboxEnvironment = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'testOpenidClientId',
			openidClientSecret: 'testOpenidClientSecret',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'https://test.salesforce.com'
		};

		digestStub = sinon.stub();
		updateStub = sinon.stub();

		const partialHash: Partial<Hash> = {
			digest: digestStub,
			update: updateStub
		};

		updateStub.returns(partialHash);

		createHashStub = sinon.stub(crypto, 'createHash').returns(partialHash as Hash);

		openIdClientStubInstance = sinon.createStubInstance(client.OpenIdClient);
		sinon.stub(client, 'OpenIdClient').returns(openIdClientStubInstance);

	});

	afterEach(() => {
		sinon.restore();
		cache.clear();
	});

	describe('findOrCreateOpenIdClient', () => {

		it('should create a new client if it is not in the cache', async () => {

			// Given
			digestStub.returns('key');

			// When
			await cache.findOrCreateOpenIdClient(productionEnv);

			// Then
			expect(createHashStub).to.have.been.calledOnce;
			expect(createHashStub).to.have.been.calledWithExactly('sha1');
			expect(updateStub).to.have.been.calledOnce;
			expect(updateStub).to.have.been.calledWithExactly('https://login.salesforce.com|testOpenidClientId|4001');
			expect(digestStub).to.have.been.calledOnce;
			expect(digestStub).to.have.been.calledWithExactly('hex');
			expect(client.OpenIdClient).to.have.been.calledOnce;
			expect(client.OpenIdClient).to.have.been.calledWithNew;
			expect(openIdClientStubInstance.init).to.have.been.calledOnce;
			expect(openIdClientStubInstance.init).to.have.been.calledWithExactly();

		});

		it('use the same client for subsequent calls', async () => {

			// Given
			digestStub.returns('key');

			// When
			await cache.findOrCreateOpenIdClient(productionEnv);
			await cache.findOrCreateOpenIdClient(productionEnv);

			// Then
			expect(createHashStub).to.have.been.calledTwice;
			expect(createHashStub).to.have.been.calledWithExactly('sha1');
			expect(updateStub).to.have.been.calledTwice;
			expect(updateStub).to.have.been.calledWithExactly('https://login.salesforce.com|testOpenidClientId|4001');
			expect(digestStub).to.have.been.calledTwice;
			expect(digestStub).to.have.been.calledWithExactly('hex');
			expect(client.OpenIdClient).to.have.been.calledOnce;
			expect(client.OpenIdClient).to.have.been.calledWithNew;
			expect(openIdClientStubInstance.init).to.have.been.calledOnce;
			expect(openIdClientStubInstance.init).to.have.been.calledWithExactly();

		});

		it('use different clients for different environments', async () => {

			// Given
			digestStub
				.onFirstCall().returns('key')
				.onSecondCall().returns('key2');

			// When
			await cache.findOrCreateOpenIdClient(productionEnv);
			await cache.findOrCreateOpenIdClient(sandboxEnvironment);

			// Then
			expect(createHashStub).to.have.been.calledTwice;
			expect(createHashStub).to.have.been.calledWithExactly('sha1');
			expect(updateStub).to.have.been.calledTwice;
			expect(updateStub).to.have.been.calledWithExactly('https://login.salesforce.com|testOpenidClientId|4001');
			expect(updateStub).to.have.been.calledWithExactly('https://test.salesforce.com|testOpenidClientId|4001');
			expect(digestStub).to.have.been.calledTwice;
			expect(digestStub).to.have.been.calledWithExactly('hex');
			expect(client.OpenIdClient).to.have.been.calledTwice;
			expect(client.OpenIdClient).to.have.been.calledWithNew;
			expect(openIdClientStubInstance.init).to.have.been.calledTwice;
			expect(openIdClientStubInstance.init).to.have.been.calledWithExactly();

		});

	});

});
