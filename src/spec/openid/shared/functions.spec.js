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

	sharedFunctions = require('../../../lib/openid/shared/functions'),
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
				.to.eventually.be.rejectedWith('Grant request failed: Some error or other')
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
				.to.eventually.be.rejectedWith('Grant request failed: No grant received.')
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
