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

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized. Check ADMIN_PASSWORD.' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  try {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      headers: {
        'If-None-Match': '',
        'Cache-Control': 'no-cache',
      }
    });

    return NextResponse.json({ data });
  } catch (error: unknown) {
    if (error instanceof Error) {
      const anyErr = error as any;
      if (anyErr.status === 404) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized. Check ADMIN_PASSWORD.' }, { status: 401 });
  }

  try {
    const { path, content, message, sha } = await request.json();

    if (!path || !content || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    let fileSha = sha;
    if (!fileSha) {
      try {
        const { data } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path,
        });
        if (!Array.isArray(data) && data.type === 'file') {
          fileSha = data.sha;
        }
      } catch (error: unknown) {
        if (error instanceof Error && (error as any).status !== 404) {
          throw error;
        }
      }
    }

    const { data } = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content,
      sha: fileSha,
    });

    return NextResponse.json({ success: true, data });
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
    const { path, message } = await request.json();

    if (!path || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    const { data: fileData } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (!Array.isArray(fileData) && fileData.type === 'file') {
      await octokit.rest.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        sha: fileData.sha,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
