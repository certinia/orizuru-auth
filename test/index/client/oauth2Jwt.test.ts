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

import { AxiosRequestConfig, AxiosResponse, default as axios } from 'axios';

import { AuthCodeGrantParams, AuthOptions, AuthUrlParams, Environment, GrantOptions, RefreshGrantParams } from '../../../src';
import * as jwt from '../../../src/index/client/oauth2Jwt/jwt';

import { JwtGrantParams, OAuth2JWTClient } from '../../../src/index/client/oauth2Jwt';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/client/oauth2Jwt', () => {

	let env: Environment;
	let client: OAuth2JWTClient;

	let axiosGetStub: SinonStub<[string, (AxiosRequestConfig | undefined)?]>;

	beforeEach(() => {

		env = {
			authorizationEndpoint: 'https://login.salesforce.com/services/oauth2/authorize',
			httpTimeout: 4001,
			issuerURI: 'https://login.salesforce.com',
			revocationEndpoint: 'https://login.salesforce.com/services/oauth2/revoke',
			tokenEndpoint: 'https://login.salesforce.com/services/oauth2/token',
			type: 'OAuth2JWT'
		};

		client = new OAuth2JWTClient(env);

		axiosGetStub = sinon.stub(axios, 'get');

	});

	afterEach(() => {
		sinon.restore();
	});

	describe('createAuthorizationUrl', () => {

		let params: AuthUrlParams;

		beforeEach(() => {

			params = {
				clientId: 'testClientId',
				redirectUri: 'https://test.app.com/auth/callback',
				scope: 'api'
			};

		});

		describe('should throw an error', () => {

			it('if the client has not been initialised', () => {

				// Given
				// When
				// Then
				expect(() => client.createAuthorizationUrl(params)).to.throw('OAuth2JWT client has not been initialized');

			});

			it('if the clientId has not been provided', async () => {

				// Given
				delete params.clientId;

				client = new OAuth2JWTClient(env);
				await client.init();

				// When
				// Then
				expect(() => client.createAuthorizationUrl(params)).to.throw('Missing required string parameter: clientId');

			});

			it('if the redirectUri has not been provided', async () => {

				// Given
				delete params.redirectUri;

				client = new OAuth2JWTClient(env);
				await client.init();

				// When
				// Then
				expect(() => client.createAuthorizationUrl(params)).to.throw('Missing required string parameter: redirectUri');

			});

			it('if the scopes have not been provided', async () => {

				// Given
				delete params.scope;

				client = new OAuth2JWTClient(env);
				await client.init();

				// When
				// Then
				expect(() => client.createAuthorizationUrl(params)).to.throw('Missing required string parameter: scope');

			});

		});

		it('should return an authorization url excluding the state', async () => {

			// Given
			await client.init();

			// When
			const authorizationUrl = client.createAuthorizationUrl(params);

			// Then
			expect(authorizationUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?client_id=testClientId&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&response_type=code&scope=api');

		});

		it('should return an authorization url including the state', async () => {

			// Given
			await client.init();

			const opts: AuthOptions = {
				state: 'testState'
			};

			// When
			const authorizationUrl = client.createAuthorizationUrl(params, opts);

			// Then
			expect(authorizationUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?client_id=testClientId&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&response_type=code&scope=api&state=testState');

		});

		it('should handle spaces in the scopes parameter', async () => {

			// Given
			await client.init();

			params.scope = 'api id';

			// When
			const authorizationUrl = client.createAuthorizationUrl(params);

			// Then
			expect(authorizationUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?client_id=testClientId&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&response_type=code&scope=api%20id');

		});

	});

	describe('getType', () => {

		it('should return the type', () => {

			// Given
			// When
			const type = client.getType();

			// Then
			expect(type).to.eql('OAuth2JWT');

		});

	});

	describe('grant', () => {

		let postResponse: AxiosResponse;

		beforeEach(() => {

			postResponse = {
				config: {},
				data: {
					access_token: '2YotnFZFEjr1zCsicMWpAA',
					expires_in: 3600,
					refresh_token: 'tGzv3JOkF0XG5Qx2TlKWIA',
					token_type: 'Bearer'
				},
				headers: {},
				status: 200,
				statusText: 'OK'
			};

			sinon.stub(axios, 'post').resolves(postResponse);

		});

		describe('should throw an error', () => {

			describe('if the grant_type is authorization code', () => {

				let params: AuthCodeGrantParams;

				beforeEach(() => {

					params = {
						clientId: 'testClientId',
						code: 'testCode',
						grantType: 'authorization_code'
					};

				});

				it('and the client has not been initialised', async () => {

					// Given
					// When
					// Then
					await expect(client.grant(params)).to.eventually.be.rejectedWith('OAuth2JWT client has not been initialized');

				});

				it('the client secret is being used and the clientId is not provided', async () => {

					// Given
					await client.init();

					delete params.clientId;

					// When
					// Then
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Missing required string parameter: clientId');

				});

				it('the client secret is being used and the client_secret is not provided', async () => {

					// Given
					await client.init();

					// When
					// Then
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Missing required string parameter: clientSecret');

				});

				it('and no code is provided', async () => {

					// Given
					delete params.code;

					await client.init();

					// When
					// Then
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Missing required string parameter: code');

				});

			});

			describe('if the grant_type is jwt bearer', () => {

				let params: JwtGrantParams;

				beforeEach(() => {

					params = {
						clientId: 'testClientId',
						grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
						signingSecret: 'testSigningSecret',
						user: {
							username: 'test@test.com'
						}
					};

				});

				it('and the user is not provided', async () => {

					// Given
					delete params.signingSecret;

					await client.init();

					sinon.stub(jwt, 'createJwtBearerGrantAssertion');

					// When
					// Then
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Missing required object parameter: signingSecret.');

					expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

				});

				it('and the user is not provided', async () => {

					// Given
					delete params.user;

					await client.init();

					sinon.stub(jwt, 'createJwtBearerGrantAssertion');

					// When
					// Then
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Missing required object parameter: user.');

					expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

				});

				it('and creating the grant assertion fails', async () => {

					// Given
					await client.init();

					sinon.stub(jwt, 'createJwtBearerGrantAssertion').rejects(new Error('Failed to sign grant assertion'));

					// When
					// Then
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Failed to sign grant assertion');

					expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
					expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, {
						clientId: 'testClientId',
						grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
						signingSecret: 'testSigningSecret',
						user: {
							username: 'test@test.com'
						}
					});

				});

				it('if the request fails', async () => {

					// Given
					await client.init();

					sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');

					postResponse.data = {
						error: 'invalid_client_id',
						error_description: 'client identifier invalid'
					};
					postResponse.status = 400;
					postResponse.statusText = 'BadRequest';

					// When
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Failed to obtain grant: invalid_client_id (client identifier invalid).');

					// Then
					expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
					expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, {
						clientId: 'testClientId',
						grantType: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
						signingSecret: 'testSigningSecret',
						user: {
							username: 'test@test.com'
						}
					});

					expect(axios.post).to.have.been.calledOnce;
					expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'assertion=signed&grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer', {
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						validateStatus: undefined
					});

				});

			});

			describe('if the grant_type is refresh token', () => {

				let params: RefreshGrantParams;

				beforeEach(() => {

					params = {
						clientId: 'testClientId',
						grantType: 'refresh_token',
						refreshToken: 'testRefreshToken'
					};

				});

				it('and no refresh token is provided', async () => {

					// Given
					delete params.refreshToken;

					await client.init();

					// When
					// Then
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Missing required string parameter: refreshToken');

				});

			});

		});

		describe('should return the access token response', () => {

			describe('if the grant_type is authorization code', () => {

				let params: AuthCodeGrantParams;

				beforeEach(() => {

					params = {
						clientId: 'testClientId',
						code: 'testCode',
						grantType: 'authorization_code'
					};

				});

				it('and the flow is using the client secret', async () => {

					// Given
					await client.init();

					const opts: GrantOptions = {
						clientSecret: 'testClientSecret',
						redirectUri: 'https://test.app.com/auth/callback'
					};

					// When
					await client.grant(params, opts);

					// Then
					expect(axios.post).to.have.been.calledOnce;
					expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'client_id=testClientId&client_secret=testClientSecret&code=testCode&grant_type=authorization_code&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback', {
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						validateStatus: undefined
					});

				});

			});

			describe('if the grant_type is refresh token', () => {

				let params: RefreshGrantParams;

				beforeEach(() => {

					params = {
						clientId: 'testClientId',
						grantType: 'refresh_token',
						refreshToken: 'testRefreshToken'
					};

				});

				it('and the flow is using the client secret', async () => {

					// Given
					await client.init();

					const opts: GrantOptions = {
						clientSecret: 'testClientSecret',
						redirectUri: 'https://test.app.com/auth/callback'
					};

					// When
					await client.grant(params, opts);

					// Then
					expect(axios.post).to.have.been.calledOnce;
					expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'client_id=testClientId&client_secret=testClientSecret&grant_type=refresh_token&refresh_token=testRefreshToken', {
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						validateStatus: undefined
					});

				});

			});

		});

	});

	describe('init', () => {

		describe('should throw an error', () => {

			it('if the authorizationEndpoint is not provided', async () => {

				// Given
				delete env.authorizationEndpoint;

				client = new OAuth2JWTClient(env);

				// When
				// Then
				await expect(client.init()).to.eventually.be.rejectedWith('Missing required string parameter: env[authorizationEndpoint]');

			});

			it('if the revocationEndpoint is not provided', async () => {

				// Given
				delete env.revocationEndpoint;

				client = new OAuth2JWTClient(env);

				// When
				// Then
				await expect(client.init()).to.eventually.be.rejectedWith('Missing required string parameter: env[revocationEndpoint]');

			});

			it('if the tokenEndpoint is not provided', async () => {

				// Given
				delete env.tokenEndpoint;

				client = new OAuth2JWTClient(env);

				// When
				// Then
				await expect(client.init()).to.eventually.be.rejectedWith('Missing required string parameter: env[tokenEndpoint]');

			});

		});

	});

	describe('revoke', () => {

		it('should throw an error if the client has not been initialised', async () => {

			// Given
			// When
			// Then
			await expect(client.revoke('testToken')).to.eventually.be.rejectedWith('OAuth2JWT client has not been initialized');

		});

		it('should revoke the given token using the post method by default', async () => {

			// Given
			await client.init();

			sinon.stub(axios, 'post').resolves({
				config: {},
				data: {},
				headers: {},
				status: 200,
				statusText: 'OK'
			});

			// When
			const result = await client.revoke('testToken');

			// Then
			expect(result).to.be.true;

			expect(axios.post).to.have.been.calledOnce;
			expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/revoke', 'token=testToken', {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				validateStatus: undefined
			});

		});

		it('should revoke the given token using the get method if the options set useGet to true', async () => {

			// Given
			await client.init();

			axiosGetStub.withArgs('https://login.salesforce.com/services/oauth2/revoke?token=testToken').resolves({
				config: {},
				data: {},
				headers: {},
				status: 200,
				statusText: 'OK'
			});

			// When
			const result = await client.revoke('testToken', { useGet: true });

			// Then
			expect(result).to.be.true;

			expect(axios.get).to.have.been.calledOnce;
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/revoke?token=testToken', {
				validateStatus: undefined
			});

		});

	});

});
