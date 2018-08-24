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

import { Options } from '../../src';
import { middleware } from '../../src/openid/middleware';
import * as authorizationGrant from '../../src/openid/shared/authorizationGrant';
import * as envValidator from '../../src/openid/shared/envValidator';
import * as issuer from '../../src/openid/shared/issuer';
import * as jwt from '../../src/openid/shared/jwt';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('middleware.ts', () => {

	const env: Options.Auth = {
		jwtSigningKey: 'test',
		openidClientId: 'test',
		openidHTTPTimeout: 4001,
		openidIssuerURI: 'https://login.something.com/'
	};

	let req;
	let res;
	let next;

	let listener;

	let userInfoMock;
	let issuerClientUserInfoStub;
	let issuerClientMock;

	beforeEach(() => {

		req = {
			get: sinon.stub(),
			ip: '1.1.1.1'
		};

		res = {
			sendStatus: sinon.stub()
		};

		next = sinon.stub();

		listener = sinon.stub();

		middleware.emitter.on('denied', listener);
		middleware.emitter.on('token_validated', listener);
		middleware.emitter.on('grant_checked', listener);

		userInfoMock = {
			['preferred_username']: 'testPreferred_username',
			['organization_id']: 'testOrganization_id',
			['user_id']: 'testUser_id'
		};

		issuerClientUserInfoStub = sinon.stub();

		issuerClientMock = new class {
			public userinfo(accessToken) {
				return issuerClientUserInfoStub(accessToken);
			}
		}();

	});

	afterEach(() => {
		sinon.restore();
		middleware.emitter.removeAllListeners();
	});

	describe('tokenValidator', () => {

		it('should deny if envValidator rejects', () => {

			// given
			sinon.stub(envValidator, 'validate').throws(new Error('some error or other'));

			// when
			expect(() => middleware.tokenValidator(env)).to.throw('some error or other');

		});

		describe('should emit a deny event', () => {

			beforeEach(() => {
				sinon.stub(envValidator, 'validate').resolves();
			});

			it('if the req is null', () => {

				// given
				req.get.withArgs('Authorization').returns(null);

				// when
				return middleware.tokenValidator(env)(null as any, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.called;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith('Access denied to: unknown, error: Authorization header with \'Bearer ***...\' required.');
					});

			});

			it('if the req has no get method', () => {

				// given
				req.get.withArgs('Authorization').returns(null);

				// when
				return middleware.tokenValidator(env)({} as any, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.called;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith('Access denied to: unknown, error: Authorization header with \'Bearer ***...\' required.');
					});

			});

			it('if the header is null', () => {

				// given
				req.get.withArgs('Authorization').returns(null);

				// when
				return middleware.tokenValidator(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.called;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Authorization header with 'Bearer ***...' required.`);
					});
			});

			it('if the header is empty', () => {

				// given
				req.get.withArgs('Authorization').returns('');

				// when
				return middleware.tokenValidator(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.called;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Authorization header with 'Bearer ***...' required.`);
					});

			});

			it('with no bearer', () => {

				// given
				req.get.withArgs('Authorization').returns('12345');

				// when
				return middleware.tokenValidator(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.called;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Authorization header with 'Bearer ***...' required.`);
					});

			});

			it('for \'Bearer \'', () => {

				// given
				req.get.withArgs('Authorization').returns('Bearer ');

				// when
				return middleware.tokenValidator(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.called;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Authorization header with 'Bearer ***...' required.`);
					});

			});

			it('if constructIssuerClient rejects', () => {

				// given
				sinon.stub(issuer, 'constructIssuerClient').rejects(new Error('something or other'));
				req.get.withArgs('Authorization').returns('Bearer 12345');

				// when
				return middleware.tokenValidator(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.called;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: something or other.`);

						expect(issuer.constructIssuerClient).to.have.been.calledOnce;
						expect(issuer.constructIssuerClient).to.have.been.calledWith(env);
					});

			});

			it('if issuerClient userinfo rejects', () => {

				// given
				req.get.withArgs('Authorization').returns('Bearer 12345');
				sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
				issuerClientUserInfoStub.rejects(new Error('something or other'));

				// when
				return middleware.tokenValidator(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.called;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Failed to authenticate with Authorisation header.`);

						expect(issuer.constructIssuerClient).to.have.been.calledOnce;
						expect(issuer.constructIssuerClient).to.have.been.calledWith(env);
						expect(issuerClientUserInfoStub).to.have.been.calledOnce;
						expect(issuerClientUserInfoStub).to.have.been.calledWith('12345');
					});

			});

		});

		it('should call next and set orizuru on the request if client info resolves', () => {

			// given
			const user = {
				organizationId: userInfoMock.organization_id,
				username: userInfoMock.preferred_username
			};

			sinon.stub(envValidator, 'validate').resolves(new Error('some error or other'));
			req.get.withArgs('Authorization').returns('Bearer 12345');
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
			issuerClientUserInfoStub.resolves(userInfoMock);

			// when - then
			return middleware.tokenValidator(env)(req, res, next)
				.then(() => {

					expect(req.orizuru.user).to.deep.eq(user);

					expect(next).to.have.been.calledOnce;
					expect(listener).to.have.been.calledOnce;
					expect(listener).to.have.been.calledWith(`Token validated for: ${req.ip}`);

					expect(issuer.constructIssuerClient).to.have.been.calledOnce;
					expect(issuer.constructIssuerClient).to.have.been.calledWith(env);
					expect(issuerClientUserInfoStub).to.have.been.calledOnce;
					expect(issuerClientUserInfoStub).to.have.been.calledWith('12345');
				});

		});

		it('should respect an existing orizuru object', () => {

			const user = {
				organizationId: userInfoMock.organization_id,
				username: userInfoMock.preferred_username
			};

			// given
			sinon.stub(envValidator, 'validate').resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
			issuerClientUserInfoStub.resolves(userInfoMock);

			req.orizuru = { other: true };

			// when - then
			return middleware.tokenValidator(env)(req, res, next)
				.then(() => {

					expect(req.orizuru.user).to.deep.eq(user);
					expect(req.orizuru.other).to.eql(true);

					expect(next).to.have.been.calledOnce;
					expect(listener).to.have.been.calledOnce;
					expect(listener).to.have.been.calledWith(`Token validated for: ${req.ip}`);

					expect(issuer.constructIssuerClient).to.have.been.calledOnce;
					expect(issuer.constructIssuerClient).to.have.been.calledWith(env);
					expect(issuerClientUserInfoStub).to.have.been.calledOnce;
					expect(issuerClientUserInfoStub).to.have.been.calledWith('12345');
				});

		});

	});

	describe('grantChecker', () => {

		it('should error if the environment is invalid', () => {

			// given
			sinon.stub(envValidator, 'validate').throws(new Error('some error or other'));

			// when - then
			expect(() => middleware.grantChecker(env)).to.throw('some error or other');

		});

		describe('should emit a deny event', () => {

			beforeEach(() => {
				sinon.stub(envValidator, 'validate').resolves();
			});

			it('if there is no user on the request', () => {

				// given
				// when
				return middleware.grantChecker(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.calledOnce;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: A valid User is not set on the request.`);
					});

			});

			it('if there is no user', () => {

				// given
				req.orizuru = {};

				// when
				return middleware.grantChecker(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.calledOnce;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: A valid User is not set on the request.`);
					});

			});

			it('if the user has no username property', () => {

				// given
				req.orizuru = { user: {} };

				// when
				return middleware.grantChecker(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.calledOnce;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: A valid User is not set on the request.`);
					});

			});

			it('if constructIssuerClient rejects', () => {

				// given
				req.orizuru = { user: { username: 'bob@test.com' } };
				sinon.stub(issuer, 'constructIssuerClient').rejects(new Error('something or other'));

				// when
				return middleware.grantChecker(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.calledOnce;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: something or other.`);

						expect(issuer.constructIssuerClient).to.have.been.calledOnce;
						expect(issuer.constructIssuerClient).to.have.been.calledWith(env);
					});

			});

			it('if constructSignedJwt rejects', () => {

				// given
				req.orizuru = { user: { username: 'bob@test.com' } };
				sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
				sinon.stub(jwt, 'createJwtBearerGrantAssertion').rejects(new Error('Unable to sign JWT'));

				// when
				return middleware.grantChecker(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.calledOnce;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Unable to sign JWT.`);

						expect(issuer.constructIssuerClient).to.have.been.calledOnce;
						expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

						expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
						expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, req.orizuru.user);
					});

			});

			it('if obtainAuthorizationGrantMock rejects', () => {

				// given
				req.orizuru = { user: { username: 'bob@test.com' } };
				sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
				sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('assertion');
				sinon.stub(authorizationGrant, 'obtainAuthorizationGrant').rejects(new Error('Unable to obtain grant'));

				// when
				return middleware.grantChecker(env)(req, res, next)
					.then(() => {
						// then
						expect(next).to.not.have.been.calledOnce;
						expect(listener).to.have.been.calledOnce;
						expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Unable to obtain grant.`);

						expect(issuer.constructIssuerClient).to.have.been.calledOnce;
						expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

						expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
						expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, req.orizuru.user);

						expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledOnce;
						expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledWithExactly('assertion', issuerClientMock);
					});

			});

		});

		it('should call next if successful', () => {

			// given
			req.orizuru = { user: { username: 'bob@test.com' } };

			sinon.stub(envValidator, 'validate').resolves();
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
			sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('assertion');
			sinon.stub(authorizationGrant, 'obtainAuthorizationGrant').resolves('12345');

			// when
			return middleware.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					expect(req.orizuru.grantChecked).to.equal(true);

					expect(next).to.have.been.calledOnce;
					expect(listener).to.have.been.calledOnce;
					expect(listener).to.have.been.calledWith(`Grant checked for: ${req.ip}`);

					expect(issuer.constructIssuerClient).to.have.been.calledOnce;
					expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

					expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
					expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, req.orizuru.user);

					expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledOnce;
					expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledWithExactly('assertion', issuerClientMock);
				});

		});

		it('should respect an existing orizuru object', () => {

			// given
			const user = {
				organizationId: userInfoMock.organization_id,
				username: userInfoMock.preferred_username
			};

			sinon.stub(envValidator, 'validate').resolves();
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientMock);
			sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('assertion');
			sinon.stub(authorizationGrant, 'obtainAuthorizationGrant').resolves('12345');

			req.orizuru = { user, other: true };

			// when - then
			return middleware.grantChecker(env)(req, res, next)
				.then(() => {

					expect(req.orizuru.grantChecked).to.eql(true);
					expect(req.orizuru.other).to.eql(true);

					expect(next).to.have.been.calledOnce;
					expect(listener).to.have.been.calledOnce;
					expect(listener).to.have.been.calledWith(`Grant checked for: ${req.ip}`);

					expect(issuer.constructIssuerClient).to.have.been.calledOnce;
					expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

					expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
					expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, req.orizuru.user);

					expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledOnce;
					expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledWithExactly('assertion', issuerClientMock);
				});

		});

	});

});
