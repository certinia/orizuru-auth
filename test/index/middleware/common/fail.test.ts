/*
 * Copyright (c) 2019, FinancialForce.com, inc
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
 */

import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { NextFunction, Request, Response } from '@financialforcedev/orizuru';

import { EVENT_DENIED } from '../../../../src';

import { fail } from '../../../../src/index/middleware/common/fail';

const expect = chai.expect;
const has = sinon.match.has;

chai.use(sinonChai);

describe('index/middleware/common/fail', () => {

	let app: Orizuru.IServer;
	let req: Request;
	let res: Response;
	let next: NextFunction;

	beforeEach(() => {

		const partialRequest: Partial<Request> = {
			ip: '1.1.1.1'
		};
		req = partialRequest as Request;

		const partialResponse: Partial<Response> = {};
		res = partialResponse as Response;

		const partialApp: Partial<Orizuru.IServer> = {
			emit: sinon.stub()
		};
		app = partialApp as Orizuru.IServer;

		next = sinon.stub();

	});

	afterEach(() => {

		expect(next).to.have.been.calledOnce;

		sinon.restore();

	});

	it('should emit a denied event with the error when no ip is present ', () => {

		// Given
		delete req.ip;

		// When
		fail(app, new Error('test'), req, res, next);

		// Then
		expect(app.emit).to.have.been.calledOnce;
		expect(app.emit).to.have.been.calledWithExactly(EVENT_DENIED, 'Access denied to: unknown. Error: test');
		expect(next).to.have.been.calledWithExactly(has('message', 'Access denied to: unknown. Error: test'));

	});

	it('should emit a denied event with the error', () => {

		// Given
		// When
		fail(app, new Error('test'), req, res, next);

		// Then
		expect(app.emit).to.have.been.calledOnce;
		expect(app.emit).to.have.been.calledWithExactly(EVENT_DENIED, 'Access denied to: 1.1.1.1. Error: test');
		expect(next).to.have.been.calledWithExactly(has('message', 'Access denied to: 1.1.1.1. Error: test'));

	});

});
