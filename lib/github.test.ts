import { describe, it, expect, vi, beforeEach } from 'vitest';
import { deleteFromGithub, GithubConfig } from './github';

// Mock the octokit module
const mockGetContent = vi.fn();
const mockDeleteFile = vi.fn();

vi.mock('octokit', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      rest: {
        repos: {
          getContent: mockGetContent,
          deleteFile: mockDeleteFile,
        },
      },
    })),
  };
});

describe('deleteFromGithub', () => {
  const mockConfig: GithubConfig = {
    username: 'testuser',
    repo: 'testrepo',
    token: 'testtoken',
  };
  const mockPath = 'path/to/file.txt';
  const mockMessage = 'Delete file.txt';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully delete a file when it exists', async () => {
    // Arrange
    const mockSha = 'file-sha-123';
    mockGetContent.mockResolvedValueOnce({
      data: {
        type: 'file',
        sha: mockSha,
      },
    });
    mockDeleteFile.mockResolvedValueOnce({ data: {} });

    // Act
    const result = await deleteFromGithub(mockConfig, mockPath, mockMessage);

    // Assert
    expect(result).toBe(true);
    expect(mockGetContent).toHaveBeenCalledWith({
      owner: mockConfig.username,
      repo: mockConfig.repo,
      path: mockPath,
    });
    expect(mockDeleteFile).toHaveBeenCalledWith({
      owner: mockConfig.username,
      repo: mockConfig.repo,
      path: mockPath,
      message: mockMessage,
      sha: mockSha,
    });
  });

  it('should not call deleteFile if the path is a directory (array of items)', async () => {
    // Arrange
    mockGetContent.mockResolvedValueOnce({
      data: [
        { type: 'file', name: 'file1.txt' },
        { type: 'dir', name: 'dir1' }
      ],
    });

    // Act
    const result = await deleteFromGithub(mockConfig, mockPath, mockMessage);

    // Assert
    expect(result).toBe(true); // Assuming the function returns true in this case based on the current implementation.
    expect(mockGetContent).toHaveBeenCalledTimes(1);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it('should not call deleteFile if the path is not a file type', async () => {
    // Arrange
    mockGetContent.mockResolvedValueOnce({
      data: {
        type: 'dir',
        sha: 'dir-sha',
      },
    });

    // Act
    const result = await deleteFromGithub(mockConfig, mockPath, mockMessage);

    // Assert
    expect(result).toBe(true);
    expect(mockGetContent).toHaveBeenCalledTimes(1);
    expect(mockDeleteFile).not.toHaveBeenCalled();
  });

  it('should log error and re-throw if getContent fails', async () => {
    // Arrange
    const mockError = new Error('API Error');
    mockGetContent.mockRejectedValueOnce(mockError);

    // Spy on console.error
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Act & Assert
    await expect(deleteFromGithub(mockConfig, mockPath, mockMessage)).rejects.toThrow('API Error');
    expect(consoleErrorSpy).toHaveBeenCalledWith('GitHub API Error:', mockError);
    expect(mockDeleteFile).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
