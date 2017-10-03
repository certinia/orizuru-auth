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

let
	IssuerClientMock;

describe('shared/functions.js', () => {

	beforeEach(() => {
		IssuerClientMock = class {
			userinfo(accessToken) {
				return issuerClientUserInfoStub(accessToken);
			}
		};
	});

	afterEach(() => {
		sandbox.restore();
	});

	describe('constructSignedJwt', () => {

		let jsonwebtokenSignMock, issuerClient, user, clock;

		beforeEach(() => {
			jsonwebtokenSignMock = sandbox.stub(jsonwebtoken, 'sign');
			issuerClient = {};
			user = {
				username: 'testUsername'
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
			return expect(sharedFunctions.constructSignedJwt({ env, issuerClient, user }))
				.to.eventually.be.rejectedWith('Failed to sign authentication token')
				.then(() => {
					calledOnce(jsonwebtokenSignMock);
					calledWith(jsonwebtokenSignMock, {
						iss: env.openidClientId,
						aud: env.openidIssuerURI,
						sub: user.username,
						exp: 240
					}, env.jwtSigningKey, { algorithm: 'RS256' }, sinon.match.func);
				});

		});

		it('should resolve if jsonwebtoken sign returns a token', () => {

			// given
			jsonwebtokenSignMock.callsArgWith(3, null, 'token');

			// when - then
			return expect(sharedFunctions.constructSignedJwt({ env, issuerClient, user }))
				.to.eventually.eql({
					issuerClient,
					assertion: 'token'
				})
				.then(() => {
					calledOnce(jsonwebtokenSignMock);
					calledWith(jsonwebtokenSignMock, {
						iss: env.openidClientId,
						aud: env.openidIssuerURI,
						sub: user.username,
						exp: 240
					}, env.jwtSigningKey, { algorithm: 'RS256' }, sinon.match.func);
				});

		});

	});

	describe('obtainAuthorizationGrant', () => {

		let issuerClient, user;

		beforeEach(() => {
			issuerClient = {
				grant: sandbox.stub()
			};
			user = 'userTest';
		});

		it('should reject if issuerClient grant rejects', () => {

			// given 
			issuerClient.grant.rejects(new Error('Some error or other'));

			// when - then
			return expect(sharedFunctions.obtainAuthorizationGrant({ env, issuerClient, assertion: 'assertionTest', user }))
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
			return expect(sharedFunctions.obtainAuthorizationGrant({ env, issuerClient, assertion: 'assertionTest', user }))
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
			return expect(sharedFunctions.obtainAuthorizationGrant({ env, issuerClient, assertion: 'assertionTest', user }))
				.to.eventually.eql('test')
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
