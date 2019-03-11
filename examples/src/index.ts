// Imports
import { json, Request, Response, Server } from '@financialforcedev/orizuru';
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

// Add the route to generate the authorization URL (in this case we use 'test' as the state parameter)
server.addRoute({
	method: 'get',
	middleware: [
		json()
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

// **All code specified in the rest of the readme should be added here**

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
