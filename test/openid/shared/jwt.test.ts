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

import jsonwebtoken from 'jsonwebtoken';
import openidClient from 'openid-client';
import uuid from 'uuid';

import { Options } from '../../../src';

import { createJwtBearerClientAssertion, createJwtBearerGrantAssertion } from '../../../src/openid/shared/jwt';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('openid/shared/jwt.ts', () => {

	const env: Options.Auth = {
		jwtSigningKey: 'testJwtSigningKey',
		openidClientId: 'testOpenidClientKey',
		openidHTTPTimeout: 2000,
		openidIssuerURI: 'testOpenidIssuerUri'
	};

	afterEach(() => {
		sinon.restore();
	});

	describe('createJwtBearerClientAssertion', () => {

		const issuer = {
			token_endpoint: 'testTokenEndpoint'
		};

		let clock: any;

		beforeEach(() => {
			clock = sinon.useFakeTimers();
		});

		afterEach(() => {
			clock.restore();
			sinon.restore();
		});

		it('should reject if jsonwebtoken sign returns an error', () => {

			// Given
			sinon.stub(uuid, 'v4').returns('testId');
			sinon.stub(jsonwebtoken, 'sign').rejects('error');

			// When
			return expect(createJwtBearerClientAssertion(env, issuer as openidClient.Issuer))
				.to.eventually.be.rejectedWith('Failed to sign client assertion')
				.then(() => {
					// Then
					expect(jsonwebtoken.sign).to.have.been.calledOnce;
					expect(jsonwebtoken.sign).to.have.been.calledWith({
						aud: 'testTokenEndpoint',
						exp: 240,
						iss: env.openidClientId,
						jti: 'testId',
						sub: env.openidClientId
					}, env.jwtSigningKey, { algorithm: 'RS256' });
				});

		});

		it('should resolve if jsonwebtoken sign returns a token', () => {

			// Given
			sinon.stub(uuid, 'v4').returns('testId');
			sinon.stub(jsonwebtoken, 'sign').resolves('token');

			// When
			return expect(createJwtBearerClientAssertion(env, issuer as openidClient.Issuer))
				.to.eventually.eql('token')
				.then(() => {
					// Then
					expect(jsonwebtoken.sign).to.have.been.calledOnce;
					expect(jsonwebtoken.sign).to.have.been.calledWith({
						aud: 'testTokenEndpoint',
						exp: 240,
						iss: env.openidClientId,
						jti: 'testId',
						sub: env.openidClientId
					}, env.jwtSigningKey, { algorithm: 'RS256' });
				});

		});

	});

	describe('createJwtBearerGrantAssertion', () => {

		let user: any;
		let clock: any;

		beforeEach(() => {

			user = {
				username: 'testUsername'
			};
			clock = sinon.useFakeTimers();

		});

		afterEach(() => {
			clock.restore();
			sinon.restore();
		});

		it('should reject if jsonwebtoken sign returns an error', () => {

			// Given
			sinon.stub(jsonwebtoken, 'sign').rejects('error');

			// When
			return expect(createJwtBearerGrantAssertion(env, user))
				.to.eventually.be.rejectedWith('Failed to sign grant assertion')
				.then(() => {
					// Then
					expect(jsonwebtoken.sign).to.have.been.calledOnce;
					expect(jsonwebtoken.sign).to.have.been.calledWith({
						aud: env.openidIssuerURI,
						exp: 240,
						iss: env.openidClientId,
						sub: user.username
					}, env.jwtSigningKey, { algorithm: 'RS256' });
				});

		});

		it('should resolve if jsonwebtoken sign returns a token', () => {

			// Given
			sinon.stub(jsonwebtoken, 'sign').resolves('token');

			// When
			return expect(createJwtBearerGrantAssertion(env, user))
				.to.eventually.eql('token')
				.then(() => {
					// Then
					expect(jsonwebtoken.sign).to.have.been.calledOnce;
					expect(jsonwebtoken.sign).to.have.been.calledWith({
						aud: env.openidIssuerURI,
						exp: 240,
						iss: env.openidClientId,
						sub: user.username
					}, env.jwtSigningKey, { algorithm: 'RS256' });
				});

		});

	});

});
