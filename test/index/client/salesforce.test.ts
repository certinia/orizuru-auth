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

import { AuthCodeGrantParams, AuthOptions, AuthUrlParams, Environment, GrantOptions, IntrospectionOptions, JwtGrantParams, RefreshGrantParams } from '../../../src';
import * as jwt from '../../../src/index/client/oauth2Jwt/jwt';
import * as openidIdentity from '../../../src/index/client/openid/identity';
import * as salesforceIdentity from '../../../src/index/client/salesforce/identity';

import { SalesforceClient } from '../../../src/index/client/salesforce';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/client/salesforce', () => {

	let env: Environment;
	let client: SalesforceClient;

	let axiosGetStub: SinonStub<[string, (AxiosRequestConfig | undefined)?]>;

	beforeEach(() => {

		env = {
			httpTimeout: 4001,
			issuerURI: 'https://login.salesforce.com/',
			type: 'Salesforce'
		};

		client = new SalesforceClient(env);

		axiosGetStub = sinon.stub(axios, 'get').withArgs('https://login.salesforce.com/.well-known/openid-configuration', sinon.match.object).resolves({
			config: {},
			data: {
				authorization_endpoint: 'https://login.salesforce.com/services/oauth2/authorize',
				introspection_endpoint: 'https://login.salesforce.com/services/oauth2/introspect',
				issuer: 'https://login.salesforce.com',
				revocation_endpoint: 'https://login.salesforce.com/services/oauth2/revoke',
				token_endpoint: 'https://login.salesforce.com/services/oauth2/token',
				userinfo_endpoint: 'https://login.salesforce.com/services/oauth2/userinfo'
			},
			headers: {},
			status: 200,
			statusText: 'OK'
		});

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
				scope: 'openid'
			};

		});

		describe('should throw an error', () => {

			it('if the client has not been initialised', () => {

				// Given
				// When
				// Then
				expect(() => client.createAuthorizationUrl(params)).to.throw('Salesforce client has not been initialized');

			});

			it('if the clientId has not been provided', async () => {

				// Given
				delete params.clientId;

				client = new SalesforceClient(env);
				await client.init();

				// When
				// Then
				expect(() => client.createAuthorizationUrl(params)).to.throw('Missing required string parameter: clientId');

			});

			it('if the redirectUri has not been provided', async () => {

				// Given
				delete params.redirectUri;

				client = new SalesforceClient(env);
				await client.init();

				// When
				// Then
				expect(() => client.createAuthorizationUrl(params)).to.throw('Missing required string parameter: redirectUri');

			});

		});

		it('should return an authorization url excluding the state', async () => {

			// Given
			await client.init();

			// When
			const authorizationUrl = client.createAuthorizationUrl(params);

			// Then
			expect(authorizationUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?client_id=testClientId&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&response_type=code&scope=openid');

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
			expect(authorizationUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?client_id=testClientId&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&response_type=code&scope=openid&state=testState');

		});

		it('should handle spaces in the scopes parameter', async () => {

			// Given
			await client.init();

			params.scope = 'api openid';

			// When
			const authorizationUrl = client.createAuthorizationUrl(params);

			// Then
			expect(authorizationUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?client_id=testClientId&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&response_type=code&scope=api%20openid');

		});

	});

	describe('getType', () => {

		it('should return the type', () => {

			// Given
			// When
			const type = client.getType();

			// Then
			expect(type).to.eql('Salesforce');

		});

	});

	describe('grant', () => {

		let postResponse: AxiosResponse;

		beforeEach(() => {

			postResponse = {
				config: {},
				data: {
					access_token: '00Dx0000000BV7z!AR8AQP0jITN80ESEsj5EbaZTFG0RNBaT1cyWk7TrqoDjoNIWQ2ME_sTZzBjfmOE6zMHq6y8PIW4eWze9JksNEkWUl.Cju7m4',
					id: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					instance_url: 'https://yourInstance.salesforce.com/',
					issued_at: '1278448384422',
					scope: 'id api refresh_token',
					signature: 'R9e8hftsV8AqMd5M3ddTXsXNr6NwHoye4VeNY8Tqs44=',
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
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Salesforce client has not been initialized');

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

				it('and creating the client assertion fails', async () => {

					// Given
					await client.init();

					sinon.stub(jwt, 'createJwtBearerClientAssertion').rejects(new Error('Failed to sign client assertion'));

					// When
					// Then
					await expect(client.grant(params, { signingSecret: 'testSigningSecret' })).to.eventually.be.rejectedWith('Failed to sign client assertion');

					expect(jwt.createJwtBearerClientAssertion).to.have.been.calledOnce;
					expect(jwt.createJwtBearerClientAssertion).to.have.been.calledWithExactly(params, 'testSigningSecret', 'https://login.salesforce.com/services/oauth2/token');

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
						validateStatus: sinon.match.func
					});

				});

				it('if the id token cannot be decoded', async () => {

					// Given
					await client.init();

					sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');
					sinon.stub(openidIdentity, 'decodeIdToken').throws(new Error('No id_token present'));

					// When
					await expect(client.grant(params)).to.eventually.be.rejectedWith('Failed to obtain grant: No id_token present.');

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
						validateStatus: sinon.match.func
					});

					expect(openidIdentity.decodeIdToken).to.have.been.calledOnce;
					expect(openidIdentity.decodeIdToken).to.have.been.calledWithExactly(postResponse.data);

				});

				it('if the signature cannot be verified due to no client secret being provided', async () => {

					// Given
					await client.init();

					sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');
					sinon.stub(salesforceIdentity, 'verifySignature');

					const opts: GrantOptions = {
						decodeIdToken: false
					};

					// When
					await expect(client.grant(params, opts)).to.eventually.be.rejectedWith('Failed to obtain grant: Missing required string parameter: clientSecret.');

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
						validateStatus: sinon.match.func
					});

					expect(salesforceIdentity.verifySignature).to.have.not.been.called;

				});

				it('if the signature cannot be verified', async () => {

					// Given
					await client.init();

					sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');
					sinon.stub(salesforceIdentity, 'verifySignature').throws(new Error('Invalid signature'));

					const opts: GrantOptions = {
						clientSecret: 'testOpenidClientSecret',
						decodeIdToken: false
					};

					// When
					await expect(client.grant(params, opts)).to.eventually.be.rejectedWith('Failed to obtain grant: Invalid signature.');

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
						validateStatus: sinon.match.func
					});

					expect(salesforceIdentity.verifySignature).to.have.been.calledOnce;
					expect(salesforceIdentity.verifySignature).to.have.been.calledWithExactly('testOpenidClientSecret', postResponse.data);

				});

				it('if the signature cannot be verified', async () => {

					// Given
					await client.init();

					sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');
					sinon.stub(salesforceIdentity, 'parseUserInfo').throws(new Error('No id present'));

					const opts: GrantOptions = {
						decodeIdToken: false,
						signingSecret: 'test',
						verifySignature: false
					};

					// When
					await expect(client.grant(params, opts)).to.eventually.be.rejectedWith('Failed to obtain grant: No id present.');

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
						validateStatus: sinon.match.func
					});

					expect(salesforceIdentity.parseUserInfo).to.have.been.calledOnce;
					expect(salesforceIdentity.parseUserInfo).to.have.been.calledWithExactly(postResponse.data);

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

					sinon.stub(jwt, 'createJwtBearerClientAssertion');
					sinon.stub(jwt, 'createJwtBearerGrantAssertion');
					sinon.stub(openidIdentity, 'decodeIdToken');
					sinon.stub(salesforceIdentity, 'parseUserInfo');
					sinon.stub(salesforceIdentity, 'verifySignature');

					const opts: GrantOptions = {
						clientSecret: 'testOpenidClientSecret',
						redirectUri: 'https://test.app.com/auth/callback'
					};

					// When
					await client.grant(params, opts);

					// Then
					expect(axios.post).to.have.been.calledOnce;
					expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'client_id=testClientId&client_secret=testOpenidClientSecret&code=testCode&grant_type=authorization_code&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback', {
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						validateStatus: sinon.match.func
					});

					expect(openidIdentity.decodeIdToken).to.have.been.calledOnce;
					expect(openidIdentity.decodeIdToken).to.have.been.calledWithExactly(postResponse.data);
					expect(salesforceIdentity.parseUserInfo).to.have.been.calledOnce;
					expect(salesforceIdentity.parseUserInfo).to.have.been.calledWithExactly(postResponse.data);
					expect(salesforceIdentity.verifySignature).to.have.been.calledOnce;
					expect(salesforceIdentity.verifySignature).to.have.been.calledWithExactly('testOpenidClientSecret', postResponse.data);

					expect(jwt.createJwtBearerClientAssertion).to.not.have.been.called;
					expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

				});

				it('for an authorization code flow using the client assertion', async () => {

					// Given
					await client.init();

					sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');
					sinon.stub(jwt, 'createJwtBearerGrantAssertion');
					sinon.stub(openidIdentity, 'decodeIdToken');
					sinon.stub(salesforceIdentity, 'parseUserInfo');
					sinon.stub(salesforceIdentity, 'verifySignature');

					const opts: GrantOptions = {
						decodeIdToken: false,
						parseUserInfo: false,
						redirectUri: 'https://test.app.com/auth/callback',
						signingSecret: 'testSigningSecret',
						verifySignature: false
					};

					// When
					await client.grant(params, opts);

					// Then
					expect(jwt.createJwtBearerClientAssertion).to.have.been.calledOnce;
					expect(jwt.createJwtBearerClientAssertion).to.have.been.calledWithExactly(params, 'testSigningSecret', 'https://login.salesforce.com/services/oauth2/token');

					expect(axios.post).to.have.been.calledOnce;
					expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'client_assertion=signed&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_id=testClientId&code=testCode&grant_type=authorization_code&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback', {
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						validateStatus: sinon.match.func
					});

					expect(openidIdentity.decodeIdToken).to.not.have.been.called;
					expect(salesforceIdentity.parseUserInfo).to.not.have.been.called;
					expect(salesforceIdentity.verifySignature).to.not.have.been.called;
					expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

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

					sinon.stub(jwt, 'createJwtBearerClientAssertion');
					sinon.stub(jwt, 'createJwtBearerGrantAssertion');
					sinon.stub(openidIdentity, 'decodeIdToken');
					sinon.stub(salesforceIdentity, 'parseUserInfo');
					sinon.stub(salesforceIdentity, 'verifySignature');

					const opts: GrantOptions = {
						clientSecret: 'testOpenidClientSecret',
						redirectUri: 'https://test.app.com/auth/callback'
					};

					// When
					await client.grant(params, opts);

					// Then
					expect(axios.post).to.have.been.calledOnce;
					expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'client_id=testClientId&client_secret=testOpenidClientSecret&grant_type=refresh_token&refresh_token=testRefreshToken', {
						headers: {
							'Accept': 'application/json',
							'Content-Type': 'application/x-www-form-urlencoded'
						},
						validateStatus: sinon.match.func
					});

					expect(openidIdentity.decodeIdToken).to.have.been.calledOnce;
					expect(openidIdentity.decodeIdToken).to.have.been.calledWithExactly(postResponse.data);
					expect(salesforceIdentity.parseUserInfo).to.have.been.calledOnce;
					expect(salesforceIdentity.parseUserInfo).to.have.been.calledWithExactly(postResponse.data);
					expect(salesforceIdentity.verifySignature).to.have.been.calledOnce;
					expect(salesforceIdentity.verifySignature).to.have.been.calledWithExactly('testOpenidClientSecret', postResponse.data);

					expect(jwt.createJwtBearerClientAssertion).to.not.have.been.called;
					expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

				});

			});

		});

	});

	describe('introspect', () => {

		let opts: IntrospectionOptions;

		beforeEach(async () => {

			opts = {
				clientId: 'testClientId',
				clientSecret: 'testClientSecret',
				ip: '1.1.1.1',
				parseUserInfo: true
			};

			await client.init();

			sinon.stub(axios, 'post').resolves({
				config: {},
				data: {
					active: true,
					client_id: 'testClientId',
					exp: 1563209026,
					iat: 1563201826,
					nbf: 1563201826,
					scope: 'id api web full refresh_token openid',
					sub: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					token_type: 'access_token',
					username: 'test@test.com'
				},
				headers: {},
				status: 200,
				statusText: 'OK'
			});

		});

		it('should introspect the given token parsing the user info if parseUserInfo is true', async () => {

			// Given
			// When
			const result = await client.introspect('testToken', opts);

			// Then
			expect(result).to.eql({
				active: true,
				client_id: 'testClientId',
				exp: 1563209026,
				iat: 1563201826,
				nbf: 1563201826,
				scope: 'id api web full refresh_token openid',
				sub: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				token_type: 'access_token',
				userInfo: {
					id: '005xx000001SwiUAAS',
					organizationId: '00Dxx0000001gPLEAY',
					url: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
					validated: true
				},
				username: 'test@test.com'
			});

			expect(axios.post).to.have.been.calledOnce;
			expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/introspect', 'client_id=testClientId&client_secret=testClientSecret&token=testToken', {
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				validateStatus: sinon.match.func
			});

		});

		it('should introspect the given token not parsing the user info if parseUserInfo is false', async () => {

			// Given
			opts.parseUserInfo = false;

			// When
			const result = await client.introspect('testToken', opts);

			// Then
			expect(result).to.eql({
				active: true,
				client_id: 'testClientId',
				exp: 1563209026,
				iat: 1563201826,
				nbf: 1563201826,
				scope: 'id api web full refresh_token openid',
				sub: 'https://login.salesforce.com/id/00Dxx0000001gPLEAY/005xx000001SwiUAAS',
				token_type: 'access_token',
				username: 'test@test.com'
			});

			expect(axios.post).to.have.been.calledOnce;
			expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/introspect', 'client_id=testClientId&client_secret=testClientSecret&token=testToken', {
				headers: {
					'Accept': 'application/json',
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				validateStatus: sinon.match.func
			});

		});

	});

	describe('revoke', () => {

		it('should throw an error if the client has not been initialised', async () => {

			// Given
			// When
			// Then
			await expect(client.revoke('testToken')).to.eventually.be.rejectedWith('Salesforce client has not been initialized');

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

			expect(axios.get).to.have.been.calledOnce;
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/.well-known/openid-configuration', {
				timeout: 4001,
				validateStatus: sinon.match.func
			});

			expect(axios.post).to.have.been.calledOnce;
			expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/revoke', 'token=testToken', {
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				validateStatus: sinon.match.func
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

			expect(axios.get).to.have.been.calledTwice;
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/.well-known/openid-configuration', {
				timeout: 4001,
				validateStatus: sinon.match.func
			});
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/revoke?token=testToken', {
				validateStatus: sinon.match.func
			});

		});

	});

	describe('userinfo', () => {

		it('should throw an error if the client has not been initialised', async () => {

			// Given
			// When
			// Then
			await expect(client.userinfo('testToken')).to.eventually.be.rejectedWith('Salesforce client has not been initialized');

		});

		it('should throw an error if the request fails', async () => {

			// Given
			await client.init();

			axiosGetStub.withArgs('https://login.salesforce.com/services/oauth2/userinfo').resolves({
				config: {},
				data: 'Bad_OAuth_Token',
				headers: {},
				status: 400,
				statusText: 'Bad Request'
			});

			// When
			// Then
			await expect(client.userinfo('testToken')).to.eventually.be.rejectedWith('Failed to obtain user information: Bad_OAuth_Token.');

		});

		it('should obtain the user information and return the user', async () => {

			// Given
			await client.init();

			axiosGetStub.withArgs('https://login.salesforce.com/services/oauth2/userinfo').resolves({
				config: {},
				data: {
					organization_id: '00Dxx0000001gPLEAY',
					preferred_username: 'test@test.com'
				},
				headers: {},
				status: 200,
				statusText: 'OK'
			});

			// When
			const result = await client.userinfo('testToken');

			// Then
			expect(result).to.eql({
				organization_id: '00Dxx0000001gPLEAY',
				preferred_username: 'test@test.com'
			});

			expect(axios.get).to.have.been.calledTwice;
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/.well-known/openid-configuration', {
				timeout: 4001,
				validateStatus: sinon.match.func
			});
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/userinfo', {
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer testToken`
				},
				validateStatus: sinon.match.func
			});

		});

	});

});
