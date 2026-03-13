export class Octokit {
  constructor() {}
  rest = {
    repos: {
      getContent: jest.fn(),
      createOrUpdateFileContents: jest.fn(),
      deleteFile: jest.fn(),
      getReleaseByTag: jest.fn(),
      createRelease: jest.fn(),
      deleteRelease: jest.fn(),
    }
  };
}
