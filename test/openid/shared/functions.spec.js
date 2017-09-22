'use strict';

const
	sinon = require('sinon'),
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),

	sharedFunctions = require('../../../src/openid/shared/functions'),
	jsonwebtoken = require('jsonwebtoken'),

	env = {
		openidClientId: 'testOpenidClientKey',
		openidIssuerURI: 'testOpenidIssuerUri',
		jwtSigningKey: 'testJwtSigningKey'
	},

	expect = chai.expect,
	assert = sinon.assert,
	calledOnce = assert.calledOnce,
	calledWith = assert.calledWith,

	sandbox = sinon.sandbox.create();

chai.use(chaiAsPromised);

describe('shared/functions.js', () => {

	afterEach(() => {
		sandbox.restore();
	});

	describe('constructSignedJwt', () => {

		let jsonwebtokenSignMock, issuerClient, userInfo, clock;

		beforeEach(() => {
			jsonwebtokenSignMock = sandbox.stub(jsonwebtoken, 'sign');
			issuerClient = {};
			userInfo = {
				['preferred_username']: 'testPreferred_username'
			};
			clock = sinon.useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
		});

		it('should reject if jsonwebtoken sign returns an error', () => {

			// given
			jsonwebtokenSignMock.callsArgWith(3, 'Some error or other', null);

			// when - then
			return expect(sharedFunctions.constructSignedJwt({ env, issuerClient, userInfo }))
				.to.eventually.be.rejectedWith('Failed to sign authentication token')
				.then(() => {
					calledOnce(jsonwebtokenSignMock);
					calledWith(jsonwebtokenSignMock, {
						iss: env.openidClientId,
						aud: env.openidIssuerURI,
						sub: userInfo.preferred_username,
						exp: 240
					}, env.jwtSigningKey, { algorithm: 'RS256' }, sinon.match.func);
				});

		});

		it('should resolve if jsonwebtoken sign returns a token', () => {

			// given
			jsonwebtokenSignMock.callsArgWith(3, null, 'token');

			// when - then
			return expect(sharedFunctions.constructSignedJwt({ env, issuerClient, userInfo }))
				.to.eventually.eql({
					env,
					issuerClient,
					assertion: 'token',
					userInfo
				})
				.then(() => {
					calledOnce(jsonwebtokenSignMock);
					calledWith(jsonwebtokenSignMock, {
						iss: env.openidClientId,
						aud: env.openidIssuerURI,
						sub: userInfo.preferred_username,
						exp: 240
					}, env.jwtSigningKey, { algorithm: 'RS256' }, sinon.match.func);
				});

		});

	});

	describe('obtainAuthorizationGrant', () => {

		let issuerClient, userInfo;

		beforeEach(() => {
			issuerClient = {
				grant: sandbox.stub()
			};
			userInfo = 'userInfoTest';
		});

		it('should reject if issuerClient grant rejects', () => {

			// given 
			issuerClient.grant.rejects(new Error('Some error or other'));

			// when - then
			return expect(sharedFunctions.obtainAuthorizationGrant({ env, issuerClient, assertion: 'assertionTest', userInfo }))
				.to.eventually.be.rejectedWith('Grant request failed')
				.then(() => {
					issuerClient.grant.resolves('test');
					calledOnce(issuerClient.grant);
					calledWith(issuerClient.grant, {
						['grant_type']: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
						assertion: 'assertionTest'
					});
				});

		});

		it('should reject if issuerClient grant resolves with null', () => {

			// given 
			issuerClient.grant.resolves(null);

			// when - then
			return expect(sharedFunctions.obtainAuthorizationGrant({ env, issuerClient, assertion: 'assertionTest', userInfo }))
				.to.eventually.be.rejectedWith('Grant request failed')
				.then(() => {
					issuerClient.grant.resolves('test');
					calledOnce(issuerClient.grant);
					calledWith(issuerClient.grant, {
						['grant_type']: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
						assertion: 'assertionTest'
					});
				});

		});

		it('should resolve if issuerClient grant resolves', () => {

			// given 
			issuerClient.grant.resolves('test');

			// when - then
			return expect(sharedFunctions.obtainAuthorizationGrant({ env, issuerClient, assertion: 'assertionTest', userInfo }))
				.to.eventually.eql({
					env,
					grant: 'test',
					userInfo
				})
				.then(() => {
					issuerClient.grant.resolves('test');
					calledOnce(issuerClient.grant);
					calledWith(issuerClient.grant, {
						['grant_type']: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
						assertion: 'assertionTest'
					});
				});

		});

	});

});
