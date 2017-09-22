'use strict';

const

	_ = require('lodash'),

	validate = ({ jwtSigningKey, openidClientId, openidHTTPTimeout, openidIssuerURI }) => {

		if (jwtSigningKey === '') {
			throw new Error('Invalid parameter: jwtSigningKey cannot be empty.');
		}

		if (!jwtSigningKey) {
			throw new Error('Missing required parameter: jwtSigningKey.');
		}

		if (openidClientId === '') {
			throw new Error('Invalid parameter: openidClientId cannot be empty.');
		}

		if (!openidClientId) {
			throw new Error('Missing required parameter: openidClientId.');
		}

		if (!_.isInteger(openidHTTPTimeout)) {
			throw new Error('Invalid parameter: openidHTTPTimeout is not an integer.');
		}

		if (openidIssuerURI === '') {
			throw new Error('Invalid parameter: openidIssuerURI cannot be empty.');
		}

		if (!openidIssuerURI) {
			throw new Error('Missing required parameter: openidIssuerURI.');
		}

		return { jwtSigningKey, openidClientId, openidHTTPTimeout, openidIssuerURI };
	};

module.exports = {
	validate
};
