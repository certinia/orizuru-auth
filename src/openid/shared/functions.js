'use strict';

const
	jsonwebtoken = require('jsonwebtoken'),

	JWT_GRANT_TYPE = 'grant_type',
	JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer',
	RSA_256 = 'RS256',
	RSA_256_ALGORITHM = { algorithm: RSA_256 },

	constructSignedJwt = ({ env, issuerClient, userInfo }) => {
		const
			nowPlusFourMinutes = () => {
				return Math.floor(Date.now() / 1000) + (60 * 4);
			},
			payload = {
				iss: env.openidClientId,
				aud: env.openidIssuerURI,
				sub: userInfo.preferred_username,
				exp: nowPlusFourMinutes()
			},
			createAssertion = new Promise(resolve => {
				jsonwebtoken.sign(payload, env.jwtSigningKey, RSA_256_ALGORITHM, (err, token) => {
					if (token) {
						resolve(token);
					} else {
						throw new Error('Failed to sign authentication token');
					}
				});
			});

		return createAssertion
			.then(assertion => ({
				env,
				issuerClient,
				assertion,
				userInfo
			}));
	},

	obtainAuthorizationGrant = ({ env, issuerClient, assertion, userInfo }) => {
		return issuerClient.grant({
			[JWT_GRANT_TYPE]: JWT_BEARER_GRANT,
			assertion: assertion
		}).then(grant => {
			if (grant == null) {
				throw new Error( /* doesn't matter, catch assigns message */ );
			}
			return {
				env,
				grant,
				userInfo
			};
		}).catch(() => {
			throw new Error('Grant request failed');
		});
	};

module.exports = {
	constructSignedJwt,
	obtainAuthorizationGrant
};
