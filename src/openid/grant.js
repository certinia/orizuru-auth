'use strict';

const
	sharedFunctions = require('./shared/functions'),
	issuer = require('./shared/issuer'),
	envValidator = require('./shared/envValidator'),

	validateUser = ({ env, user }) => {

		if (!user || user.username === '') {
			throw new Error('Invalid parameter: username cannot be empty.');
		}

		if (!user.username) {
			throw new Error('Missing required parameter: username.');
		}

		return { env, user };
	},

	getIssuer = ({ env, user }) => {
		return issuer.getAsync(env.openidHTTPTimeout, env.openidIssuerURI)
			.then(issuer => {
				if (issuer == null) {
					throw new Error( /* doesn't matter, catch assigns message */ );
				}
				return {
					env,
					issuerClient: new issuer.Client(),
					user
				};
			})
			.catch(() => {
				throw new Error(`Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`);
			});
	},

	convertGrantToCredentials = (grant) => {
		return {
			instanceUrl: grant.instance_url,
			accessToken: grant.access_token
		};
	},

	fail = error => {
		throw new Error(`Failed to grant token, error: ${error.message}`);
	};

module.exports = {

	getToken: env => {
		envValidator.validate(env);
		return (user) => Promise.resolve({ env, user })
			.then(validateUser)
			.then(getIssuer)
			.then(sharedFunctions.constructSignedJwt)
			.then(sharedFunctions.obtainAuthorizationGrant)
			.then(convertGrantToCredentials)
			.catch(fail);
	}

};
