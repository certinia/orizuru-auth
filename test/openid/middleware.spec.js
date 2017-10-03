'use strict';

const
	sinon = require('sinon'),
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),

	auth = require('../../src/openid/middleware'),
	issuer = require('../../src/openid/shared/issuer'),
	envValidator = require('../../src/openid/shared/envValidator'),

	sharedFunctions = require('../../src/openid/shared/functions'),

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

		auth.emitter.on('deny', listener);

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

		it('should call next if client info resolves', () => {

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

					expect(req.user).to.deep.eql(user);

					calledOnce(next);
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

		it('should emit a deny event if the user has no username property', () => {

			// given
			envValidatorMock.resolves();
			req.user = {};

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
			req.user = { username: 'bob@test.com' };
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
			req.user = { username: 'bob@test.com' };
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
			req.user = { username: 'bob@test.com' };
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			constructSignedJwtMock.rejects(new Error('Unable to sign JWT'));

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					notCalled(next);
					calledOnce(listener);
					calledWith(listener, unableToSignJwtError);

					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should emit a deny event if constructSignedJwt rejects', () => {

			// given

			envValidatorMock.resolves();
			req.user = { username: 'bob@test.com' };
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
			req.user = { username: 'bob@test.com' };
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			constructSignedJwtMock.resolves();
			obtainAuthorizationGrantMock.resolves('12345');

			// when
			return auth.grantChecker(env)(req, res, next)
				.then(() => {
					// then
					calledOnce(next);
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(constructSignedJwtMock);
					calledOnce(obtainAuthorizationGrantMock);
				});

		});

	});

});
