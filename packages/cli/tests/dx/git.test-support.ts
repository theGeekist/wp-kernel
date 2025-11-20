export type GitDepsMock = {
	detectRepository: jest.Mock<Promise<boolean>, [string]>;
	initRepository: jest.Mock<Promise<void>, [string]>;
};

export function createGitDepsMock(): GitDepsMock {
	return {
		detectRepository: jest.fn<Promise<boolean>, [string]>(
			async () => false
		),
		initRepository: jest.fn<Promise<void>, [string]>(async () => undefined),
	};
}
