'use strict';

const
	sinon = require('sinon'),
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),

	auth = require('../../src/openid/auth'),
	issuer = require('../../src/openid/shared/issuer'),
	sharedFunctions = require('../../src/openid/shared/functions'),
	envValidator = require('../../src/openid/shared/envValidator'),

	env = {
		openidIssuerURI: 'https://login.something.com/',
		openidHTTPTimeout: 4001
	},

	expect = chai.expect,
	assert = sinon.assert,
	calledOnce = assert.calledOnce,
	calledWith = assert.calledWith,

	sandbox = sinon.sandbox.create();

chai.use(chaiAsPromised);

describe('auth.js', () => {

	let req,

		baseError,
		noHeaderTokenError,
		noHeaderTokenErrorUnknown,
		noIssuerError,
		authenticationFailedError,

		envValidatorMock,
		userInfoMock,
		issuerClientUserInfoStub,
		IssuerClientMock,
		issuerInstanceMock,
		issuerGetAsyncMock,

		sharedConstructSignedJwtMock,
		sharedObtainAuthorizationGrantMock;

	beforeEach(() => {

		req = {
			get: sandbox.stub(),
			ip: '1.1.1.1'
		};

		baseError = `Access denied to: ${req.ip}, error:`;
		noHeaderTokenError = `${baseError} Authorization header with 'Bearer ***...' required`;
		noHeaderTokenErrorUnknown = 'Access denied to: unknown, error: Authorization header with \'Bearer ***...\' required';
		noIssuerError = `${baseError} Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`;
		authenticationFailedError = `${baseError} Failed to authenticate with Authorisation header`;

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

		sharedConstructSignedJwtMock = sandbox.stub(sharedFunctions, 'constructSignedJwt');
		sharedObtainAuthorizationGrantMock = sandbox.stub(sharedFunctions, 'obtainAuthorizationGrant');

	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('express', () => {

		it('should reject if envValidator rejects', () => {

			// given
			envValidatorMock.throws(new Error('some error or other'));

			// when - then
			expect(() => auth.express(env)).to.throw('some error or other');

		});

		it('should reject if the req is null', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns(null);

			// when - then
			return expect(auth.express(env)(null)).to.eventually.be.rejectedWith(noHeaderTokenErrorUnknown);

		});

		it('should reject if the req has no get method', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns(null);

			// when - then
			return expect(auth.express(env)({})).to.eventually.be.rejectedWith(noHeaderTokenErrorUnknown);

		});

		it('should reject if the header is null', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns(null);

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(noHeaderTokenError);

		});

		it('should reject if the header is empty', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('');

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(noHeaderTokenError);

		});

		it('should reject with no bearer', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('12345');

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(noHeaderTokenError);

		});

		it('should reject for bearer space', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer ');

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(noHeaderTokenError);

		});

		it('should reject if issuer getAsync rejects', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.rejects(new Error('something or other'));

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(noIssuerError)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should reject if issuer getAsync resolves with null', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(null);

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(noIssuerError)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				});

		});

		it('should reject if issuerClient userinfo rejects', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			issuerClientUserInfoStub.rejects(new Error('something or other'));

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(authenticationFailedError)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(issuerClientUserInfoStub);
					calledWith(issuerClientUserInfoStub, '12345');
				});

		});

		it('should reject if issuerClient userinfo resolves with null', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			issuerClientUserInfoStub.resolves(null);

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(authenticationFailedError)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(issuerClientUserInfoStub);
					calledWith(issuerClientUserInfoStub, '12345');
				});

		});

		it('should reject if a shared function rejects', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			issuerClientUserInfoStub.resolves(userInfoMock);
			sharedConstructSignedJwtMock.resolves('testJwtResult');
			sharedObtainAuthorizationGrantMock.rejects(new Error('Shared function error'));

			// when - then
			return expect(auth.express(env)(req)).to.eventually.be.rejectedWith(`${baseError} Shared function error`)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(issuerClientUserInfoStub);
					calledWith(issuerClientUserInfoStub, '12345');
					calledOnce(sharedConstructSignedJwtMock);
					calledWith(sharedConstructSignedJwtMock, {
						env,
						issuerClient: sinon.match.instanceOf(IssuerClientMock),
						userInfo: userInfoMock
					});
					calledOnce(sharedObtainAuthorizationGrantMock);
					calledWith(sharedObtainAuthorizationGrantMock, 'testJwtResult');
				});

		});

		it('should resolve if shared functions resolve', () => {

			// given
			envValidatorMock.resolves();
			req.get.withArgs('Authorization').returns('Bearer 12345');
			issuerGetAsyncMock.resolves(issuerInstanceMock);
			issuerClientUserInfoStub.resolves(userInfoMock);
			sharedConstructSignedJwtMock.resolves('testJwtResult');
			sharedObtainAuthorizationGrantMock.resolves({
				env,
				grant: {
					['instance_url']: 'mockInstance_url'
				},
				userInfo: userInfoMock
			});

			// when - then
			return expect(auth.express(env)(req)).to.eventually.eql({
				username: userInfoMock.preferred_username,
				instanceUrl: 'mockInstance_url',
				organizationId: userInfoMock.organization_id,
				userId: userInfoMock.user_id
			}).then(() => {
				calledOnce(issuerGetAsyncMock);
				calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
				calledOnce(issuerClientUserInfoStub);
				calledWith(issuerClientUserInfoStub, '12345');
				calledOnce(sharedConstructSignedJwtMock);
				calledWith(sharedConstructSignedJwtMock, {
					env,
					issuerClient: sinon.match.instanceOf(IssuerClientMock),
					userInfo: userInfoMock
				});
				calledOnce(sharedObtainAuthorizationGrantMock);
				calledWith(sharedObtainAuthorizationGrantMock, 'testJwtResult');
			});

		});

	});

});
