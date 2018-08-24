/**
 * Copyright (c) 2018, FinancialForce.com, inc
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

import { SalesforceJwt } from './salesforceJwt';

/**
 * Standard set of claims returned by Salesforce in the id_token field of the {@link AccessTokenResponse}.
 *
 * @see http://openid.net/specs/openid-connect-basic-1_0-28.html#StandardClaims
 */
export interface SalesforceJwtStandardClaims extends SalesforceJwt {

	/**
	 * End-User's full name in displayable form including all name parts, possibly including
	 * titles and suffixes, ordered according to the End-User's locale and preferences.
	 */
	name: string;

	/**
	 * Given name(s) or first name(s) of the End-User.
	 *
	 * Note that in some cultures, people can have multiple given names; all can be present,
	 * with the names being separated by space characters.
	 */
	given_name?: string;

	/**
	 * Surname(s) or last name(s) of the End-User.
	 *
	 * Note that in some cultures, people can have multiple family names or no family name;
	 * all can be present, with the names being separated by space characters.
	 */
	family_name?: string;

	/**
	 * Middle name(s) of the End-User.
	 *
	 * Note that in some cultures, people can have multiple middle names; all can be present,
	 * with the names being separated by space characters. Also note that in some cultures,
	 * middle names are not used.
	 */
	middle_name?: string;

	/**
	 * Casual name of the End-User that may or may not be the same as the given_name.
	 * For instance, a nickname value of Mike might be returned alongside a given_name value of Michael.
	 */
	nickname: string;

	/**
	 * Shorthand name that the End-User wishes to be referred to at the RP, such as janedoe or j.doe.
	 * This value MAY be any valid JSON string including special characters such as @, /, or whitespace.
	 * This value MUST NOT be relied upon to be unique by the RP.
	 */
	preferred_username: string;

	/**
	 * URL of the End-User's profile page.
	 *
	 * The contents of this Web page SHOULD be about the End-User.
	 */
	profile: string;

	/**
	 * URL of the End-User's profile picture.
	 *
	 * This URL MUST refer to an image file (for example, a PNG, JPEG, or GIF image file),
	 * rather than to a Web page containing an image. Note that this URL SHOULD specifically
	 * reference a profile photo of the End-User suitable for displaying when describing
	 * the End-User, rather than an arbitrary photo taken by the End-User.
	 */
	picture: string;

	/**
	 * URL of the End-User's Web page or blog.
	 *
	 * This Web page SHOULD contain information published by the End-User or an organization that the End-User is affiliated with.
	 */
	website: string;

	/**
	 * End-User's preferred e-mail address.
	 *
	 * Its value MUST conform to the RFC 5322 [RFC5322] addr-spec syntax.
	 * This value MUST NOT be relied upon to be unique by the RP, as discussed in Section 2.5.3.
	 */
	email: string;

	/**
	 * True if the End-User's e-mail address has been verified; otherwise false.
	 * When this Claim Value is true, this means that the OP took affirmative steps to ensure that
	 * this e-mail address was controlled by the End-User at the time the verification was performed.
	 * The means by which an e-mail address is verified is context-specific, and dependent upon the
	 * trust framework or contractual agreements within which the parties are operating.
	 */
	email_verified: boolean;

	/**
	 * End-User's gender.
	 *
	 * Values defined by this specification are female and male.
	 * Other values MAY be used when neither of the defined values are applicable.
	 */
	gender: string;

	/**
	 * End-User's birthday, represented as an ISO 8601:2004 [ISO8601‑2004] YYYY-MM-DD format.
	 * The year MAY be 0000, indicating that it is omitted.
	 * To represent only the year, YYYY format is allowed.
	 * Note that depending on the underlying platform's date related function, providing just year
	 * can result in varying month and day, so the implementers need to take this factor into account
	 * to correctly process the dates.
	 */
	birthdate: string;

	/**
	 * String from zoneinfo [zoneinfo] time zone database representing the End-User's time zone.
	 * For example, Europe/Paris or America/Los_Angeles.
	 */
	zoneinfo: string;

	/**
	 * End-User's locale, represented as a BCP47 [RFC5646] language tag.
	 *
	 * This is typically an ISO 639-1 Alpha-2 [ISO639‑1] language code in lowercase and an
	 * ISO 3166-1 Alpha-2 [ISO3166‑1] country code in uppercase, separated by a dash.
	 * For example, en-US or fr-CA. As a compatibility note, some implementations
	 * have used an underscore as the separator rather than a dash, for example, en_US;
	 * Implementations MAY choose to accept this locale syntax as well.
	 */
	locale: string;

	/**
	 * End-User's preferred telephone number.
	 *
	 * E.164 [E.164] is RECOMMENDED as the format of this Claim, for example, +1 (425) 555-1212 or +56 (2) 687 2400.
	 * If the phone number contains an extension, it is RECOMMENDED that the extension be represented using
	 * the RFC 3966 [RFC3966] extension syntax, for example, +1 (604) 555-1234;ext=5678.
	 */
	phone_number: string;

	/**
	 * True if the End-User's phone number has been verified; otherwise false.
	 *
	 * When this Claim Value is true, this means that the OP took affirmative steps to ensure that this phone number
	 * was controlled by the End-User at the time the verification was performed.
	 * The means by which a phone number is verified is context-specific, and dependent upon the trust framework or
	 * contractual agreements within which the parties are operating. When true, the phone_number
	 * Claim MUST be in E.164 format and any extensions MUST be represented in RFC 3966 format.
	 */
	phone_number_verified: boolean;

	/**
	 * End-User's preferred address.
	 *
	 * The value of the address member is a JSON [RFC4627] structure containing
	 * some or all of the members defined in Section 2.5.1.
	 */
	address: string;

	/**
	 * Time the End-User's information was last updated.
	 *
	 * The time is represented as the number of seconds from 1970-01-01T0:0:0Z as measured in UTC until the date/time.
	 */
	updated_at: number;

}
