import { NextRequest, NextResponse } from 'next/server';

const checkAuth = (request: NextRequest) => {
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.ADMIN_PASSWORD;
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return false;
  }
  return true;
};

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized. Check ADMIN_PASSWORD.' }, { status: 401 });
  }

  try {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'GITHUB_TOKEN is missing' }, { status: 500 });
    }

    const searchParams = request.nextUrl.searchParams;
    const uploadUrl = searchParams.get('uploadUrl');
    const fileName = searchParams.get('fileName');

    if (!uploadUrl || !fileName) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const cleanUrl = uploadUrl.split('{')[0];
    const url = `${cleanUrl}?name=${encodeURIComponent(fileName)}`;

    let contentType = 'application/octet-stream';
    if (fileName.toLowerCase().endsWith('.apk')) {
      contentType = 'application/vnd.android.package-archive';
    } else if (fileName.toLowerCase().endsWith('.zip')) {
      contentType = 'application/zip';
    } else if (fileName.toLowerCase().endsWith('.rar')) {
      contentType = 'application/x-rar-compressed';
    } else if (fileName.toLowerCase().endsWith('.exe')) {
      contentType = 'application/x-msdownload';
    }

    const contentLength = request.headers.get('content-length');

    // We forward the request.body as a stream to GitHub API
    // Setting duplex: 'half' is required for Node 18+ fetch with ReadableStream bodies
    const initOptions: any = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': contentType,
        ...(contentLength ? { 'Content-Length': contentLength } : {}),
      },
      body: request.body,
    };

    if (request.body) {
      initOptions.duplex = 'half';
    }

    const githubResponse = await fetch(url, initOptions);

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      return NextResponse.json({ error: errorText }, { status: githubResponse.status });
    }

    const data = await githubResponse.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unknown error' }, { status: 500 });
  }
}
