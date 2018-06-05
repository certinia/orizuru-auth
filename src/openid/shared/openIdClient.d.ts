/* tslint:disable */
declare module 'openid-client' {

	interface IConstructable<T> {
		new(): T;
	}

	export class Issuer {

		public static defaultHttpOptions: {
			timeout: number;
		};

		public static discover: (openidIssuerUri: string) => Promise<Issuer>;

		public grant: () => string;

		public Client: IConstructable<Client>;

	}

	export class Client {

		constructor(options: any);

		public grant({ grant_type, assertion }: { grant_type: string, assertion: string }): Promise<IOpenIdGrant>;

		public userinfo(accessToken: string, options?: any): Promise<IUserInfo>;

	}

	interface IOpenIdGrant {
		instance_url: string,
		access_token: string
	}

	interface IUserInfo {
		preferred_username: string;
		organization_id: string;
	}

}
