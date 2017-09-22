'use strict';

const
	crypto = require('crypto'),

	openidClient = require('openid-client'),

	cache = {};

function createKey(httpTimeOut, openidIssuerUri) {
	return crypto.createHash('sha1').update(openidIssuerUri + '|' + httpTimeOut).digest('hex');
}

function buildIssuer(httpTimeOut, openidIssuerUri) {
	const issuer = openidClient.Issuer;
	issuer.defaultHttpOptions = {
		timeout: httpTimeOut
	};
	return issuer.discover(openidIssuerUri);
}

module.exports = {
	getAsync: (httpTimeOut, openidIssuerUri) => {
		const key = createKey(httpTimeOut, openidIssuerUri);
		if (!cache[key]) {
			return buildIssuer(httpTimeOut, openidIssuerUri)
				.then(issuer => {
					cache[key] = issuer;
					return issuer;
				});
		}
		return Promise.resolve(cache[key]);
	}
};
