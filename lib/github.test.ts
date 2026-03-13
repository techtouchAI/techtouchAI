import { saveGithubConfig, GithubConfig } from './github';

jest.mock('octokit', () => ({
  Octokit: jest.fn(),
}));

describe('saveGithubConfig', () => {
  beforeEach(() => {
    // Clear mock before each test
    Storage.prototype.setItem = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should save the github config to localStorage as a string', () => {
    const mockConfig: GithubConfig = {
      username: 'testuser',
      repo: 'testrepo',
      token: 'testtoken123',
    };

    saveGithubConfig(mockConfig);

    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'github_config',
      JSON.stringify(mockConfig)
    );
  });
});
