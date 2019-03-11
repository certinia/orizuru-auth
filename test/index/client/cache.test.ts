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
import sinon, { SinonStub, SinonStubbedInstance } from 'sinon';
import sinonChai from 'sinon-chai';

import crypto, { Hash } from 'crypto';
import { TransformOptions } from 'stream';

import { Environment } from '../../../src';
import * as oauth2Client from '../../../src/index/client/oauth2';
import * as oauth2JwtClient from '../../../src/index/client/oauth2Jwt';
import * as openIdClient from '../../../src/index/client/openid';
import * as salesforceClient from '../../../src/index/client/salesforce';

import * as cache from '../../../src/index/client/cache';

const expect = chai.expect;

chai.use(sinonChai);

describe('index/client/cache', () => {

	let productionEnv: Environment;
	let sandboxEnvironment: Environment;
	let createHashStub: SinonStub<[string, (TransformOptions | undefined)?], crypto.Hash>;
	let digestStub: SinonStub;
	let updateStub: SinonStub;
	let oauth2ClientStubInstance: SinonStubbedInstance<oauth2Client.OAuth2Client>;
	let oauth2JwtClientStubInstance: SinonStubbedInstance<oauth2JwtClient.OAuth2JWTClient>;
	let openIdClientStubInstance: SinonStubbedInstance<openIdClient.OpenIdClient>;
	let salesforceClientStubInstance: SinonStubbedInstance<salesforceClient.SalesforceClient>;

	beforeEach(() => {

		productionEnv = {
			httpTimeout: 4001,
			issuerURI: 'https://login.salesforce.com',
			type: 'OpenID'
		};

		sandboxEnvironment = {
			httpTimeout: 4001,
			issuerURI: 'https://test.salesforce.com',
			type: 'OpenID'
		};

		digestStub = sinon.stub();
		updateStub = sinon.stub();

		const partialHash: Partial<Hash> = {
			digest: digestStub,
			update: updateStub
		};

		updateStub.returns(partialHash);

		createHashStub = sinon.stub(crypto, 'createHash').returns(partialHash as Hash);

		oauth2ClientStubInstance = sinon.createStubInstance(oauth2Client.OAuth2Client);
		sinon.stub(oauth2Client, 'OAuth2Client').returns(oauth2ClientStubInstance);

		oauth2JwtClientStubInstance = sinon.createStubInstance(oauth2JwtClient.OAuth2JWTClient);
		sinon.stub(oauth2JwtClient, 'OAuth2JWTClient').returns(oauth2JwtClientStubInstance);

		openIdClientStubInstance = sinon.createStubInstance(openIdClient.OpenIdClient);
		sinon.stub(openIdClient, 'OpenIdClient').returns(openIdClientStubInstance);

		salesforceClientStubInstance = sinon.createStubInstance(salesforceClient.SalesforceClient);
		sinon.stub(salesforceClient, 'SalesforceClient').returns(salesforceClientStubInstance);

	});

	afterEach(() => {
		sinon.restore();
		cache.clear();
	});

	describe('findOrCreateClient', () => {

		describe('should create the correct clients', () => {

			it('OAuth2Client', async () => {

				// Given
				const env: Environment = {
					httpTimeout: 4001,
					issuerURI: 'https://login.salesforce.com',
					type: 'OAuth2'
				};

				// When
				await cache.findOrCreateClient(env);

				/// Then
				expect(oauth2Client.OAuth2Client).to.have.been.calledOnce;
				expect(oauth2Client.OAuth2Client).to.have.been.calledWithNew;
				expect(oauth2ClientStubInstance.init).to.have.been.calledOnce;
				expect(oauth2ClientStubInstance.init).to.have.been.calledWithExactly();

				expect(oauth2JwtClient.OAuth2JWTClient).to.not.have.been.called;
				expect(oauth2JwtClientStubInstance.init).to.not.have.been.called;
				expect(salesforceClient.SalesforceClient).to.not.have.been.called;
				expect(salesforceClientStubInstance.init).to.not.have.been.called;
				expect(oauth2JwtClient.OAuth2JWTClient).to.not.have.been.called;
				expect(oauth2JwtClientStubInstance.init).to.not.have.been.called;

			});

			it('OAuth2JWTClient', async () => {

				// Given
				const env: Environment = {
					httpTimeout: 4001,
					issuerURI: 'https://login.salesforce.com',
					type: 'OAuth2JWT'
				};

				// When
				await cache.findOrCreateClient(env);

				/// Then
				expect(oauth2JwtClient.OAuth2JWTClient).to.have.been.calledOnce;
				expect(oauth2JwtClient.OAuth2JWTClient).to.have.been.calledWithNew;
				expect(oauth2JwtClientStubInstance.init).to.have.been.calledOnce;
				expect(oauth2JwtClientStubInstance.init).to.have.been.calledWithExactly();

				expect(oauth2Client.OAuth2Client).to.not.have.been.called;
				expect(oauth2ClientStubInstance.init).to.not.have.been.called;
				expect(openIdClient.OpenIdClient).to.not.have.been.called;
				expect(openIdClientStubInstance.init).to.not.have.been.called;
				expect(salesforceClient.SalesforceClient).to.not.have.been.called;
				expect(salesforceClientStubInstance.init).to.not.have.been.called;
			});

			it('OpenIdClient', async () => {

				// Given
				const env: Environment = {
					httpTimeout: 4001,
					issuerURI: 'https://login.salesforce.com',
					type: 'OpenID'
				};

				// When
				await cache.findOrCreateClient(env);

				/// Then
				expect(openIdClient.OpenIdClient).to.have.been.calledOnce;
				expect(openIdClient.OpenIdClient).to.have.been.calledWithNew;
				expect(openIdClientStubInstance.init).to.have.been.calledOnce;
				expect(openIdClientStubInstance.init).to.have.been.calledWithExactly();

				expect(oauth2Client.OAuth2Client).to.not.have.been.called;
				expect(oauth2ClientStubInstance.init).to.not.have.been.called;
				expect(oauth2JwtClient.OAuth2JWTClient).to.not.have.been.called;
				expect(oauth2JwtClientStubInstance.init).to.not.have.been.called;
				expect(salesforceClient.SalesforceClient).to.not.have.been.called;
				expect(salesforceClientStubInstance.init).to.not.have.been.called;

			});

			it('Salesforce', async () => {

				// Given
				const env: Environment = {
					httpTimeout: 4001,
					issuerURI: 'https://login.salesforce.com',
					type: 'Salesforce'
				};

				// When
				await cache.findOrCreateClient(env);

				/// Then
				expect(salesforceClient.SalesforceClient).to.have.been.calledOnce;
				expect(salesforceClient.SalesforceClient).to.have.been.calledWithNew;
				expect(salesforceClientStubInstance.init).to.have.been.calledOnce;
				expect(salesforceClientStubInstance.init).to.have.been.calledWithExactly();

				expect(oauth2Client.OAuth2Client).to.not.have.been.called;
				expect(oauth2ClientStubInstance.init).to.not.have.been.called;
				expect(oauth2JwtClient.OAuth2JWTClient).to.not.have.been.called;
				expect(oauth2JwtClientStubInstance.init).to.not.have.been.called;
				expect(openIdClient.OpenIdClient).to.not.have.been.called;
				expect(openIdClientStubInstance.init).to.not.have.been.called;

			});

		});

		it('should create a new client if it is not in the cache', async () => {

			// Given
			digestStub.returns('key');

			// When
			await cache.findOrCreateClient(productionEnv);

			// Then
			expect(createHashStub).to.have.been.calledOnce;
			expect(createHashStub).to.have.been.calledWithExactly('sha1');
			expect(updateStub).to.have.been.calledOnce;
			expect(updateStub).to.have.been.calledWithExactly('OpenID|https://login.salesforce.com|4001');
			expect(digestStub).to.have.been.calledOnce;
			expect(digestStub).to.have.been.calledWithExactly('hex');
			expect(openIdClient.OpenIdClient).to.have.been.calledOnce;
			expect(openIdClient.OpenIdClient).to.have.been.calledWithNew;
			expect(openIdClientStubInstance.init).to.have.been.calledOnce;
			expect(openIdClientStubInstance.init).to.have.been.calledWithExactly();

			expect(oauth2Client.OAuth2Client).to.not.have.been.called;
			expect(oauth2ClientStubInstance.init).to.not.have.been.called;
			expect(salesforceClient.SalesforceClient).to.not.have.been.called;
			expect(salesforceClientStubInstance.init).to.not.have.been.called;
			expect(oauth2JwtClient.OAuth2JWTClient).to.not.have.been.called;
			expect(oauth2JwtClientStubInstance.init).to.not.have.been.called;

		});

		it('use the same client for subsequent calls', async () => {

			// Given
			digestStub.returns('key');

			// When
			await cache.findOrCreateClient(productionEnv);
			await cache.findOrCreateClient(productionEnv);

			// Then
			expect(createHashStub).to.have.been.calledTwice;
			expect(createHashStub).to.have.been.calledWithExactly('sha1');
			expect(updateStub).to.have.been.calledTwice;
			expect(updateStub).to.have.been.calledWithExactly('OpenID|https://login.salesforce.com|4001');
			expect(digestStub).to.have.been.calledTwice;
			expect(digestStub).to.have.been.calledWithExactly('hex');
			expect(openIdClient.OpenIdClient).to.have.been.calledOnce;
			expect(openIdClient.OpenIdClient).to.have.been.calledWithNew;
			expect(openIdClientStubInstance.init).to.have.been.calledOnce;
			expect(openIdClientStubInstance.init).to.have.been.calledWithExactly();

			expect(oauth2Client.OAuth2Client).to.not.have.been.called;
			expect(oauth2ClientStubInstance.init).to.not.have.been.called;
			expect(salesforceClient.SalesforceClient).to.not.have.been.called;
			expect(salesforceClientStubInstance.init).to.not.have.been.called;
			expect(oauth2JwtClient.OAuth2JWTClient).to.not.have.been.called;
			expect(oauth2JwtClientStubInstance.init).to.not.have.been.called;

		});

		it('use different clients for different environments', async () => {

			// Given
			digestStub
				.onFirstCall().returns('key')
				.onSecondCall().returns('key2');

			// When
			await cache.findOrCreateClient(productionEnv);
			await cache.findOrCreateClient(sandboxEnvironment);

			// Then
			expect(createHashStub).to.have.been.calledTwice;
			expect(createHashStub).to.have.been.calledWithExactly('sha1');
			expect(updateStub).to.have.been.calledTwice;
			expect(updateStub).to.have.been.calledWithExactly('OpenID|https://login.salesforce.com|4001');
			expect(updateStub).to.have.been.calledWithExactly('OpenID|https://test.salesforce.com|4001');
			expect(digestStub).to.have.been.calledTwice;
			expect(digestStub).to.have.been.calledWithExactly('hex');
			expect(openIdClient.OpenIdClient).to.have.been.calledTwice;
			expect(openIdClient.OpenIdClient).to.have.been.calledWithNew;
			expect(openIdClientStubInstance.init).to.have.been.calledTwice;
			expect(openIdClientStubInstance.init).to.have.been.calledWithExactly();

			expect(oauth2Client.OAuth2Client).to.not.have.been.called;
			expect(oauth2ClientStubInstance.init).to.not.have.been.called;
			expect(salesforceClient.SalesforceClient).to.not.have.been.called;
			expect(salesforceClientStubInstance.init).to.not.have.been.called;
			expect(oauth2JwtClient.OAuth2JWTClient).to.not.have.been.called;
			expect(oauth2JwtClientStubInstance.init).to.not.have.been.called;

		});

	});

});
