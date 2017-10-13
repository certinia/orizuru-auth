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

	auth = require('../../lib/openid/middleware'),
	issuer = require('../../lib/openid/shared/issuer'),
	envValidator = require('../../lib/openid/shared/envValidator'),

	sharedFunctions = require('../../lib/openid/shared/functions'),

	env = {
		openidIssuerURI: 'https://login.something.com/',
		openidHTTPTimeout: 4001
	},

	expect = chai.expect,
	assert = sinon.assert,
	notCalled = assert.notCalled,
	calledOnce = assert.calledOnce,
	calledWith = assert.calledWith,

	sandbox = sinon.sandbox.create();

chai.use(chaiAsPromised);

describe('middleware.js', () => {

	let req, res, next,

		baseError,
		noHeaderTokenError,
		noHeaderTokenErrorUnknown,
		noIssuerError,
		authenticationFailedError,
		missingUserError,
		unableToSignJwtError,
		unableToObtainGrantError,
		listener,

		envValidatorMock,
		userInfoMock,
		issuerClientUserInfoStub,
		IssuerClientMock,
		issuerInstanceMock,
		issuerGetAsyncMock,
		constructSignedJwtMock,
		obtainAuthorizationGrantMock;

	beforeEach(() => {

		req = {
			get: sandbox.stub(),
			ip: '1.1.1.1'
		};

		res = {
			sendStatus: sandbox.stub()
		};

		next = sandbox.stub();

		listener = sandbox.stub();

		auth.emitter.on('denied', listener);
		auth.emitter.on('token_validated', listener);
		auth.emitter.on('grant_checked', listener);

		baseError = `Access denied to: ${req.ip}, error:`;
		noHeaderTokenError = `${baseError} Authorization header with 'Bearer ***...' required`;
		noHeaderTokenErrorUnknown = 'Access denied to: unknown, error: Authorization header with \'Bearer ***...\' required';
		noIssuerError = `${baseError} Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`;
		authenticationFailedError = `${baseError} Failed to authenticate with Authorisation header`;
		missingUserError = `${baseError} A valid User is not set on the request`;
		unableToSignJwtError = `${baseError} Unable to sign JWT`;
		unableToObtainGrantError = `${baseError} Unable to obtain grant`;

		envValidatorMock = sandbox.stub(envValidator, 'validate');

		userInfoMock = {
			['preferred_username']: 'testPreferred_username',
			['organization_id']: 'testOrganization_id',
			['user_id']: 'testUser_id'
		};

		issuerClientUserInfoStub = sandbox.stub();

		IssuerClientMock = class {
			userinfo(accessToken) {
				return issuerClientUserInfoStub(accessToken);
			}
		};

		issuerInstanceMock = {
			Client: IssuerClientMock
		};

		issuerGetAsyncMock = sandbox.stub(issuer, 'getAsync');
		constructSignedJwtMock = sandbox.stub(sharedFunctions, 'constructSignedJwt');
		obtainAuthorizationGrantMock = sandbox.stub(sharedFunctions, 'obtainAuthorizationGrant');
	});

	afterEach(() => {
		sandbox.restore();
		auth.emitter.removeAllListeners('deny');
	});

	describe('tokenValidator', () => {

		it('should deny if envValidator rejects', () => {

			// given
			envValidatorMock.throws(new Error('some error or other'));

			// when
			expect(() => auth.tokenValidator(env)).to.throw('some error or other');

		});

		it('should emit a deny event if the req is null', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns(null);

			// when
			return auth.tokenValidator(env)(null, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noHeaderTokenErrorUnknown);
				});

		});

		it('should emit a deny event if the req has no get method', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns(null);

			// when
			return auth.tokenValidator(env)({}, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noHeaderTokenErrorUnknown);
				});

		});

		it('should emit a deny event if the header is null', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns(null);

			// when
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noHeaderTokenError);
				});
		});

		it('should emit a deny event if the header is empty', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('');

			// when
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noHeaderTokenError);
				});

		});

		it('should emit a deny event with no bearer', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('12345');

			// when
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noHeaderTokenError);
				});

		});

		it('should emit a deny event for bearer space', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer ');

			// when
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noHeaderTokenError);
				});

		});

		it('should emit a deny event if issuer getAsync rejects', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.rejects(new Error('something or other'));

			// when
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noIssuerError);

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});
		});

		it('should emit a deny event if issuer getAsync resolves with null', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(null);

			// when
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noIssuerError);

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should emit a deny event if issuerClient userinfo rejects', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			issuerClientUserInfoStub.rejects(new Error('something or other'));

			// when
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, authenticationFailedError);

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(issuerClientUserInfoStub);
					calledWith(issuerClientUserInfoStub, '12345');
				});

		});

		it('should emit a deny event if issuerClient userinfo resolves with null', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			issuerClientUserInfoStub.resolves(null);

			// when
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, authenticationFailedError);

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(issuerClientUserInfoStub);
					calledWith(issuerClientUserInfoStub, '12345');
				});

		});

		it('should call next and set nozomi on the request if client info resolves', () => {

			const
				user = {
					username: userInfoMock.preferred_username,
					organizationId: userInfoMock.organization_id
				};

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			issuerClientUserInfoStub.resolves(userInfoMock);

			// when - then
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {

					expect(req.nozomi.user).to.deep.eql(user);

					calledOnce(next);
					calledOnce(listener);
					calledWith(listener, 'Token validated for: 1.1.1.1');

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(issuerClientUserInfoStub);
					calledWith(issuerClientUserInfoStub, '12345');
				});

		});

		it('should respect an existing nozomi object', () => {

			const
				user = {
					username: userInfoMock.preferred_username,
					organizationId: userInfoMock.organization_id
				};

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			issuerClientUserInfoStub.resolves(userInfoMock);

			req.nozomi = { other: true };

			// when - then
			return auth.tokenValidator(env)(req, res, next)
				.then(() => {

					expect(req.nozomi.user).to.deep.eql(user);
					expect(req.nozomi.other).to.eql(true);

					calledOnce(next);
					calledOnce(listener);
					calledWith(listener, 'Token validated for: 1.1.1.1');

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(issuerClientUserInfoStub);
					calledWith(issuerClientUserInfoStub, '12345');
				});

		});

	});

	describe('grantChecker', () => {

		it('should error if the environment is invalid', () => {

			// given
			envValidatorMock.throws(new Error('some error or other'));

			// when - then
			expect(() => auth.grantChecker(env)).to.throw('some error or other');

		});

		it('should emit a deny event if there is no user on the request', () => {

			// given
			envValidatorMock.resolves();

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, missingUserError);
				});

		});

		it('should emit a deny event if there is no user', () => {

			// given
			envValidatorMock.resolves();
			req.nozomi = {};

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, missingUserError);
				});

		});

		it('should emit a deny event if the user has no username property', () => {

			// given
			envValidatorMock.resolves();
			req.nozomi = { user: {} };

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, missingUserError);
				});

		});

		it('should emit a deny event if issuer getAsync rejects', () => {

			// given
			envValidatorMock.resolves();
			req.nozomi = { user: { username: 'bob@test.com' } };
			issuerGetAsyncMock.rejects(new Error('something or other'));

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noIssuerError);

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should emit a deny event if issuer getAsync resolves with null', () => {

			// given
			envValidatorMock.resolves();
			req.nozomi = { user: { username: 'bob@test.com' } };
			issuerGetAsyncMock.resolves(null);

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, noIssuerError);

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should emit a deny event if constructSignedJwt rejects', () => {

			// given
			envValidatorMock.resolves();
			req.nozomi = { user: { username: 'bob@test.com' } };
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			constructSignedJwtMock.rejects(new Error('Unable to sign JWT'));

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, unableToSignJwtError);

					calledWith(constructSignedJwtMock, { env, issuerClient: sinon.match.any, user: req.nozomi.user });

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should emit a deny event if constructSignedJwt rejects', () => {

			// given

			envValidatorMock.resolves();
			req.nozomi = { user: { username: 'bob@test.com' } };
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			constructSignedJwtMock.resolves();
			obtainAuthorizationGrantMock.rejects(new Error('Unable to obtain grant'));

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, unableToObtainGrantError);

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(constructSignedJwtMock);
				});

		});

		it('should call next if all ok', () => {

			// given
			envValidatorMock.resolves();
			req.nozomi = { user: { username: 'bob@test.com' } };
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			constructSignedJwtMock.resolves();
			obtainAuthorizationGrantMock.resolves('12345');

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then

					expect(req.nozomi.grantChecked).to.equal(true);

					calledOnce(next);
					calledOnce(listener);
					calledWith(listener, 'Grant checked for: 1.1.1.1');

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(constructSignedJwtMock);
					calledOnce(obtainAuthorizationGrantMock);
				});

		});

	});

});
