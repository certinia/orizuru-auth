/**
 * Copyright (c) 2017, FinancialForce.com, inc
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
 **/

'use strict';

const
	sinon = require('sinon'),
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),

	env = {
		openidIssuerURI: 'https://login.something.com/',
		openidHTTPTimeout: 4001
	},

	grant = require('../../lib/openid/grant'),
	issuer = require('../../lib/openid/shared/issuer'),
	sharedFunctions = require('../../lib/openid/shared/functions'),
	envValidator = require('../../lib/openid/shared/envValidator'),

	expect = chai.expect,
	calledOnce = sinon.assert.calledOnce,
	calledWith = sinon.assert.calledWith;

chai.use(chaiAsPromised);

describe('grant.js', () => {

	let baseError,
		usernameRequiredError,
		usernameNotEmptyError,
		noIssuerError,

		envValidatorMock,
		IssuerClientMock,
		issuerInstanceMock,
		issuerGetAsyncMock,

		sharedConstructSignedJwtMock,
		sharedObtainAuthorizationGrantMock;

	beforeEach(() => {

		baseError = 'Failed to grant token, error:';
		usernameRequiredError = `${baseError} Missing required parameter: username.`;
		usernameNotEmptyError = `${baseError} Invalid parameter: username cannot be empty.`;
		noIssuerError = `${baseError} Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`;

		envValidatorMock = sinon.stub(envValidator, 'validate');

		IssuerClientMock = class { };

		issuerInstanceMock = {
			Client: IssuerClientMock
		};

		issuerGetAsyncMock = sinon.stub(issuer, 'getAsync');

		sharedConstructSignedJwtMock = sinon.stub(sharedFunctions, 'constructSignedJwt');
		sharedObtainAuthorizationGrantMock = sinon.stub(sharedFunctions, 'obtainAuthorizationGrant');

	});

	afterEach(() => {
		sinon.restore();
	});

	describe('getToken', () => {

		it('should reject if envValidator rejects', () => {

			// given
			envValidatorMock.throws(new Error('some error or other'));

			// when - then
			expect(() => grant.getToken(env)).to.throw('some error or other');

		});

		it('should reject if user is null', () => {

			// given
			envValidatorMock.resolves();

			// when - then
			return expect(grant.getToken(env)(null)).to.eventually.be.rejectedWith(usernameNotEmptyError);

		});

		it('should reject if username is missing', () => {

			// given
			envValidatorMock.resolves();

			// when - then
			return expect(grant.getToken(env)({})).to.eventually.be.rejectedWith(usernameRequiredError);

		});

		it('should reject if username is empty', () => {

			// given
			envValidatorMock.resolves();

			// when - then
			return expect(grant.getToken(env)({ username: '' })).to.eventually.be.rejectedWith(usernameNotEmptyError);

		});

		it('should reject if issuer getAsync rejects', () => {

			// given
			envValidatorMock.resolves();
			issuerGetAsyncMock.rejects(new Error('something or other'));

			// when - then
			return expect(grant.getToken(env)({ username: 'user' })).to.eventually.be.rejectedWith(noIssuerError)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should reject if issuer getAsync resolves with null', () => {

			// given
			envValidatorMock.resolves();
			issuerGetAsyncMock.resolves(null);

			// when - then
			return expect(grant.getToken(env)({ username: 'user' })).to.eventually.be.rejectedWith(noIssuerError)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should reject if a shared function rejects', () => {

			// given
			envValidatorMock.resolves();
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			sharedConstructSignedJwtMock.resolves('testJwtResult');
			sharedObtainAuthorizationGrantMock.rejects(new Error('Shared function error'));

			// when - then
			return expect(grant.getToken(env)({ username: 'user' })).to.eventually.be.rejectedWith(`${baseError} Shared function error`)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(sharedConstructSignedJwtMock);
					calledWith(sharedConstructSignedJwtMock, {
						env,
						issuerClient: sinon.match.instanceOf(IssuerClientMock),
						user: {
							username: 'user'
						}
					});
					calledOnce(sharedObtainAuthorizationGrantMock);
					calledWith(sharedObtainAuthorizationGrantMock, 'testJwtResult');
				});

		});

		it('should resolve if shared functions resolve', () => {

			// given
			envValidatorMock.resolves();
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			sharedConstructSignedJwtMock.resolves('testJwtResult');
			sharedObtainAuthorizationGrantMock.resolves({
				['access_token']: '12345',
				['instance_url']: 'https://something.com'
			});

			// when - then
			return expect(grant.getToken(env)({ username: 'user' })).to.eventually.eql({ instanceUrl: 'https://something.com', accessToken: '12345' })
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(sharedConstructSignedJwtMock);
					calledWith(sharedConstructSignedJwtMock, {
						env,
						issuerClient: sinon.match.instanceOf(IssuerClientMock),
						user: {
							username: 'user'
						}
					});
					calledOnce(sharedObtainAuthorizationGrantMock);
					calledWith(sharedObtainAuthorizationGrantMock, 'testJwtResult');
				});

		});

	});

});
