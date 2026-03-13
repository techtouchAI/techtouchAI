import { describe, it, expect, vi } from 'vitest';
import { createRelease } from './github';

// Mock Octokit class to simulate errors
vi.mock('octokit', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            getReleaseByTag: vi.fn().mockRejectedValue({ status: 404 }), // Release not found
            createRelease: vi.fn().mockRejectedValue(new Error('Simulated API creation error')), // Creation fails
          },
        },
      };
    }),
  };
});

describe('createRelease error handling', () => {
  it('should throw a properly formatted error when creation fails', async () => {
    const config = {
      username: 'testuser',
      repo: 'testrepo',
      token: 'testtoken',
    };
    const tag = 'v1.0.0';
    const name = 'Release v1.0.0';

    await expect(createRelease(config, tag, name)).rejects.toThrow(
      'فشل إنشاء الإصدار (Release) في GitHub. تأكد من أن الـ Token يمتلك صلاحية "Releases". التفاصيل: Simulated API creation error'
    );
  });
});
