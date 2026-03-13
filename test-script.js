// We need a script to mock the fetch function and uploadReleaseAsset function
// to simulate the time taken.
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function mockUploadReleaseAsset(file, customName, onProgress) {
    await delay(100); // simulate 100ms upload
    if (onProgress) onProgress(100);
    return { browser_download_url: 'http://example.com/' + customName };
}

async function runSequential(files) {
    const start = Date.now();
    const uploadedFiles = [];
    for (let i = 0; i < files.length; i++) {
        const { file, customName } = files[i];
        const asset = await mockUploadReleaseAsset(file, customName, (progress) => {});
        uploadedFiles.push({ path: asset.browser_download_url, name: customName || file.name });
    }
    const end = Date.now();
    return end - start;
}

async function runParallel(files) {
    const start = Date.now();
    const uploadedFiles = [];
    const uploadPromises = files.map(async (fileObj, i) => {
        const { file, customName } = fileObj;
        const asset = await mockUploadReleaseAsset(file, customName, (progress) => {});
        return { path: asset.browser_download_url, name: customName || file.name };
    });
    const results = await Promise.all(uploadPromises);
    uploadedFiles.push(...results);
    const end = Date.now();
    return end - start;
}

const files = Array(10).fill({ file: { name: 'test.txt' }, customName: 'test.txt' });

async function main() {
    const seqTime = await runSequential(files);
    console.log(`Sequential time: ${seqTime}ms`);

    const parTime = await runParallel(files);
    console.log(`Parallel time: ${parTime}ms`);
}

main();
