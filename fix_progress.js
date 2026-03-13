const fs = require('fs');
let code = fs.readFileSync('lib/db.ts', 'utf8');

const search = `      const uploadPromises = appFiles.map(async (appFile, i) => {
        const { file, customName } = appFile;
        const fileExt = file.name.split('.').pop();
        const safeFileName = \`\${appId}_\${i}_\${Date.now()}.\${fileExt}\`;

        const asset = await uploadReleaseAsset(config, release.upload_url, file, safeFileName, (progress) => {
          if (onProgress) {
            const baseProgress = (i / appFiles.length) * 100;
            const fileProgress = (progress / appFiles.length);
            onProgress(baseProgress + fileProgress);
          }
        });
        return { path: asset.browser_download_url, name: customName || file.name };
      });`;

const replace = `      // Array to keep track of each file's individual progress
      const fileProgresses = new Array(appFiles.length).fill(0);

      const uploadPromises = appFiles.map(async (appFile, i) => {
        const { file, customName } = appFile;
        const fileExt = file.name.split('.').pop();
        const safeFileName = \`\${appId}_\${i}_\${Date.now()}.\${fileExt}\`;

        const asset = await uploadReleaseAsset(config, release.upload_url, file, safeFileName, (progress) => {
          if (onProgress) {
            fileProgresses[i] = progress; // progress is expected to be 0 to 100

            // Calculate total progress across all files
            const totalProgress = fileProgresses.reduce((acc, curr) => acc + curr, 0) / appFiles.length;
            onProgress(totalProgress);
          }
        });
        return { path: asset.browser_download_url, name: customName || file.name };
      });`;

code = code.replace(search, replace);
fs.writeFileSync('lib/db.ts', code);
