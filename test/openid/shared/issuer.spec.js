'use strict';

const
	proxyquire = require('proxyquire'),
	chai = require('chai'),
	chaiAsPromised = require('chai-as-promised'),

	expect = chai.expect;

chai.use(chaiAsPromised);

describe('openid/shared/issuer.js', () => {

	let IssuerMockClass, Issuer, issuer, oidc;

	beforeEach(() => {

		IssuerMockClass = class {
			constructor() {
				this.test = 'test';
			}
		};

		Issuer = {
			discover: () => {
				return Promise.resolve(new IssuerMockClass());
			}
		};

		oidc = { Issuer: Issuer };

		issuer = proxyquire('../../../src/openid/shared/issuer', {
			'openid-client': oidc
		});

	});

	describe('getAsync', () => {

		it('should return a new issuer if one doesn\'t exist', () => {

			return expect(issuer.getAsync(1000, 'testUri')).to.eventually.have.property('test', 'test');

		});

		it('should return the cached issuer if one exist', () => {

			let issuer1, issuer2;

			return issuer.getAsync(1000, 'testUri')
				.then(issuer => {
					issuer1 = issuer;
					return null;
				})
				.then(() => issuer.getAsync(1000, 'testUri'))
				.then(issuer => {
					issuer2 = issuer;
					return null;
				})
				.then(() => {
					expect(issuer1).to.equal(issuer2);
				});
		});

		it('should return the a new issuer if one exists with different params', () => {

			let issuer1, issuer2, issuer3;

			return issuer.getAsync(1000, 'testUri')
				.then(issuer => {
					issuer1 = issuer;
					return null;
				})
				.then(() => issuer.getAsync(1000, 'testUri2'))
				.then(issuer => {
					issuer2 = issuer;
					return null;
				})
				.then(() => issuer.getAsync(2000, 'testUri2'))
				.then(issuer => {
					issuer3 = issuer;
					return null;
				})
				.then(() => {
					expect(issuer1).to.not.equal(issuer2);
					expect(issuer1).to.not.equal(issuer3);
					expect(issuer2).to.not.equal(issuer3);
				});
		});
	});

});
