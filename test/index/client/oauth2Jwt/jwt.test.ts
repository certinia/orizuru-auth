/*
 * Copyright (c) 2019, FinancialForce.com, inc
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
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import { default as jsonwebtoken, Secret, SignCallback, SignOptions } from 'jsonwebtoken';
import { default as uuid } from 'uuid';

import { AuthCodeGrantParams, Environment, JwtGrantParams } from '../../../../src';

import { createJwtBearerClientAssertion, createJwtBearerGrantAssertion } from '../../../../src/index/client/oauth2Jwt/jwt';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/client/oauth2Jwt/jwt', () => {

	let env: Environment;
	let jwtSignStub: SinonStub<[string | object | Buffer, Secret, SignOptions, SignCallback], void>;

	beforeEach(() => {

		env = {
			httpTimeout: 4001,
			issuerURI: 'https://login.salesforce.com/',
			type: 'OpenID'
		};

		sinon.stub(Date, 'now').returns(1551521526000);
		sinon.stub(uuid, 'v4').returns(Buffer.from('579504df-90f7-49d0-af46-647980eeb22c'));
		jwtSignStub = sinon.stub(jsonwebtoken, 'sign');

	});

	afterEach(() => {
		sinon.restore();
	});

	describe('createJwtBearerClientAssertion', () => {

		let params: AuthCodeGrantParams;

		beforeEach(() => {

			params = {
				clientId: 'testOpenidClientId',
				code: 'testCode',
				grantType: 'authorization_code'
			};

		});

		describe('should throw an error', () => {

			it('if the client assertion cannot be signed', async () => {

				// Given
				jwtSignStub.yields(new Error('error'));

				// When
				await expect(createJwtBearerClientAssertion(params, 'testSigningSecret', 'https://login.salesforce.com/services/oauth2/token')).to.eventually.be.rejectedWith('Failed to sign client assertion.');

				// Then
				expect(jsonwebtoken.sign).to.have.been.calledOnce;
				expect(jsonwebtoken.sign).to.have.been.calledWith({
					aud: 'https://login.salesforce.com/services/oauth2/token',
					exp: 1551521766,
					iat: 1551521526,
					iss: 'testOpenidClientId',
					jti: '579504df-90f7-49d0-af46-647980eeb22c',
					sub: 'testOpenidClientId'
				}, 'testSigningSecret', { algorithm: 'RS256' }, sinon.match.func);

			});

			it('should return the signed client assertion', async () => {

				// Given
				jwtSignStub.yields(undefined, 'signed');

				// When
				const result = await createJwtBearerClientAssertion(params, 'testSigningSecret', 'https://login.salesforce.com/services/oauth2/token');

				// Then
				expect(result).to.eql('signed');

				expect(jsonwebtoken.sign).to.have.been.calledOnce;
				expect(jsonwebtoken.sign).to.have.been.calledWith({
					aud: 'https://login.salesforce.com/services/oauth2/token',
					exp: 1551521766,
					iat: 1551521526,
					iss: 'testOpenidClientId',
					jti: '579504df-90f7-49d0-af46-647980eeb22c',
					sub: 'testOpenidClientId'
				}, 'testSigningSecret', { algorithm: 'RS256' }, sinon.match.func);

			});

		});

	});

	describe('createJwtBearerGrantAssertion', () => {

		let params: JwtGrantParams;

		beforeEach(() => {

			params = {
				clientId: 'testOpenidClientId',
				grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
				signingSecret: 'testSigningSecret',
				user: {
					username: 'test@test.com'
				}
			};

		});

		describe('should throw an error', () => {

			it('if the grant assertion cannot be signed', async () => {

				// Given
				jwtSignStub.yields(new Error('error'));

				// When
				await expect(createJwtBearerGrantAssertion(env, params)).to.eventually.be.rejectedWith('Failed to sign grant assertion.');

				// Then
				expect(jsonwebtoken.sign).to.have.been.calledOnce;
				expect(jsonwebtoken.sign).to.have.been.calledWith({
					aud: 'https://login.salesforce.com/',
					exp: 1551521766,
					iat: 1551521526,
					iss: 'testOpenidClientId',
					jti: '579504df-90f7-49d0-af46-647980eeb22c',
					sub: 'test@test.com'
				}, 'testSigningSecret', { algorithm: 'RS256' }, sinon.match.func);

			});

			it('should return the signed grant assertion', async () => {

				// Given
				jwtSignStub.yields(undefined, 'signed');

				// When
				const result = await createJwtBearerGrantAssertion(env, params);

				// Then
				expect(result).to.eql('signed');

				expect(jsonwebtoken.sign).to.have.been.calledOnce;
				expect(jsonwebtoken.sign).to.have.been.calledWith({
					aud: 'https://login.salesforce.com/',
					exp: 1551521766,
					iat: 1551521526,
					iss: 'testOpenidClientId',
					jti: '579504df-90f7-49d0-af46-647980eeb22c',
					sub: 'test@test.com'
				}, 'testSigningSecret', { algorithm: 'RS256' }, sinon.match.func);

			});

		});

	});

});
