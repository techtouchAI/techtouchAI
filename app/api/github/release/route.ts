import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from 'octokit';

const checkAuth = (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.ADMIN_PASSWORD;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return false;
  }
  return true;
};

const getOctokit = () => {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is missing');
  return new Octokit({ auth: token });
};

const getRepoInfo = () => {
  return {
    owner: process.env.GITHUB_OWNER || 'techtouchAI',
    repo: process.env.GITHUB_REPO || 'techtouchAI',
  };
};

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized. Check ADMIN_PASSWORD.' }, { status: 401 });
  }

  try {
    const { tag, name } = await request.json();

    if (!tag || !name) {
      return NextResponse.json({ error: 'Missing tag or name' }, { status: 400 });
    }

    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    try {
      const { data } = await octokit.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag,
      });
      return NextResponse.json({ data });
    } catch (error: unknown) {
      if (error instanceof Error && (error as any).status !== 404) {
        throw error;
      }
    }

    const { data } = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name,
      body: 'Auto-generated release for app assets.',
      draft: false,
      prerelease: false,
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized. Check ADMIN_PASSWORD.' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const tag = searchParams.get('tag');

    if (!tag) {
      return NextResponse.json({ error: 'Missing tag' }, { status: 400 });
    }

    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    try {
      const { data: release } = await octokit.rest.repos.getReleaseByTag({
        owner,
        repo,
        tag,
      });

      await octokit.rest.repos.deleteRelease({
        owner,
        repo,
        release_id: release.id,
      });

      await octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `tags/${tag}`,
      });
    } catch (error: unknown) {
      if (error instanceof Error && (error as any).status !== 404) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
