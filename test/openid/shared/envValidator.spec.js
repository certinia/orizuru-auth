'use strict';

const
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),

	envValidator = require('../../../src/openid/shared/envValidator'),

	expect = chai.expect;

chai.use(chaiAsPromised);

describe('shared/envValidator.js', () => {

	let env;

	beforeEach(() => {
		env = {
			jwtSigningKey: 'test',
			openidClientId: 'test',
			openidHTTPTimeout: 4001,
			openidIssuerURI: 'test'
		};
	});

	it('should reject if jwtSigningKey is null', () => {

		// given
		env.jwtSigningKey = null;

		// when - then
		expect(() => envValidator.validate(env)).to.throw('Missing required parameter: jwtSigningKey.');

	});

	it('should reject if jwtSigningKey is empty', () => {

		// given
		env.jwtSigningKey = '';

		// when - then
		expect(() => envValidator.validate(env)).to.throw('Invalid parameter: jwtSigningKey cannot be empty.');

	});

	it('should reject if openidClientId is null', () => {

		// given
		env.openidClientId = null;

		// when - then
		expect(() => envValidator.validate(env)).to.throw('Missing required parameter: openidClientId.');

	});

	it('should reject if openidClientId is empty', () => {

		// given
		env.openidClientId = '';

		// when - then
		expect(() => envValidator.validate(env)).to.throw('Invalid parameter: openidClientId cannot be empty.');

	});

	it('should reject if openidHTTPTimeout is null', () => {

		// given
		env.openidHTTPTimeout = null;

		// when - then
		expect(() => envValidator.validate(env)).to.throw('Invalid parameter: openidHTTPTimeout is not an integer.');

	});

	it('should reject if openidHTTPTimeout is not an integer', () => {

		// given
		env.openidHTTPTimeout = '';

		// when - then
		expect(() => envValidator.validate(env)).to.throw('Invalid parameter: openidHTTPTimeout is not an integer.');

	});

	it('should reject if openidIssuerURI is null', () => {

		// given
		env.openidIssuerURI = null;

		// when - then
		expect(() => envValidator.validate(env)).to.throw('Missing required parameter: openidIssuerURI.');

	});

	it('should reject if openidIssuerURI is empty', () => {

		// given
		env.openidIssuerURI = '';

		// when - then
		expect(() => envValidator.validate(env)).to.throw('Invalid parameter: openidIssuerURI cannot be empty.');

	});

	it('should resolve with env if env is ok', () => {

		// given - when - then
		expect(envValidator.validate(env)).to.deep.equal(env);

	});

});
