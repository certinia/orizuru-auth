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

import config from 'config';
import debug, { Debugger } from 'debug';
import http from 'http';
import https from 'https';
import pem, { CertificateCreationResult } from 'pem';
import { SuperAgentRequest } from 'superagent';

import { ITransport, Server } from '@financialforcedev/orizuru';

import { Environment, EVENT_AUTHORIZATION_HEADER_SET, EVENT_DENIED, EVENT_GRANT_CHECKED, EVENT_TOKEN_VALIDATED, OpenIdOptions } from '../../src';

export interface TrustedSuperAgentRequest extends SuperAgentRequest {
	trustLocalhost: (toggle: boolean) => TrustedSuperAgentRequest;
}

export class TestServer extends Server {

	public httpsServer?: https.Server;

	private readonly setupDebugInstance: Debugger;

	constructor(providers: string[]) {

		const authProvider = providers.reduce((results, provider) => {
			results[provider] = config.get<Environment>(`authProvider.${provider}`);
			return results;
		}, {} as { [index: string]: Environment });

		const openid = providers.reduce((results, provider) => {
			results[provider] = config.get(`openid.${provider}`);
			return results;
		}, {} as { [index: string]: OpenIdOptions });

		super({
			authProvider,
			openid,
			port: 8080,
			transport: new Transport()
		});

		this.setupDebugInstance = debug('app:setup');
		const testdebugInstance = debug('app:test');

		// Add the listeners
		const setupEvents = [Server.ERROR, Server.INFO];
		setupEvents.map((event) => {
			this.on(event, (args) => {
				this.setupDebugInstance(args);
			});
		});

		const events = [EVENT_AUTHORIZATION_HEADER_SET, EVENT_DENIED, EVENT_GRANT_CHECKED, EVENT_TOKEN_VALIDATED];
		events.map((event) => {
			this.on(event, (args) => {
				testdebugInstance(args);
			});
		});

	}

	public async listen() {

		const certificate = await createCertificate();
		this.setupDebugInstance('Created certificate.');

		const serverOptions: https.ServerOptions = {
			cert: certificate.certificate,
			key: certificate.clientKey
		};

		this.httpsServer = https.createServer(serverOptions, this.serverImpl);
		this.httpsServer.listen(this.options.port);
		this.setupDebugInstance(`Server listening to connections on port: ${this.options.port}.`);

		return Promise.resolve(this.httpsServer as unknown as http.Server);

	}

	public async close() {
		if (this.httpsServer) {
			this.httpsServer.close();
		}
	}

}

/**
 * Create a dummy transport implementation
 */
class Transport implements ITransport {

	public async close() {
		// Do nothing
	}

	public async connect() {
		// Do nothing
	}

	public async publish(buffer: Buffer, options: Orizuru.Transport.IPublish) {
		return true;
	}

	public async subscribe() {
		// Do nothing
	}

}

function createCertificate(): Promise<CertificateCreationResult> {
	return new Promise((resolve, reject) => {
		pem.createCertificate({ commonName: 'localhost', days: 1, selfSigned: true }, (err, result) => {
			if (err) {
				return reject(err);
			}
			return resolve(result);
		});
	});
}
