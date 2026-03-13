import { uploadReleaseAsset } from './lib/github';
import { getGithubConfig } from './lib/github';
// We'll write a simple test script to measure the time taken to upload
// multiple fake files sequentially vs. using Promise.all
