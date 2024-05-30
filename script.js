let parsedParams = {};
let queryString = '';
let ESDMode = false;
let validVersions = [ "Windows 10", "Windows 11" ];

document.addEventListener('DOMContentLoaded', () => {
    // Get the query string from the current URL
    queryString = window.location.search.substring(1); // Remove the leading '?'

    // Parse the query string and display the data
    //Debug();
    Main();
});

// Function to parse the query string
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

function Debug() {
    // Parse the query string
    parsedParams = parseQueryString(queryString);

    // Display the parsed parameters as JSON on the webpage
    const resultDiv = document.getElementById('result');
    if (Object.keys(parsedParams).length > 0) {
        resultDiv.innerHTML = `
            <pre>${JSON.stringify(parsedParams, null, 2)}</pre>
        `;
    } else {
        window.location.href = "google.com";
    }
}

function Main() {
    let found = false;
    parsedParams = parseQueryString(queryString);
    console.log(parsedParams);
    const resultDiv = document.getElementById('result');
    if (Object.keys(parsedParams).length > 0) {
        if (parsedParams.hasOwnProperty("ESDMode")){
            if (parsedParams["ESDMode"].toLowerCase() === "true"){
                ESDMode = true;
                console.log("true");
            } else {
                console.log("false");
            } 
        }
        
        if (parsedParams.hasOwnProperty("--WinVer")){
            validVersions.forEach(user =>{
                if (parsedParams["--WinVer"] == under(user) ) {
                    found = true;
                    return; // Exit the loop
                }
            });
            
            if (found == true){
                if (parsedParams.hasOwnProperty("Release")){
                    resultDiv.innerHTML = `
                    <pre>${JSON.stringify({"error":"OK"})}</pre>
                `;
                } else {
                   createTable(ESDMode)
                }
            } else{
                resultDiv.innerHTML = `
            <pre>${JSON.stringify({"error":"Invalid input! Check the API documentation to solve this. ErrorCode: INVALIDWINVER"})}</pre>
        `;
            }
        } else {
            resultDiv.innerHTML = `
            <pre>${JSON.stringify({"error":"Invalid input! Check the API documentation to solve this. ErrorCode: MISSINGWINVER"})}</pre>
        `;
        }
    } else {
        window.location.href = "http://stackoverflow.com";
    }

}
function under(str) {
    return str.replace(/ /g, '_');
  }
// Function to create a DataTable (similar to C#) using Fetch API
async function createTable(esd) {
    let searchFor = esd ? "Operating Systems - (ESD)" : "Operating Systems";
    let tupleList = [];

    try {
        // Fetch the HTML content of the website
        const response = await fetch("https://files.rg-adguard.net/category");

        if (!response.ok) {
            throw new Error("Failed to fetch HTML content");
        }

        // Parse the HTML content
        const html = await response.text();
        const doc = new DOMParser().parseFromString(html, "text/html");

        // Find the link corresponding to the searchFor text
        const link = Array.from(doc.querySelectorAll("a"))
            .find(a => a.textContent.trim() === searchFor)
            ?.getAttribute("href");

        if (link) {
            // Fetch the HTML content of the found link
            const linkResponse = await fetch(link);

            if (!linkResponse.ok) {
                throw new Error("Failed to fetch HTML content from the link");
            }

            // Parse the HTML content of the link
            const linkHtml = await linkResponse.text();
            const linkDoc = new DOMParser().parseFromString(linkHtml, "text/html");

            // Process the HTML to populate the tupleList
            displayAnchorTags(linkDoc, tupleList);
        } else {
            console.error("Link not found.");
        }
    } catch (error) {
        console.error("Error:", error);
    }

    return tupleList;
}

// Function to process HTML and populate tupleList
function displayAnchorTags(doc, tupleList) {
    Array.from(doc.querySelectorAll("a")).forEach(a => {
        tupleList.push([a.getAttribute("href")]);
    });
}

// Example usage
createTable(true).then(tupleList => {
    console.log(tupleList);
});

