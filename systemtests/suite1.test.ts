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
import config from 'config';
import { Browser, BrowserContext, launch, Page } from 'puppeteer';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import superagent from 'superagent';

import { EVENT_AUTHORIZATION_HEADER_SET, EVENT_DENIED, EVENT_GRANT_CHECKED, EVENT_TOKEN_VALIDATED } from '../src/index';
import { TestServer, TrustedSuperAgentRequest } from './server/common';
import { createServer } from './server/salesforce';

const expect = chai.expect;
const fail = chai.assert.fail;

chai.use(sinonChai);

describe('Suite 1 - Puppeteer script for Salesforce authentication', () => {

	let accessToken: string;
	let browser: Browser;
	let context: BrowserContext;
	let page: Page;
	let server: TestServer;

	beforeAll(async () => {

		jest.setTimeout(30000);

		server = await createServer();

		browser = await launch({
			headless: true,
			ignoreHTTPSErrors: true
		});

		sinon.spy(server, 'emit');

		await server.listen();

	});

	beforeEach(async () => {
		context = await browser.createIncognitoBrowserContext();
		page = await context.newPage();
	});

	afterEach(async () => {
		await context.close();
		sinon.reset();
	});

	afterAll(async () => {
		await browser.close();
		await server.close();
		sinon.restore();
	});

	it('should approve the app to obtain an access token', async () => {

		// Given
		const userId = config.get<string>('test.salesforce.userId');
		const username = config.get<string>('test.salesforce.username');
		const password = config.get<string>('test.salesforce.password');

		await page.goto('https://localhost:8080/api/auth/v1.0/login');

		await page.waitForSelector('#username');

		await page.type('#username', username);
		await page.type('#password', password);

		await Promise.all([
			page.click('#Login'),
			page.waitForSelector('[value=" Allow "]')
		]);

		// When
		await Promise.all([
			page.click('input#oaapprove'),
			page.waitForNavigation()
		]);

		const contents = await page.content();
		const regex = new RegExp('<pre .*>(.*)</pre>');
		const matches = regex.exec(contents) as RegExpExecArray;

		// Then
		expect(matches).not.to.be.null;
		expect(matches).to.have.length(2);

		const headers = JSON.parse(matches.pop() as string);
		expect(headers).to.have.property('authorization').that.matches(/^Bearer .+$/);

		expect(server.emit).to.have.been.calledOnce;
		expect(server.emit).to.have.been.calledWithExactly(EVENT_AUTHORIZATION_HEADER_SET, `Authorization headers set for user (${userId}) [::1].`);

		accessToken = headers.authorization;

	});

	it('should validate the access token', async () => {

		// Given
		if (!accessToken) {
			fail('No access token');
		}

		const username = config.get<string>('test.salesforce.username');

		const request = superagent.get('https://localhost:8080/api/auth/v1.0/validateToken') as TrustedSuperAgentRequest;

		// When
		const response = await request.trustLocalhost(true)
			.set('Authorization', accessToken)
			.send({});

		// Then
		expect(response).to.have.property('status', 200);
		expect(response).to.have.property('body').that.eqls({
			user: {
				username
			}
		});

		expect(server.emit).to.have.been.calledOnce;
		expect(server.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, `Token validated for user (${username}) [::ffff:127.0.0.1].`);

	});

	it('should check the grant', async () => {

		// Given
		if (!accessToken) {
			fail('No access token');
		}

		const username = config.get<string>('test.salesforce.username');

		const request = superagent.get('https://localhost:8080/api/auth/v1.0/checkGrant') as TrustedSuperAgentRequest;

		// When
		const response = await request.trustLocalhost(true)
			.set('Authorization', accessToken)
			.send({});

		// Then
		expect(response).to.have.property('status', 200);
		expect(response).to.have.property('body').that.eqls({
			grantChecked: true,
			user: {
				username
			}
		});

		expect(server.emit).to.have.been.calledTwice;
		expect(server.emit).to.have.been.calledWithExactly(EVENT_TOKEN_VALIDATED, `Token validated for user (${username}) [::ffff:127.0.0.1].`);
		expect(server.emit).to.have.been.calledWithExactly(EVENT_GRANT_CHECKED, `Grant checked for user (${username}) [::ffff:127.0.0.1].`);

	});

	it('should revoke the token', async () => {

		// Given
		if (!accessToken) {
			fail('No access token');
		}

		const request = superagent.get('https://localhost:8080/api/auth/v1.0/revokeToken') as TrustedSuperAgentRequest;

		// When
		const response = await request.trustLocalhost(true)
			.set('Authorization', accessToken)
			.send({});

		// Then
		expect(response).to.have.property('status', 200);
		expect(response).to.have.property('body').that.eqls({
			tokenRevoked: true
		});

	});

	it('should deny the app and obtain a 401 response', async () => {

		// Given
		const username = config.get<string>('test.salesforce.username');
		const password = config.get<string>('test.salesforce.password');

		await page.goto('https://localhost:8080/api/auth/v1.0/login');

		await page.waitForSelector('#username');

		await page.type('#username', username);
		await page.type('#password', password);

		await Promise.all([
			page.click('#Login'),
			page.waitForSelector('[value=" Allow "]')
		]);

		// When
		await Promise.all([
			page.click('input#oadeny'),
			page.waitForResponse((res) => {
				if (res.status() === 401) {
					return true;
				}
				return false;
			})
		]);

		// Then
		expect(server.emit).to.have.been.calledOnce;
		expect(server.emit).to.have.been.calledWithExactly(EVENT_DENIED, 'Access denied to: ::1. Error: access_denied');

	});

});
