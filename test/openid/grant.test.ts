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
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import { getToken } from '../../src/openid/grant';

import * as envValidator from '../../src/openid/shared/envValidator';
import * as sharedFunctions from '../../src/openid/shared/functions';
import * as issuer from '../../src/openid/shared/issuer';

const env = {
	openidHTTPTimeout: 4001,
	openidIssuerURI: 'https://login.something.com/'
};

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('grant.ts', () => {

	let baseError: string;
	let usernameRequiredError: string;

	beforeEach(() => {

		baseError = 'Failed to grant token, error:';
		usernameRequiredError = `${baseError} Missing required parameter: username.`;

		sinon.stub(envValidator, 'validate');
		sinon.stub(issuer, 'constructIssuer');
		sinon.stub(sharedFunctions, 'constructSignedJwt');
		sinon.stub(sharedFunctions, 'obtainAuthorizationGrant');

	});

	afterEach(() => {
		sinon.restore();
	});

	describe('getToken', () => {

		describe('should reject', () => {

			it('if envValidator rejects', () => {

				// given
				(envValidator.validate as SinonStub).throws(new Error('some error or other'));

				// when - then
				expect(() => getToken(env as any)).to.throw('some error or other');

			});

			it('if user is null', () => {

				// given
				(envValidator.validate as SinonStub).resolves();

				// when - then
				return expect(getToken(env as any)(null as any)).to.eventually.be.rejectedWith('Failed to grant token, error: Invalid parameter: username cannot be empty.');

			});

			it('if username is missing', () => {

				// given
				(envValidator.validate as SinonStub).resolves();

				// when - then
				return expect(getToken(env as any)({} as any)).to.eventually.be.rejectedWith(usernameRequiredError);

			});

			it('if username is empty', () => {

				// given
				(envValidator.validate as SinonStub).resolves();

				// when - then
				return expect(getToken(env as any)({ username: '' })).to.eventually.be.rejectedWith('Failed to grant token, error: Invalid parameter: username cannot be empty.');

			});

			it('if constructIssuer rejects', () => {

				// given
				(envValidator.validate as SinonStub).resolves();
				(issuer.constructIssuer as SinonStub).rejects(new Error('something or other.'));

				// when - then
				return expect(getToken(env as any)({ username: 'user' }))
					.to.eventually.be.rejectedWith('Failed to grant token, error: something or other.')
					.then(() => {
						expect(issuer.constructIssuer).to.have.been.calledOnce;
						expect(issuer.constructIssuer).to.have.been.calledWith(env);
					});

			});

			it('if constructSignedJwt rejects', () => {

				// given
				(envValidator.validate as SinonStub).resolves();
				(issuer.constructIssuer as SinonStub).resolves();
				(sharedFunctions.constructSignedJwt as SinonStub).rejects(new Error('something or other.'));

				// when - then
				return expect(getToken(env as any)({ username: 'user' }))
					.to.eventually.be.rejectedWith('Failed to grant token, error: something or other.')
					.then(() => {
						expect(sharedFunctions.constructSignedJwt).to.have.been.calledOnce;
						expect(sharedFunctions.constructSignedJwt).to.have.been.calledWith(env);
					});

			});

			it('if obtainAuthorizationGrant rejects', () => {

				// given
				(envValidator.validate as SinonStub).resolves();
				(issuer.constructIssuer as SinonStub).resolves();
				(sharedFunctions.constructSignedJwt as SinonStub).resolves();
				(sharedFunctions.obtainAuthorizationGrant as SinonStub).rejects(new Error('something or other.'));

				// when - then
				return expect(getToken(env as any)({ username: 'user' }))
					.to.eventually.be.rejectedWith('Failed to grant token, error: something or other.')
					.then(() => {
						expect(sharedFunctions.constructSignedJwt).to.have.been.calledOnce;
						expect(sharedFunctions.constructSignedJwt).to.have.been.calledWith(env);
					});

			});

			it('if obtainAuthorizationGrant rejects', () => {

				// given
				(envValidator.validate as SinonStub).resolves();
				(issuer.constructIssuer as SinonStub).resolves();
				(sharedFunctions.constructSignedJwt as SinonStub).resolves();
				(sharedFunctions.obtainAuthorizationGrant as SinonStub).resolves({ access_token: 'accessToken', instance_url: 'instanceUrl' });

				// when - then
				return expect(getToken(env as any)({ username: 'user' }))
					.to.eventually.eql({
						accessToken: 'accessToken',
						instanceUrl: 'instanceUrl'
					})
					.then(() => {
						expect(envValidator.validate).to.have.been.calledOnce;
						expect(issuer.constructIssuer).to.have.been.calledOnce;
						expect(sharedFunctions.constructSignedJwt).to.have.been.calledOnce;
						expect(sharedFunctions.obtainAuthorizationGrant).to.have.been.calledOnce;
					});

			});

		});

	});

});
