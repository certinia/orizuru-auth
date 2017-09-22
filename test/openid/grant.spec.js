'use strict';

const
	sinon = require('sinon'),
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),

	env = {
		openidIssuerURI: 'https://login.something.com/',
		openidHTTPTimeout: 4001
	},

	grant = require('../../src/openid/grant'),
	issuer = require('../../src/openid/shared/issuer'),
	sharedFunctions = require('../../src/openid/shared/functions'),
	envValidator = require('../../src/openid/shared/envValidator'),

	expect = chai.expect,
	calledOnce = sinon.assert.calledOnce,
	calledWith = sinon.assert.calledWith,

	sandbox = sinon.sandbox.create();

chai.use(chaiAsPromised);

describe('grant.js', () => {

	let baseError,
		usernameRequiredError,
		usernameNotEmptyError,
		organisationIdRequiredError,
		organisationIdNotEmptyError,
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
		organisationIdRequiredError = `${baseError} Missing required parameter: organizationId.`;
		organisationIdNotEmptyError = `${baseError} Invalid parameter: organizationId cannot be empty.`;
		noIssuerError = `${baseError} Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`;

		envValidatorMock = sandbox.stub(envValidator, 'validate');

		IssuerClientMock = class {};

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

	describe('token', () => {

		it('should reject if envValidator rejects', () => {

			// given
			envValidatorMock.throws(new Error('some error or other'));

			// when - then
			expect(() => grant.token(env)).to.throw('some error or other');

		});

		it('should reject if username is null', () => {

			// given
			envValidatorMock.resolves();

			// when - then
			return expect(grant.token(env)(null, 'something')).to.eventually.be.rejectedWith(usernameRequiredError);

		});

		it('should reject if username is empty', () => {

			// given
			envValidatorMock.resolves();

			// when - then
			return expect(grant.token(env)('', 'something')).to.eventually.be.rejectedWith(usernameNotEmptyError);

		});

		it('should reject if organisationId is null', () => {

			// given
			envValidatorMock.resolves();

			// when - then
			return expect(grant.token(env)('something', null)).to.eventually.be.rejectedWith(organisationIdRequiredError);

		});

		it('should reject if organisationId is empty', () => {

			// given
			envValidatorMock.resolves();

			// when - then
			return expect(grant.token(env)('something', '')).to.eventually.be.rejectedWith(organisationIdNotEmptyError);

		});

		it('should reject if issuer getAsync rejects', () => {

			// given
			envValidatorMock.resolves();
			issuerGetAsyncMock.rejects(new Error('something or other'));

			// when - then
			return expect(grant.token(env)('user', 'org')).to.eventually.be.rejectedWith(noIssuerError)
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
			return expect(grant.token(env)('user', 'org')).to.eventually.be.rejectedWith(noIssuerError)
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
			return expect(grant.token(env)('user', 'org')).to.eventually.be.rejectedWith(`${baseError} Shared function error`)
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(sharedConstructSignedJwtMock);
					calledWith(sharedConstructSignedJwtMock, {
						env,
						issuerClient: sinon.match.instanceOf(IssuerClientMock),
						userInfo: {
							['preferred_username']: 'user',
							['organization_id']: 'org'
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
				env,
				grant: 'grantTest',
				userInfo: 'userInfoTest'
			});

			// when - then
			return expect(grant.token(env)('user', 'org')).to.eventually.eql('grantTest')
				.then(() => {
					calledOnce(issuerGetAsyncMock);
					calledWith(issuerGetAsyncMock, env.openidHTTPTimeout, env.openidIssuerURI);
					calledOnce(sharedConstructSignedJwtMock);
					calledWith(sharedConstructSignedJwtMock, {
						env,
						issuerClient: sinon.match.instanceOf(IssuerClientMock),
						userInfo: {
							['preferred_username']: 'user',
							['organization_id']: 'org'
						}
					});
					calledOnce(sharedObtainAuthorizationGrantMock);
					calledWith(sharedObtainAuthorizationGrantMock, 'testJwtResult');
				});

		});

	});

});
