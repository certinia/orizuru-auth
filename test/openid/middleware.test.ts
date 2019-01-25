/**
 * Copyright (c) 2017-2019, FinancialForce.com, inc
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

import { NextFunction, Request, Response } from 'express';
import * as openidClient from 'openid-client';

import { Environment } from '../../src';
import { middleware } from '../../src/openid/middleware';
import * as authorizationGrant from '../../src/openid/shared/authorizationGrant';
import * as envValidator from '../../src/openid/shared/envValidator';
import * as issuer from '../../src/openid/shared/issuer';
import * as jwt from '../../src/openid/shared/jwt';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

interface ExtendedOrizuru extends Orizuru.Context {
	grantChecked: boolean;
	other: boolean;
	user: {
		organizationId: string;
		username: string;
	};
}

interface ExtendedRequest extends Request {
	orizuru: ExtendedOrizuru;
}

describe('openid/middleware.ts', () => {

	const env: Environment = {
		jwtSigningKey: 'test',
		openidClientId: 'test',
		openidClientSecret: 'test',
		openidHTTPTimeout: 4001,
		openidIssuerURI: 'https://login.something.com/'
	};

	let req: ExtendedRequest;
	let res: Response;
	let next: NextFunction;

	let getStub: SinonStub;
	let listener: SinonStub;

	let issuerClientStubInstance: SinonStubbedInstance<openidClient.Client>;

	beforeEach(() => {

		getStub = sinon.stub();

		const partialRequest: Partial<ExtendedRequest> = {
			get: getStub,
			ip: '1.1.1.1',
			orizuru: {
				grantChecked: false,
				other: true,
				user: {
					organizationId: 'testOrganizationId',
					username: 'bob@test.com'
				}
			}
		};

		const partialResponse: Partial<Response> = {
			sendStatus: sinon.stub()
		};

		req = partialRequest as ExtendedRequest;
		res = partialResponse as Response;
		next = sinon.stub();

		listener = sinon.stub();

		middleware.emitter.on('denied', listener);
		middleware.emitter.on('token_validated', listener);
		middleware.emitter.on('grant_checked', listener);

		issuerClientStubInstance = {
			grant: sinon.stub(),
			userinfo: sinon.stub()
		};

	});

	afterEach(() => {
		sinon.restore();
		middleware.emitter.removeAllListeners();
	});

	describe('tokenValidator', () => {

		beforeEach(() => {
			delete req.orizuru.user;
		});

		it('should deny if envValidator rejects', () => {

			// Given
			sinon.stub(envValidator, 'validate').throws(new Error('some error or other'));

			// When
			expect(() => middleware.tokenValidator(env)).to.throw('some error or other');

		});

		describe('should emit a deny event', () => {

			beforeEach(() => {
				sinon.stub(envValidator, 'validate').resolves();
			});

			it('if the req is undefined', async () => {

				// Given
				const wrappedReq = {
					req
				};

				delete wrappedReq.req;

				// When
				await middleware.tokenValidator(env)(wrappedReq.req, res, next);

				// Then
				expect(next).to.not.have.been.called;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith('Access denied to: unknown, error: Authorization header with \'Bearer ***...\' required.');

			});

			it('if the req has no get method', async () => {

				// Given
				delete req.ip;
				delete req.get;

				// When
				await middleware.tokenValidator(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.called;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith('Access denied to: unknown, error: Authorization header with \'Bearer ***...\' required.');

			});

			it('if the header is null', async () => {

				// Given
				getStub.withArgs('Authorization').returns(null);

				// When
				await middleware.tokenValidator(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.called;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Authorization header with 'Bearer ***...' required.`);

			});

			it('if the header is empty', async () => {

				// Given
				getStub.withArgs('Authorization').returns('');

				// When
				await middleware.tokenValidator(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.called;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Authorization header with 'Bearer ***...' required.`);

			});

			it('with no bearer', async () => {

				// Given
				getStub.withArgs('Authorization').returns('12345');

				// When
				await middleware.tokenValidator(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.called;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Authorization header with 'Bearer ***...' required.`);

			});

			it('for \'Bearer \'', async () => {

				// Given
				getStub.withArgs('Authorization').returns('Bearer ');

				// When
				await middleware.tokenValidator(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.called;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Authorization header with 'Bearer ***...' required.`);

			});

			it('if constructIssuerClient rejects', async () => {

				// Given
				sinon.stub(issuer, 'constructIssuerClient').rejects(new Error('something or other'));
				getStub.withArgs('Authorization').returns('Bearer 12345');

				// When
				await middleware.tokenValidator(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.called;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: something or other.`);

				expect(issuer.constructIssuerClient).to.have.been.calledOnce;
				expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

			});

			it('if issuerClient userinfo rejects', async () => {

				// Given
				getStub.withArgs('Authorization').returns('Bearer 12345');
				sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientStubInstance);
				issuerClientStubInstance.userinfo.rejects(new Error('something or other'));

				// When
				await middleware.tokenValidator(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.called;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Failed to authenticate with Authorisation header.`);

				expect(issuer.constructIssuerClient).to.have.been.calledOnce;
				expect(issuer.constructIssuerClient).to.have.been.calledWith(env);
				expect(issuerClientStubInstance.userinfo).to.have.been.calledOnce;
				expect(issuerClientStubInstance.userinfo).to.have.been.calledWith('12345');

			});

		});

		it('should call next and set orizuru on the request if client info resolves', async () => {

			// Given
			delete req.orizuru;

			sinon.stub(envValidator, 'validate').resolves();
			getStub.withArgs('Authorization').returns('Bearer 12345');
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientStubInstance);
			issuerClientStubInstance.userinfo.resolves({
				['preferred_username']: 'testPreferredUsername',
				['organization_id']: 'testOrganizationId'
			});

			// When
			await middleware.tokenValidator(env)(req, res, next);

			// Then
			expect(req.orizuru).to.have.property('user').that.eqls({
				organizationId: 'testOrganizationId',
				username: 'testPreferredUsername'
			});

			expect(next).to.have.been.calledOnce;
			expect(listener).to.have.been.calledOnce;
			expect(listener).to.have.been.calledWith(`Token validated for: ${req.ip}`);

			expect(issuer.constructIssuerClient).to.have.been.calledOnce;
			expect(issuer.constructIssuerClient).to.have.been.calledWith(env);
			expect(issuerClientStubInstance.userinfo).to.have.been.calledOnce;
			expect(issuerClientStubInstance.userinfo).to.have.been.calledWith('12345');

		});

		it('should respect an existing orizuru object', async () => {

			// Given
			delete req.orizuru.user;

			sinon.stub(envValidator, 'validate').resolves();
			getStub.withArgs('Authorization').returns('Bearer 12345');
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientStubInstance);
			issuerClientStubInstance.userinfo.resolves({
				['preferred_username']: 'testPreferredUsername',
				['organization_id']: 'testOrganizationId'
			});

			// When
			await middleware.tokenValidator(env)(req, res, next);

			// Then
			expect(req.orizuru).to.have.property('user').that.eqls({
				organizationId: 'testOrganizationId',
				username: 'testPreferredUsername'
			});
			expect(req.orizuru).to.have.property('other', true);

			expect(next).to.have.been.calledOnce;
			expect(listener).to.have.been.calledOnce;
			expect(listener).to.have.been.calledWith(`Token validated for: ${req.ip}`);

			expect(issuer.constructIssuerClient).to.have.been.calledOnce;
			expect(issuer.constructIssuerClient).to.have.been.calledWith(env);
			expect(issuerClientStubInstance.userinfo).to.have.been.calledOnce;
			expect(issuerClientStubInstance.userinfo).to.have.been.calledWith('12345');

		});

	});

	describe('grantChecker', () => {

		beforeEach(() => {
			delete req.orizuru.grantChecked;
		});

		it('should error if the environment is invalid', () => {

			// Given
			sinon.stub(envValidator, 'validate').throws(new Error('some error or other'));

			// When
			// Then
			expect(() => middleware.grantChecker(env)).to.throw('some error or other');

		});

		describe('should emit a deny event', () => {

			beforeEach(() => {
				sinon.stub(envValidator, 'validate').resolves();
			});

			it('if there is no user on the request', async () => {

				// Given
				delete req.orizuru;

				// When
				await middleware.grantChecker(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.calledOnce;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: A valid User is not set on the request.`);

			});

			it('if there is no user', async () => {

				// Given
				delete req.orizuru.user;

				// When
				await middleware.grantChecker(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.calledOnce;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: A valid User is not set on the request.`);

			});

			it('if the user has no username property', async () => {

				// Given
				delete req.orizuru.user;

				// When
				await middleware.grantChecker(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.calledOnce;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: A valid User is not set on the request.`);

			});

			it('if constructIssuerClient rejects', async () => {

				// Given
				sinon.stub(issuer, 'constructIssuerClient').rejects(new Error('something or other'));

				// When
				await middleware.grantChecker(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.calledOnce;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: something or other.`);

				expect(issuer.constructIssuerClient).to.have.been.calledOnce;
				expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

			});

			it('if constructSignedJwt rejects', async () => {

				// Given
				sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientStubInstance);
				sinon.stub(jwt, 'createJwtBearerGrantAssertion').rejects(new Error('Unable to sign JWT'));

				// When
				await middleware.grantChecker(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.calledOnce;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Unable to sign JWT.`);

				expect(issuer.constructIssuerClient).to.have.been.calledOnce;
				expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, req.orizuru.user);

			});

			it('if obtainAuthorizationGrantMock rejects', async () => {

				// Given
				sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientStubInstance);
				sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('assertion');
				sinon.stub(authorizationGrant, 'obtainAuthorizationGrant').rejects(new Error('Unable to obtain grant'));

				// When
				await middleware.grantChecker(env)(req, res, next);

				// Then
				expect(next).to.not.have.been.calledOnce;
				expect(listener).to.have.been.calledOnce;
				expect(listener).to.have.been.calledWith(`Access denied to: ${req.ip}, error: Unable to obtain grant.`);

				expect(issuer.constructIssuerClient).to.have.been.calledOnce;
				expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, req.orizuru.user);

				expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledOnce;
				expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledWithExactly('assertion', issuerClientStubInstance);

			});

		});

		it('should call next if successful', async () => {

			// Given
			delete req.orizuru.grantChecked;

			sinon.stub(envValidator, 'validate').resolves();
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientStubInstance);
			sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('assertion');
			sinon.stub(authorizationGrant, 'obtainAuthorizationGrant').resolves({
				access_token: 'accessToken',
				expires_in: 3600,
				id_token: 'testId',
				instance_url: 'instanceUrl',
				token_type: 'Bearer'
			});

			// When
			await middleware.grantChecker(env)(req, res, next);

			// Then
			expect(req.orizuru).to.have.property('grantChecked', true);

			expect(next).to.have.been.calledOnce;
			expect(listener).to.have.been.calledOnce;
			expect(listener).to.have.been.calledWith(`Grant checked for: ${req.ip}`);

			expect(issuer.constructIssuerClient).to.have.been.calledOnce;
			expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

			expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
			expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, req.orizuru.user);

			expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledOnce;
			expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledWithExactly('assertion', issuerClientStubInstance);

		});

		it('should respect an existing orizuru object', async () => {

			// Given
			delete req.orizuru.grantChecked;

			sinon.stub(envValidator, 'validate').resolves();
			sinon.stub(issuer, 'constructIssuerClient').resolves(issuerClientStubInstance);
			sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('assertion');
			sinon.stub(authorizationGrant, 'obtainAuthorizationGrant').resolves({
				access_token: 'accessToken',
				expires_in: 3600,
				id_token: 'testId',
				instance_url: 'instanceUrl',
				token_type: 'Bearer'
			});

			// When
			await middleware.grantChecker(env)(req, res, next);

			// Then
			expect(req.orizuru).to.have.property('grantChecked', true);
			expect(req.orizuru.other).to.eql(true);

			expect(next).to.have.been.calledOnce;
			expect(listener).to.have.been.calledOnce;
			expect(listener).to.have.been.calledWith(`Grant checked for: ${req.ip}`);

			expect(issuer.constructIssuerClient).to.have.been.calledOnce;
			expect(issuer.constructIssuerClient).to.have.been.calledWith(env);

			expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
			expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, req.orizuru.user);

			expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledOnce;
			expect(authorizationGrant.obtainAuthorizationGrant).to.have.been.calledWithExactly('assertion', issuerClientStubInstance);

		});

	});

});
