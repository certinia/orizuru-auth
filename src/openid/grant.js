'use strict';

const
	sharedFunctions = require('./shared/functions'),
	issuer = require('./shared/issuer'),
	envValidator = require('./shared/envValidator'),

	USER_INFO_PREFERRED_USERNAME = 'preferred_username',
	USER_INFO_ORG_ID = 'organization_id',

	validateUsernameAndOrgId = ({ env, username, organizationId }) => {

		if (username === '') {
			throw new Error('Invalid parameter: username cannot be empty.');
		}

		if (!username) {
			throw new Error('Missing required parameter: username.');
		}

		if (organizationId === '') {
			throw new Error('Invalid parameter: organizationId cannot be empty.');
		}

		if (!organizationId) {
			throw new Error('Missing required parameter: organizationId.');
		}

		return { env, username, organizationId };
	},

	makeUserInfo = ({ env, username, organizationId }) => {
		return issuer.getAsync(env.openidHTTPTimeout, env.openidIssuerURI)
			.then(issuer => {
				if (issuer == null) {
					throw new Error( /* doesn't matter, catch assigns message */ );
				}
				return {
					env,
					issuer,
					userInfo: {
						[USER_INFO_PREFERRED_USERNAME]: username,
						[USER_INFO_ORG_ID]: organizationId
					}
				};
			})
			.catch(() => {
				throw new Error(`Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`);
			});
	},

	createClient = ({ env, issuer, userInfo }) => {
		const issuerClient = new issuer.Client();
		return { env, issuerClient, userInfo };
	},

	returnGrant = ({ env, grant, userInfo }) => grant,

	fail = error => {
		throw new Error(`Failed to grant token, error: ${error.message}`);
	};

module.exports = {

	token: env => {
		envValidator.validate(env);
		return (username, organizationId) => Promise.resolve({ env, username, organizationId })
			.then(validateUsernameAndOrgId)
			.then(makeUserInfo)
			.then(createClient)
			.then(sharedFunctions.constructSignedJwt)
			.then(sharedFunctions.obtainAuthorizationGrant)
			.then(returnGrant)
			.catch(fail);
	}

};
