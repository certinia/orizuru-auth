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

import * as authorizationGrant from '../../src/openid/shared/authorizationGrant';
import * as envValidator from '../../src/openid/shared/envValidator';
import * as issuer from '../../src/openid/shared/issuer';
import * as jwt from '../../src/openid/shared/jwt';

import { Options } from '../../src';

import { grant } from '../../src/openid/grant';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('openid/grant.ts', () => {

	const env: Options.Auth = {
		jwtSigningKey: 'test',
		openidClientId: 'test',
		openidHTTPTimeout: 4001,
		openidIssuerURI: 'https://login.something.com/'
	};

	let baseError: string;
	let usernameRequiredError: string;

	beforeEach(() => {

		baseError = 'Failed to grant token, error:';
		usernameRequiredError = `${baseError} Missing required parameter: username.`;

	});

	afterEach(() => {
		sinon.restore();
	});

	describe('getToken', () => {

		it('should resolve if successful', async () => {

			// Given
			const issuerClientMock = sinon.stub();

			sinon.stub(envValidator, 'validate').resolves();
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
			sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('assertion');
			sinon.stub(authorizationGrant, 'obtainAuthorizationGrant').resolves({ access_token: 'accessToken', instance_url: 'instanceUrl' });

			// When
			const token = await grant.getToken(env)({ username: 'user' });

			// Then
			expect(token).to.eql({
				accessToken: 'accessToken',
				instanceUrl: 'instanceUrl'
			});
			expect(envValidator.validate).to.have.been.calledOnce;
			expect(issuer.constructIssuerClient).to.have.been.calledOnce;
			expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
			expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledWith('assertion', issuerClientMock);

		});

		describe('should reject', () => {

			it('if envValidator rejects', () => {

				// Given
				sinon.stub(envValidator, 'validate').throws(new Error('some error or other'));

				// When
				// Then
				expect(() => grant.getToken(env)).to.throw('some error or other');

			});

			it('if user is null', async () => {

				// Given
				sinon.stub(envValidator, 'validate').resolves();

				// When
				// Then
				await expect(grant.getToken(env)(null as any)).to.eventually.be.rejectedWith('Failed to grant token, error: Invalid parameter: username cannot be empty.');

			});

			it('if username is missing', async () => {

				// Given
				sinon.stub(envValidator, 'validate').resolves();

				// When
				// Then
				await expect(grant.getToken(env)({} as any)).to.eventually.be.rejectedWith(usernameRequiredError);

			});

			it('if username is empty', async () => {

				// Given
				sinon.stub(envValidator, 'validate').resolves();

				// When
				// Then
				await expect(grant.getToken(env)({ username: '' })).to.eventually.be.rejectedWith('Failed to grant token, error: Invalid parameter: username cannot be empty.');

			});

			it('if constructIssuerClient rejects', async () => {

				// Given
				sinon.stub(envValidator, 'validate').resolves();
				sinon.stub(issuer, 'constructIssuerClient').rejects(new Error('something or other.'));

				// When
				await expect(grant.getToken(env)({ username: 'user' })).to.eventually.be.rejectedWith('Failed to grant token, error: something or other.');

				// Then
				expect(issuer.constructIssuerClient).to.have.been.calledOnce;
				expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

			});

			it('if createJwtBearerGrantAssertion rejects', async () => {

				// Given
				sinon.stub(envValidator, 'validate').resolves();
				sinon.stub(issuer, 'constructIssuerClient').resolves();
				sinon.stub(jwt, 'createJwtBearerGrantAssertion').rejects(new Error('something or other.'));

				// When
				await expect(grant.getToken(env)({ username: 'user' })).to.eventually.be.rejectedWith('Failed to grant token, error: something or other.');

				// Then
				expect(issuer.constructIssuerClient).to.have.been.calledOnce;
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWith(env);

			});

			it('if obtainAuthorizationGrant rejects', async () => {

				// Given
				const issuerClientMock = sinon.stub();

				sinon.stub(envValidator, 'validate').resolves();
				sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
				sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('assertion');
				sinon.stub(authorizationGrant, 'obtainAuthorizationGrant').rejects(new Error('something or other.'));

				// When
				await expect(grant.getToken(env)({ username: 'user' })).to.eventually.be.rejectedWith('Failed to grant token, error: something or other.');

				// Then
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
				expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledWith('assertion', issuerClientMock);

			});

		});

	});

});
