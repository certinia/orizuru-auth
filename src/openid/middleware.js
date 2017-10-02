'use strict';

const
	_ = require('lodash'),
	issuer = require('./shared/issuer'),
	envValidator = require('./shared/envValidator'),

	constants = require('./shared/constants'),

	extractAccessToken = ({ env, req }) => {
		// https://tools.ietf.org/html/rfc6750
		const
			authorizationHeader = req ? req.get ? req.get(constants.HTTP_AUTHORIZATION_HEADER) : null : null,
			accessToken = authorizationHeader ? authorizationHeader.substring(constants.BEARER_PREFIX.length) : null;

		if (_.isEmpty(accessToken)) {
			throw new Error('Authorization header with \'Bearer ***...\' required');
		}

		return issuer.getAsync(env.openidHTTPTimeout, env.openidIssuerURI)
			.then(issuer => {
				if (issuer == null) {
					throw new Error( /* doesn't matter, catch assigns message */ );
				}
				return {
					env,
					req,
					accessToken,
					issuer
				};
			})
			.catch(() => {
				throw new Error(`Could not get an issuer for timeout: ${env.openidHTTPTimeout} and URI: ${env.openidIssuerURI}`);
			});
	},

	validateAccessToken = ({ env, req, accessToken, issuer }) => {
		const issuerClient = new issuer.Client();
		return issuerClient.userinfo(accessToken)
			.then(userInfo => {
				if (userInfo == null) {
					throw new Error( /* doesn't matter, catch assigns message */ );
				}
				return {
					req,
					userInfo
				};
			})
			.catch(() => {
				throw new Error('Failed to authenticate with Authorisation header');
			});
	},

	success = ({ req, userInfo }) => {
		const user = {
			username: userInfo.preferred_username,
			organizationId: userInfo.organization_id
		};

		req.user = user;

		return user;
	},

	fail = req => error => {
		throw new Error(`Access denied to: ${req ? req.ip ? req.ip : 'unknown' : 'unknown'}, error: ${error.message}`);
	};

module.exports = {

	tokenValidator: env => {
		envValidator.validate(env);
		return (req, res, next) => Promise.resolve({ env, req })
			.then(extractAccessToken)
			.then(validateAccessToken)
			.then(success)
			.catch(fail(req));
	}

};
