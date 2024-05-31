let parsedParams = {};
var releases = [];
var languages = [];
var avaliableLinks = [];
let queryString = '';
let ESDMode = false;
let DND = false;
let validVersions = [ "Windows 10", "Windows 11" ];
let regex;

document.addEventListener('DOMContentLoaded', () => {
    queryString = window.location.search.substring(1);
    Main();
});

function parseQueryString(query) {
    const params = query.split('+--').map(param => param.split('='));
    const result = {};
    params.forEach(([key, value]) => {
        if (key && value) {
            result[key.trim()] = decodeURIComponent(value.trim().replace(/\+/g, ' '));
        }
    });
    return result;
}

async function Main() {
    let found = false;
    parsedParams = parseQueryString(queryString);
    const resultDiv = document.getElementById('result');
    if (Object.keys(parsedParams).length > 0) {
        if (parsedParams.hasOwnProperty("ESDMode")) {
            if (parsedParams["ESDMode"].toLowerCase() === "true") {
                ESDMode = true;
            } else {
            }
        }
        if (parsedParams.hasOwnProperty("DoNotDownload")) {
            if (parsedParams["DoNotDownload"].toLowerCase() === "true") {
                DND = true;
            } else {
            }
        }

        if (parsedParams.hasOwnProperty("--WinVer")) {
            validVersions.forEach(user => {
                if (parsedParams["--WinVer"] == under(user)) {
                    found = true;
                    regex = new RegExp("^(.*\\b" + user + "\\b.*)$");
                    return; // Exit the loop
                }
            });

            if (found == true) {
                if (parsedParams.hasOwnProperty("Release")) {
                    await retrieveRelease(ESDMode);
                    if (parsedParams["Release"] == "latest") {
                        let lastRelease = releases[releases.length - 1];
                        releaseURL = lastRelease[1];
                    } else {
                        let selRelease = revunder(parsedParams["Release"]);
                        let index = binSearch(releases, selRelease);
                        if (index !== -1) {
                            let releaseURL = await getURL(releases, selRelease);
                        }
                    }
                    if (parsedParams.hasOwnProperty("Language")) {
                        languages = await retrieveLanguages(releaseURL);
                        let indexs = binSearch(languages, parsedParams["Language"]);
                        if (indexs !== -1) {
                            let langURL = await getURL(languages, parsedParams["Language"]);
                            let downloadURL = await retrieveURLs(langURL);
                            if (downloadURL.length === 0) {
                                let outputString = JSON.stringify({ "error": "No URLs found!" }, null, 2);

                                resultDiv.innerHTML = `
                                    <pre>${outputString}</pre>
                                `;
                            } else {
                                let downURL = await getMSLink(downloadURL);
                                if (downURL == "fail") {
                                    resultDiv.innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify({"error":"No download links from MS at this time..."}, null, 2)}</pre>
`;
                                } else {
                                    if (DND) {
                                        resultDiv.innerHTML = `
                                            <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify({"url": downURL}, null, 2)}</pre>
                                        `;
                                    } else {
                                        window.location.href = downURL;
                                    }
                                }
                            }
                        }
                    } else {
                        languages = await retrieveLanguages(releaseURL);
                        let outputString = JSON.stringify(languages, null, 2);

                        resultDiv.innerHTML = `
                            <pre>${outputString}</pre>
                        `;
                    }
                } else {
                    await retrieveRelease(ESDMode);
                    let outputString = JSON.stringify(releases, null, 2);

                    resultDiv.innerHTML = `
                        <pre>${outputString}</pre>
                    `;
                }
            } else {
                resultDiv.innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify({"error":"Invalid input! Check the API documentation to solve this. ErrorCode: INVALIDWINVER"}, null, 2)}</pre>
`;
            }
        } else {
            resultDiv.innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify({"error":"Invalid input! Check the API documentation to solve this. ErrorCode: MISSINGWINVER"}, null, 2)}</pre>
`;
        }
    }
}

function under(str) {
    return str.replace(/ /g, '_');
}

function revunder(str) {
    return str.replace(/_/g, ' ');
}

async function retrieveRelease(esd) {
    let searchFor = esd ? "Operating Systems - (ESD)" : "Operating Systems";
    try {
        const response = await fetch("https://files.rg-adguard.net/category");

        if (!response.ok) {
            throw new Error("Failed to fetch HTML content");
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const link = Array.from(doc.querySelectorAll("a"))
            .find(a => a.textContent.trim() === searchFor)
            ?.getAttribute("href");

        if (link) {
            const linkResponse = await fetch(link);

            if (!linkResponse.ok) {
                throw new Error("Failed to fetch HTML content from the link");
            }

            const linkHtml = await linkResponse.text();
            const linkDoc = new DOMParser().parseFromString(linkHtml, "text/html");

            addDataToReleases(linkDoc);
        } else {
            resultDiv.innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify({"error":"Something went wrong, contact me to see the problem. ERRORCODE:NOLINK"}, null, 2)}</pre>
`;
        }
    } catch (error) {
        resultDiv.innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify({"error":"Something went wrong, " + error}, null, 2)}</pre>
`;
    }
}

function addDataToReleases(doc) {
    Array.from(doc.querySelectorAll("a")).forEach(a => {
        if (regex.test(a.innerText)) {
            var toPass = [a.innerText, a.getAttribute("href")];
            releases.push(toPass);
        }
    });
}

function binSearch(arr, targetLanguage) {
    arr.sort((a, b) => a[0].localeCompare(b[0]));

    let left = 0;
    let right = arr.length - 1;

    while (left <= right) {
        let mid = Math.floor((left + right) / 2);
        if (arr[mid][0] === targetLanguage) {
            return mid;
        }
        if (arr[mid][0] < targetLanguage) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return -1;
}

function getURL(arr, targetRelease) {
    for (let i = 0; i < arr.length; i++) {
        if (arr[i][0] === targetRelease) {
            return arr[i][1];
        }
    }
    return null;
}

async function retrieveLanguages(releaseURL) {
    let list = [];
    try {
        const response = await fetch(releaseURL);

        if (!response.ok) {
            throw new Error("Failed to fetch HTML content");
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        const anchorTags = Array.from(doc.querySelectorAll("a"));

        for (const anchorTag of anchorTags) {
            const entryUrl = anchorTag.getAttribute("href");
            let language = anchorTag.innerHTML;

            language = language.replace(/<.*?>/g, '');

            if (!entryUrl || !language) continue;

            if (!entryUrl.startsWith("https://")) continue;

            if (!/^[a-zA-Z]+$/.test(language)) continue;
            var toPush = [language, entryUrl];
            list.push(toPush);
        }

        if (list.length > 0) {
            return list;
        } else {
            resultDiv.innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify({"error":"No valid languages found in the links."}, null, 2)}</pre>
`;
        }

    } catch (error) {
        resultDiv.innerHTML = `
    <pre style="white-space: pre-wrap; font-family: monospace;">${JSON.stringify({"error":"Something went wrong, " + error}, null, 2)}</pre>
`;
    }
}

async function retrieveURLs(url) {
    let list = [];
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to fetch HTML content");
        }

        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const arm = "A64";
        const business = "CLIENTBUSINESS";
        const anchorTags = Array.from(doc.querySelectorAll("a"));

        for (const anchorTag of anchorTags) {
            const entryUrl = anchorTag.getAttribute("href");
            let data = anchorTag.innerHTML;
            if (!data.startsWith("<")) {
                if (!data.startsWith("@")) {
                    if (isNum(data)) {
                        if (!data.includes(arm)) {
                            if (!data.includes(business)) {
                                return entryUrl;
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
    }
}

function isNum(str) {
    return /^[0-9]/.test(str);
}

async function getMSLink(url) {
    try {
        const payloadOfficial = new URLSearchParams({
            'dl_official': 'Test'
        });
        let resp;
        response = await fetch(url, {
            method: 'POST',
            body: payloadOfficial,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const responseUrl = response.url;
        if (responseUrl) {
            return responseUrl;
        } else {
            return "fail";
        }
    } catch (error) {
        console.log(error);
        return "fail";
    }
}
