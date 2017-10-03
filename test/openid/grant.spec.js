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
