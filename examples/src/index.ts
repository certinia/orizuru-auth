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

import { json, NextFunction, Request, Response, Server } from '@financialforcedev/orizuru';
import { flow } from '@financialforcedev/orizuru-auth';
import { Transport } from '@financialforcedev/orizuru-transport-rabbitmq';
import config from 'config';
import https from 'https';
import pem, { CertificateCreationResult } from 'pem';

// Define a function that creates a self-signed certificate
function createCertificate(): Promise<CertificateCreationResult> {
	return new Promise((resolve, reject) => {
		pem.createCertificate({ days: 1, selfSigned: true }, (err, result) => {
			if (err) {
				return reject(err);
			}
			process.stdout.write('Created certificate\n');
			return resolve(result);
		});
	});
}

// Define a simple error middleware
const errorMiddleware = (error: Error | undefined, req: Request, res: Response, next: NextFunction) => {
	if (error) {
		server.error(error);
		res.sendStatus(401);
	} else {
		next();
	}
};

// Create the server
const server = new Server({
	authProvider: {
		salesforce: config.get('app.authProvider.salesforce')
	},
	openid: {
		salesforce: config.get('app.openid.salesforce'),
		salesforceConnection: config.get('app.openid.salesforceConnection')
	},
	port: 8080,
	transport: new Transport({
		prefetch: 1,
		url: 'amqp://localhost'
	})
});

// Add listeners for the server error and info events
server.on(Server.ERROR, (message) => {
	process.stdout.write(`${message}\n`);
});

server.on(Server.INFO, (message) => {
	process.stdout.write(`${message}\n`);
});

// Add the route to generate the authorization URL (in this case we use 'test' as the state parameter)
server.addRoute({
	method: 'get',
	middleware: [
		json(),
		errorMiddleware
	],
	responseWriter: () => async (err: Error | undefined, req: Request, res: Response) => {
		const url = await flow.webServer.authorizationUrlGenerator(server.options.authProvider.salesforce)(server.options.openid.salesforce, server.options.openid.salesforce);
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

// Create a self-signed certificate and then start the server listening to connections using HTTPS
createCertificate().then((certificate) => {

	const serverOptions: https.ServerOptions = {
		cert: certificate.certificate,
		key: certificate.clientKey
	};

	const httpsServer = https.createServer(serverOptions, server.serverImpl);
	httpsServer.listen(server.options.port);
	process.stdout.write('Started server\n');

});
