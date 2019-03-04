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
import { Browser, launch } from 'puppeteer';
import sinon, { SinonStub } from 'sinon';
import sinonChai from 'sinon-chai';

import config from 'config';
import debug from 'debug';
import fs from 'fs';
import https from 'https';
import path from 'path';

import { json, Server, urlencoded } from '@financialforcedev/orizuru';
import { Transport } from '@financialforcedev/orizuru-transport-rabbitmq';

import { AuthOptions, Environment, EVENT_AUTHORIZATION_HEADER_SET, EVENT_DENIED, EVENT_GRANT_CHECKED, EVENT_TOKEN_VALIDATED, flow, grant, middleware, ResponseFormat, userInfo } from '../src/index';

const expect = chai.expect;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Suite 1', () => {

	let browser: Browser;
	let httpsServer: https.Server;
	let server: Server;
	let grantCheckerStub: SinonStub;

	before(() => {

		const debugInstance = debug('app');

		const connectionEnv = config.get<Environment>('openid.connection');
		const identityEnv = config.get<Environment>('openid.identity');

		const generateAuthorizationUrl = flow.webServer.authorizationUrlGenerator(identityEnv);
		const requestUserInfo = userInfo.createUserInfoRequester(identityEnv);

		grantCheckerStub = sinon.stub();

		server = new Server({
			auth: {
				jwtBearer: connectionEnv,
				webServer: identityEnv
			},
			port: 8080,
			transport: new Transport({
				prefetch: 1,
				url: 'amqp://localhost'
			})
		});

		// Add the listeners
		server.on(EVENT_AUTHORIZATION_HEADER_SET, (args) => {
			debugInstance(args);
		});

		server.on(EVENT_DENIED, (args) => {
			debugInstance(args);
		});

		server.on(EVENT_GRANT_CHECKED, (args) => {
			debugInstance(args);
		});

		server.on(EVENT_TOKEN_VALIDATED, (args) => {
			debugInstance(args);
		});

		server.addRoute({
			method: 'get',
			middleware: [
				json()
			],
			responseWriter: () => async (err, req, res) => {
				const opts: AuthOptions = {
					immediate: false,
					prompt: 'consent'
				};
				const url = await generateAuthorizationUrl('test', opts);
				res.redirect(url);
			},
			schema: {
				fields: [],
				name: 'auth',
				namespace: 'api.v1_0',
				type: 'record'
			},
			synchronous: true
		});

		server.addRoute({
			method: 'get',
			middleware: [
				urlencoded({
					extended: true
				}),
				middleware.authCallback(server),
				middleware.tokenValidator(server),
				grantCheckerStub,
				async (req, res, next) => {
					await grant.getToken(server.options.auth.jwtBearer)(req.orizuru!.user!);
					next();
				}
			],
			responseWriter: (app) => async (error, req, res) => {

				const token = req.headers.authorization!.replace('Bearer ', '');

				const result = await requestUserInfo(token, { responseFormat: ResponseFormat.JSON });
				res.send(`<html><body><div class="auth-finished"><pre>${JSON.stringify(result, undefined, '\t')}</pre></div></body></html>`);

			},
			schema: {
				fields: [],
				name: 'callback',
				namespace: 'api.auth.v1_0',
				type: 'record'
			},
			synchronous: true
		});

		// Run the `npm run create-local-certificate` command to generate the certificate.
		const serverOptions: https.ServerOptions = {
			cert: fs.readFileSync(path.resolve(__dirname, '../certificates/server/server.cert')),
			key: fs.readFileSync(path.resolve(__dirname, '../certificates/server/server.key'))
		};

		httpsServer = https.createServer(serverOptions, server.serverImpl);
		httpsServer.listen(server.options.port);

	});

	beforeEach(async () => {
		browser = await launch({
			headless: true,
			ignoreHTTPSErrors: true
		});
	});

	afterEach(() => {
		sinon.restore();
		browser.close();
	});

	after(() => {
		httpsServer.close();
	});

	it('should go through the login flow (app approved)', async () => {

		// Given
		const username = config.get<string>('test.username');
		const userId = config.get<string>('test.userId');
		const password = config.get<string>('test.password');

		sinon.spy(server, 'emit');

		grantCheckerStub.callsFake(async (req, res, next) => {
			await middleware.grantChecker(server)(req, res, next);
		});

		// When
		const page = await browser.newPage();

		await page.goto('https://localhost:8080/api/v1.0/auth');

		await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

		await page.type('#username', username);
		await page.type('#password', password);

		await Promise.all([
			page.click('#Login'),
			page.waitForSelector('[value=" Allow "]')
		]);

		await Promise.all([
			page.click('input#oaapprove'),
			page.waitForSelector('.auth-finished')
		]);

		// Then
		expect(server.emit).to.have.been.calledThrice;
		expect(server.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, `Authorization headers set for ${userId} (::1).`);
		expect(server.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, `Token validated for ${username} (::1).`);
		expect(server.emit).to.have.been.calledWithExactly(EVENT_GRANT_CHECKED, `Grant checked for ${username} (::1).`);

	});

	it('should go through the login flow (app denied)', async () => {

		// Given
		sinon.spy(server, 'emit');

		const username = config.get<string>('test.username');
		const password = config.get<string>('test.password');

		// When
		const page = await browser.newPage();

		await page.goto('https://localhost:8080/api/v1.0/auth');

		await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

		await page.type('#username', username);
		await page.type('#password', password);

		await Promise.all([
			page.click('#Login'),
			page.waitForSelector('[value=" Deny "]')
		]);

		await Promise.all([
			page.click('input#oadeny'),
			page.waitForNavigation({ waitUntil: 'domcontentloaded' })
		]);

		// Then
		expect(server.emit).to.not.have.been.called;

	});

	it('should go through the login flow (invalid grant)', async () => {

		// Given
		sinon.spy(server, 'emit');

		const username = config.get<string>('test.username');
		const userId = config.get<string>('test.userId');
		const password = config.get<string>('test.password');

		grantCheckerStub.callsFake(async (req, res, next) => {
			server.options.auth.jwtBearer = config.get<Environment>('openid.identity');
			await middleware.grantChecker(server)(req, res, next);
		});

		// When
		const page = await browser.newPage();

		await page.goto('https://localhost:8080/api/v1.0/auth');

		await page.waitForNavigation({ waitUntil: 'domcontentloaded' });

		await page.type('#username', username);
		await page.type('#password', password);

		await Promise.all([
			page.click('#Login'),
			page.waitForSelector('[value=" Allow "]')
		]);

		await Promise.all([
			page.click('input#oaapprove'),
			page.waitForResponse((res) => {
				if (res.status() === 401) {
					return true;
				}
				return false;
			})
		]);

		// Then
		expect(server.emit).to.have.been.calledThrice;
		expect(server.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, `Authorization headers set for ${userId} (::1).`);
		expect(server.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, `Token validated for ${username} (::1).`);
		expect(server.emit).to.have.been.calledWithExactly(EVENT_DENIED, `Access denied to: ::1. Error: Invalid grant for user (${username}). Caused by: Failed to obtain grant: invalid_grant (user hasn't approved this consumer).`);

	});

});
