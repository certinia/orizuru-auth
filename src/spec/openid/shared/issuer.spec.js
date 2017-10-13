/**
 * Copyright (c) 2017, FinancialForce.com, inc
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
 **/

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

		issuer = proxyquire('../../../lib/openid/shared/issuer', {
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
