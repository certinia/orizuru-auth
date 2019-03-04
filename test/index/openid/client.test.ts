/**
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

import { AxiosResponse, default as axios } from 'axios';

import { Environment, GrantOptions } from '../../../src';
import * as identity from '../../../src/index/openid/client/identity';
import * as jwt from '../../../src/index/openid/client/jwt';

import { OpenIdClient } from '../../../src/index/openid/client';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('index/openid/client', () => {

	let env: Environment;
	let openidClient: OpenIdClient;

	let axiosGetStub: SinonStub;

	beforeEach(() => {

		env = {
			jwtSigningKey: 'testJwtSigningKey',
			openidClientId: 'testOpenidClientId',
			openidClientSecret: 'testOpenidClientSecret',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'https://login.salesforce.com/',
			redirectUri: 'https://test.app.com/auth/callback'
		};

		openidClient = new OpenIdClient(env);

		axiosGetStub = sinon.stub(axios, 'get').withArgs('https://login.salesforce.com/.well-known/openid-configuration', { timeout: 4001 }).resolves({
			config: {},
			data: {
				authorization_endpoint: 'https://login.salesforce.com/services/oauth2/authorize',
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

		describe('should throw an error', () => {

			it('if the client has not been initialised', () => {

				// Given
				// When
				// Then
				expect(() => openidClient.createAuthorizationUrl({
					redirect_uri: 'testRedirectUri',
					state: 'testState'
				})).to.throw('OpenID client has not been initialized');

			});

		});

		it('should return the authorization url using the enviroment redirect uri', async () => {

			// Given
			await openidClient.init();

			// When
			const authorizationUrl = openidClient.createAuthorizationUrl({
				state: 'testState'
			});

			// Then
			expect(authorizationUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?client_id=testOpenidClientId&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&response_type=code&state=testState');

		});

		it('should return the authorization url using the specified redirect uri', async () => {

			// Given
			await openidClient.init();

			// When
			const authorizationUrl = openidClient.createAuthorizationUrl({
				redirect_uri: 'testRedirectUri',
				state: 'testState'
			});

			// Then
			expect(authorizationUrl).to.eql('https://login.salesforce.com/services/oauth2/authorize?client_id=testOpenidClientId&redirect_uri=testRedirectUri&response_type=code&state=testState');

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

			it('if the client has not been initialised', async () => {

				// Given
				// When
				// Then
				await expect(openidClient.grant({
					grantType: 'jwt',
					user: {
						username: 'test@test.com'
					}
				})).to.eventually.be.rejectedWith('OpenID client has not been initialized');

			});

			it('if the grant_type is authorization code and no code is provided', async () => {

				// Given
				await openidClient.init();

				// When
				// Then
				await expect(openidClient.grant({
					grantType: 'auth'
				})).to.eventually.be.rejectedWith('Missing required string parameter: code');

			});

			it('if the grant_type is authorization code and no redirect uri is provided', async () => {

				// Given
				delete env.redirectUri;

				openidClient = new OpenIdClient(env);
				await openidClient.init();

				// When
				// Then
				await expect(openidClient.grant({
					code: 'testCode',
					grantType: 'auth'
				})).to.eventually.be.rejectedWith('Missing required string parameter: redirectUri');

			});

			it('if the grant_type is refresh token and no refresh token is provided', async () => {

				// Given
				await openidClient.init();

				// When
				// Then
				await expect(openidClient.grant({
					grantType: 'refresh'
				})).to.eventually.be.rejectedWith('Missing required string parameter: refresh_token');

			});

			it('if the grant_type is jwt bearer the user is not provided', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerGrantAssertion').rejects(new Error('Failed to sign grant assertion'));

				// When
				// Then
				await expect(openidClient.grant({
					grantType: 'jwt'
				})).to.eventually.be.rejectedWith('Missing required object parameter: user.');

				expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

			});

			it('if the grant_type is jwt bearer and creating the grant assertion fails', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerGrantAssertion').rejects(new Error('Failed to sign grant assertion'));

				// When
				// Then
				await expect(openidClient.grant({
					grantType: 'jwt',
					user: {
						username: 'test@test.com'
					}
				})).to.eventually.be.rejectedWith('Failed to sign grant assertion');

				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, {
					username: 'test@test.com'
				});

			});

			it('if the grant_type is authorization code and creating the client assertion fails', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerClientAssertion').rejects(new Error('Failed to sign client assertion'));

				// When
				// Then
				await expect(openidClient.grant({
					code: 'testCode',
					grantType: 'auth',
					redirectUri: 'testRedirectUri'
				})).to.eventually.be.rejectedWith('Failed to sign client assertion');

				expect(jwt.createJwtBearerClientAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerClientAssertion).to.have.been.calledWithExactly(env, 'https://login.salesforce.com/services/oauth2/token');

			});

			it('if the request fails', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');

				postResponse.data = {
					error: 'invalid_client_id',
					error_description: 'client identifier invalid'
				};
				postResponse.status = 400;
				postResponse.statusText = 'BadRequest';

				// When
				await expect(openidClient.grant({
					grantType: 'jwt',
					user: {
						username: 'test@test.com'
					}
				})).to.eventually.be.rejectedWith('Failed to obtain grant: invalid_client_id (client identifier invalid).');

				// Then
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, {
					username: 'test@test.com'
				});

				expect(axios.post).to.have.been.calledOnce;
				expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signed', {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					validateStatus: undefined
				});

			});

			it('if the id token cannot be decoded', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');
				sinon.stub(identity, 'decodeIdToken').throws(new Error('No id_token present'));

				// When
				await expect(openidClient.grant({
					grantType: 'jwt',
					user: {
						username: 'test@test.com'
					}
				})).to.eventually.be.rejectedWith('Failed to obtain grant: No id_token present.');

				// Then
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, {
					username: 'test@test.com'
				});

				expect(axios.post).to.have.been.calledOnce;
				expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signed', {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					validateStatus: undefined
				});

				expect(identity.decodeIdToken).to.have.been.calledOnce;
				expect(identity.decodeIdToken).to.have.been.calledWithExactly(postResponse.data);

			});

			it('if the signature cannot be verified', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');
				sinon.stub(identity, 'verifySignature').throws(new Error('Invalid signature'));

				// When
				await expect(openidClient.grant({
					grantType: 'jwt',
					user: {
						username: 'test@test.com'
					}
				}, { decodeIdToken: false })).to.eventually.be.rejectedWith('Failed to obtain grant: Invalid signature.');

				// Then
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, {
					username: 'test@test.com'
				});

				expect(axios.post).to.have.been.calledOnce;
				expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signed', {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					validateStatus: undefined
				});

				expect(identity.verifySignature).to.have.been.calledOnce;
				expect(identity.verifySignature).to.have.been.calledWithExactly(env, postResponse.data);

			});

			it('if the signature cannot be verified', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerGrantAssertion').resolves('signed');
				sinon.stub(identity, 'parseUserInfo').throws(new Error('No id present'));

				// When
				await expect(openidClient.grant({
					grantType: 'jwt',
					user: {
						username: 'test@test.com'
					}
				}, { decodeIdToken: false, verifySignature: false })).to.eventually.be.rejectedWith('Failed to obtain grant: No id present.');

				// Then
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerGrantAssertion).to.have.been.calledWithExactly(env, {
					username: 'test@test.com'
				});

				expect(axios.post).to.have.been.calledOnce;
				expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=signed', {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					validateStatus: undefined
				});

				expect(identity.parseUserInfo).to.have.been.calledOnce;
				expect(identity.parseUserInfo).to.have.been.calledWithExactly(postResponse.data);

			});

		});

		describe('should return the access token response', () => {

			it('for an authorization code flow using the client secret', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerClientAssertion');
				sinon.stub(jwt, 'createJwtBearerGrantAssertion');
				sinon.stub(identity, 'decodeIdToken');
				sinon.stub(identity, 'parseUserInfo');
				sinon.stub(identity, 'verifySignature');

				// When
				await openidClient.grant({
					code: 'testCode',
					grantType: 'auth'
				}, { useJwt: false });

				// Then
				expect(axios.post).to.have.been.calledOnce;
				expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'grant_type=authorization_code&code=testCode&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&client_id=testOpenidClientId&client_secret=testOpenidClientSecret', {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					validateStatus: undefined
				});

				expect(identity.decodeIdToken).to.have.been.calledOnce;
				expect(identity.decodeIdToken).to.have.been.calledWithExactly(postResponse.data);
				expect(identity.parseUserInfo).to.have.been.calledOnce;
				expect(identity.parseUserInfo).to.have.been.calledWithExactly(postResponse.data);
				expect(identity.verifySignature).to.have.been.calledOnce;
				expect(identity.verifySignature).to.have.been.calledWithExactly(env, postResponse.data);

				expect(jwt.createJwtBearerClientAssertion).to.not.have.been.called;
				expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

			});

			it('for an authorization code flow using the client assertion', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerClientAssertion').resolves('signed');
				sinon.stub(jwt, 'createJwtBearerGrantAssertion');
				sinon.stub(identity, 'decodeIdToken');
				sinon.stub(identity, 'parseUserInfo');
				sinon.stub(identity, 'verifySignature');

				const opts: GrantOptions = {
					decodeIdToken: false,
					parseUserInfo: false,
					verifySignature: false
				};

				// When
				await openidClient.grant({
					code: 'testCode',
					grantType: 'auth'
				}, opts);

				// Then
				expect(jwt.createJwtBearerClientAssertion).to.have.been.calledOnce;
				expect(jwt.createJwtBearerClientAssertion).to.have.been.calledWithExactly(env, 'https://login.salesforce.com/services/oauth2/token');

				expect(axios.post).to.have.been.calledOnce;
				expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'grant_type=authorization_code&code=testCode&redirect_uri=https%3A%2F%2Ftest.app.com%2Fauth%2Fcallback&client_id=testOpenidClientId&client_assertion_type=urn%3Aietf%3Aparams%3Aoauth%3Aclient-assertion-type%3Ajwt-bearer&client_assertion=signed', {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					validateStatus: undefined
				});

				expect(identity.decodeIdToken).to.not.have.been.called;
				expect(identity.parseUserInfo).to.not.have.been.called;
				expect(identity.verifySignature).to.not.have.been.called;
				expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

			});

			it('for a refresh token flow using the client secret', async () => {

				// Given
				await openidClient.init();

				sinon.stub(jwt, 'createJwtBearerClientAssertion');
				sinon.stub(jwt, 'createJwtBearerGrantAssertion');
				sinon.stub(identity, 'decodeIdToken');
				sinon.stub(identity, 'parseUserInfo');
				sinon.stub(identity, 'verifySignature');

				// When
				await openidClient.grant({
					grantType: 'refresh',
					refreshToken: 'testRefreshToken'
				}, { useJwt: false });

				// Then
				expect(axios.post).to.have.been.calledOnce;
				expect(axios.post).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/token', 'grant_type=refresh_token&refresh_token=testRefreshToken&client_id=testOpenidClientId&client_secret=testOpenidClientSecret', {
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded'
					},
					validateStatus: undefined
				});

				expect(identity.decodeIdToken).to.have.been.calledOnce;
				expect(identity.decodeIdToken).to.have.been.calledWithExactly(postResponse.data);
				expect(identity.parseUserInfo).to.have.been.calledOnce;
				expect(identity.parseUserInfo).to.have.been.calledWithExactly(postResponse.data);
				expect(identity.verifySignature).to.have.been.calledOnce;
				expect(identity.verifySignature).to.have.been.calledWithExactly(env, postResponse.data);

				expect(jwt.createJwtBearerClientAssertion).to.not.have.been.called;
				expect(jwt.createJwtBearerGrantAssertion).to.not.have.been.called;

			});

		});

	});

	describe('revoke', () => {

		it('should throw an error if the client has not been initialised', async () => {

			// Given
			// When
			// Then
			await expect(openidClient.revoke('testToken')).to.eventually.be.rejectedWith('OpenID client has not been initialized');

		});

		it('should revoke the given token using the post method by default', async () => {

			// Given
			await openidClient.init();

			sinon.stub(axios, 'post').resolves({
				config: {},
				data: {},
				headers: {},
				status: 200,
				statusText: 'OK'
			});

			// When
			const result = await openidClient.revoke('testToken');

			// Then
			expect(result).to.be.true;

			expect(axios.get).to.have.been.calledOnce;
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/.well-known/openid-configuration', { timeout: 4001 });

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
			await openidClient.init();

			axiosGetStub.withArgs('https://login.salesforce.com/services/oauth2/revoke?token=testToken').resolves({
				config: {},
				data: {},
				headers: {},
				status: 200,
				statusText: 'OK'
			});

			// When
			const result = await openidClient.revoke('testToken', { useGet: true });

			// Then
			expect(result).to.be.true;

			expect(axios.get).to.have.been.calledTwice;
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/.well-known/openid-configuration', { timeout: 4001 });
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/revoke?token=testToken', {
				validateStatus: undefined
			});

		});

	});

	describe('userinfo', () => {

		it('should throw an error if the client has not been initialised', async () => {

			// Given
			// When
			// Then
			await expect(openidClient.userinfo('testToken')).to.eventually.be.rejectedWith('OpenID client has not been initialized');

		});

		it('should throw an error if the request fails', async () => {

			// Given
			await openidClient.init();

			axiosGetStub.withArgs('https://login.salesforce.com/services/oauth2/userinfo').resolves({
				config: {},
				data: 'Bad_OAuth_Token',
				headers: {},
				status: 400,
				statusText: 'Bad Request'
			});

			// When
			// Then
			await expect(openidClient.userinfo('testToken')).to.eventually.be.rejectedWith('Failed to obtain user information: Bad_OAuth_Token.');

		});

		it('should obtain the user information and return the user', async () => {

			// Given
			await openidClient.init();

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
			const result = await openidClient.userinfo('testToken');

			// Then
			expect(result).to.eql({
				organization_id: '00Dxx0000001gPLEAY',
				preferred_username: 'test@test.com'
			});

			expect(axios.get).to.have.been.calledTwice;
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/.well-known/openid-configuration', { timeout: 4001 });
			expect(axios.get).to.have.been.calledWithExactly('https://login.salesforce.com/services/oauth2/userinfo', {
				headers: {
					Accept: 'application/json',
					Authorization: `Bearer testToken`
				},
				validateStatus: undefined
			});

		});

	});

});
